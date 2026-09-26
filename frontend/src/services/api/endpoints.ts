import { apiClient } from './apiClient';
import { storage } from '../storageService';
import {
  Student,
  AttendanceRecord,
  FeeStructure,
  StudentFeeLedger,
  PaymentTransaction,
  Exam,
  StudentExamResult,
  AuditLog,
} from '../../types';
import {
  ApiResponse,
  PaginationParams,
  IdempotentRequestOptions,
  ApiHealthResponse,
  AsyncJobResponse,
} from './apiTypes';

// ==========================================
// 1. STUDENTS SERVICE CONTRACTS
// ==========================================
export const studentsApi = {
  async list(
    tenantId: string,
    params: PaginationParams = {}
  ): Promise<ApiResponse<Student[]>> {
    return apiClient.execute(
      '/api/v1/students',
      { method: 'GET', tenantId },
      async () => {
        let students = storage.getStudents(tenantId);

        // Search filtering
        if (params.search) {
          const query = params.search.toLowerCase();
          students = students.filter(
            (s) =>
              s.firstName.toLowerCase().includes(query) ||
              s.lastName.toLowerCase().includes(query) ||
              s.admissionNo.toLowerCase().includes(query)
          );
        }

        const page = params.page || 1;
        const pageSize = params.pageSize || 10;
        const total = students.length;
        const totalPages = Math.ceil(total / pageSize) || 1;
        const start = (page - 1) * pageSize;
        const pagedData = students.slice(start, start + pageSize);

        return {
          data: pagedData,
          meta: {
            page,
            pageSize,
            total,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          },
        };
      }
    );
  },

  async getById(tenantId: string, studentId: string): Promise<ApiResponse<Student>> {
    return apiClient.execute(
      `/api/v1/students/${studentId}`,
      { method: 'GET', tenantId },
      async () => {
        const students = storage.getStudents(tenantId);
        const student = students.find((s) => s.id === studentId);
        if (!student) {
          apiClient.createError('STUDENT_NOT_FOUND', `Student with ID ${studentId} was not found.`, 404);
        }
        return { data: student! };
      }
    );
  },

  async create(
    tenantId: string,
    data: Partial<Student>,
    options: IdempotentRequestOptions = {}
  ): Promise<ApiResponse<Student>> {
    return apiClient.execute(
      '/api/v1/students',
      { method: 'POST', tenantId, idempotencyKey: options.idempotencyKey },
      async () => {
        if (!data.firstName || !data.lastName || !data.admissionNo) {
          apiClient.createError('VALIDATION_ERROR_422', 'Missing required fields: firstName, lastName, or admissionNo', 422);
        }

        const newStudent: Student = {
          id: `student-${Date.now()}`,
          tenantId,
          admissionNo: data.admissionNo!,
          rollNo: data.rollNo || `RN-${Math.floor(100 + Math.random() * 900)}`,
          firstName: data.firstName!,
          lastName: data.lastName!,
          gender: data.gender || 'MALE',
          dob: data.dob || '2010-01-01',
          photoUrl: data.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          address: data.address || 'New Delhi, India',
          status: 'ACTIVE',
          classId: data.classId,
          sectionId: data.sectionId,
          batchIds: data.batchIds,
          enrollmentDate: data.enrollmentDate || new Date().toISOString().split('T')[0],
          parentName: data.parentName || 'Rajesh Sharma',
          parentPhone: data.parentPhone || '+91 98765 43210',
          parentEmail: data.parentEmail || 'parent@example.com',
          parentRelationship: data.parentRelationship || 'FATHER',
          qrCode: `QR-EDU-${Date.now()}`,
        };

        storage.saveStudent(newStudent);
        return { data: newStudent, status: 201 };
      }
    );
  },

  async archive(tenantId: string, studentId: string): Promise<ApiResponse<{ id: string; status: string }>> {
    return apiClient.execute(
      `/api/v1/students/${studentId}/archive`,
      { method: 'POST', tenantId },
      async () => {
        const student = storage.getStudents(tenantId).find((s) => s.id === studentId);
        if (!student) {
          apiClient.createError('STUDENT_NOT_FOUND', `Student not found for archival`, 404);
        }
        student!.status = 'ARCHIVED';
        storage.saveStudent(student!);
        return { data: { id: studentId, status: 'ARCHIVED' } };
      }
    );
  },
};

// ==========================================
// 2. ATTENDANCE SERVICE CONTRACTS
// ==========================================
export const attendanceApi = {
  async list(tenantId: string, date?: string): Promise<ApiResponse<AttendanceRecord[]>> {
    return apiClient.execute(
      '/api/v1/attendance',
      { method: 'GET', tenantId },
      async () => {
        const records = storage.getAttendance(tenantId, date);
        return {
          data: records,
          meta: {
            page: 1,
            pageSize: records.length,
            total: records.length,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
          },
        };
      }
    );
  },

  async recordBulk(
    tenantId: string,
    records: Partial<AttendanceRecord>[],
    options: IdempotentRequestOptions = {}
  ): Promise<ApiResponse<{ processed: number; successful: number; records: AttendanceRecord[] }>> {
    return apiClient.execute(
      '/api/v1/attendance/bulk',
      { method: 'POST', tenantId, idempotencyKey: options.idempotencyKey },
      async () => {
        const created: AttendanceRecord[] = [];
        for (const item of records) {
          const rec: AttendanceRecord = {
            id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            tenantId,
            studentId: item.studentId || 'unknown',
            studentName: item.studentName || 'Student Name',
            groupId: item.groupId || 'group-10-a',
            groupName: item.groupName || 'Grade 10-A',
            date: item.date || new Date().toISOString().split('T')[0],
            status: item.status || 'PRESENT',
            markedBy: item.markedBy || 'Faculty',
            markedAt: new Date().toISOString(),
            method: item.method || 'MANUAL',
            notes: item.notes,
          };
          created.push(rec);
        }

        storage.markAttendance(created);

        return {
          data: {
            processed: records.length,
            successful: created.length,
            records: created,
          },
          status: 201,
        };
      }
    );
  },
};

// ==========================================
// 3. FINANCE & PAYMENT SERVICE CONTRACTS
// ==========================================
export const financeApi = {
  async getStructures(tenantId: string): Promise<ApiResponse<FeeStructure[]>> {
    return apiClient.execute(
      '/api/v1/fees/structures',
      { method: 'GET', tenantId },
      async () => {
        const structures = storage.getFeeStructures(tenantId);
        return { data: structures };
      }
    );
  },

  async getLedgers(tenantId: string): Promise<ApiResponse<StudentFeeLedger[]>> {
    return apiClient.execute(
      '/api/v1/fees/ledgers',
      { method: 'GET', tenantId },
      async () => {
        const ledgers = storage.getFeeLedgers(tenantId);
        return { data: ledgers };
      }
    );
  },

  async recordPayment(
    tenantId: string,
    paymentData: Partial<PaymentTransaction>,
    options: IdempotentRequestOptions = {}
  ): Promise<ApiResponse<PaymentTransaction>> {
    return apiClient.execute(
      '/api/v1/payments',
      { method: 'POST', tenantId, idempotencyKey: options.idempotencyKey },
      async () => {
        if (!paymentData.amount || paymentData.amount <= 0) {
          apiClient.createError('VALIDATION_ERROR_422', 'Payment amount must be a positive number greater than 0.', 422);
        }

        const newPayment: PaymentTransaction = {
          id: `pay-${Date.now()}`,
          tenantId,
          studentId: paymentData.studentId || 'student-101',
          studentName: paymentData.studentName || 'Aarav Kapoor',
          receiptNo: `REC-${Date.now().toString().slice(-6)}`,
          amount: paymentData.amount!,
          paymentMode: paymentData.paymentMode || 'RAZORPAY_UPI',
          transactionRef: paymentData.transactionRef || `txn_live_${Math.random().toString(36).substring(2, 9)}`,
          paidAt: new Date().toISOString(),
          receivedBy: paymentData.receivedBy || 'Admin Bursar',
          notes: paymentData.notes || 'Standard installment settlement',
          feeHeadBreakdown: paymentData.feeHeadBreakdown || [{ headName: 'Tuition Fee', amount: paymentData.amount! }],
          status: 'SUCCESS',
        };

        storage.recordPayment(newPayment);
        return { data: newPayment, status: 201 };
      }
    );
  },
};

// ==========================================
// 4. EXAMINATIONS SERVICE CONTRACTS
// ==========================================
export const examsApi = {
  async list(tenantId: string): Promise<ApiResponse<Exam[]>> {
    return apiClient.execute(
      '/api/v1/exams',
      { method: 'GET', tenantId },
      async () => {
        const exams = storage.getExams(tenantId);
        return { data: exams };
      }
    );
  },

  async publishResults(tenantId: string, examId: string): Promise<ApiResponse<{ examId: string; status: string }>> {
    return apiClient.execute(
      `/api/v1/exams/${examId}/publish`,
      { method: 'POST', tenantId },
      async () => {
        const exams = storage.getExams(tenantId);
        const exam = exams.find((e) => e.id === examId);
        if (!exam) {
          apiClient.createError('NOT_FOUND_404', `Exam ${examId} not found`, 404);
        }
        exam!.isPublished = true;
        storage.saveExam(exam!);
        return { data: { examId, status: 'PUBLISHED' } };
      }
    );
  },
};

// ==========================================
// 5. REPORTS & ASYNC EXPORT CONTRACTS
// ==========================================
export const reportsApi = {
  async createExportJob(
    tenantId: string,
    resourceType: string,
    options: IdempotentRequestOptions = {}
  ): Promise<ApiResponse<AsyncJobResponse>> {
    return apiClient.execute(
      '/api/v1/reports/export',
      { method: 'POST', tenantId, idempotencyKey: options.idempotencyKey },
      async () => {
        const jobId = `job_export_${Date.now()}`;
        const job: AsyncJobResponse = {
          jobId,
          status: 'completed',
          resourceType,
          downloadUrl: `data:text/csv;charset=utf-8,Demo Export Data For ${resourceType}`,
          estimatedCompletionTime: 'Instant',
          createdAt: new Date().toISOString(),
        };
        return { data: job, status: 201 };
      }
    );
  },
};

// ==========================================
// 6. HEALTH & SYSTEM DIAGNOSTICS CONTRACT
// ==========================================
export const healthApi = {
  async getHealth(): Promise<ApiResponse<ApiHealthResponse>> {
    return apiClient.execute('/api/v1/health', { method: 'GET', delayMs: 15 }, async () => {
      const health: ApiHealthResponse = {
        status: 'healthy',
        version: 'v1.4.0-canonical',
        timestamp: new Date().toISOString(),
        services: {
          database: 'connected',
          cache: 'operational',
          storage: 'available',
          paymentGateway: 'online',
        },
        uptimeSeconds: Math.floor(performance.now() / 1000) + 86400,
      };
      return { data: health };
    });
  },
};
