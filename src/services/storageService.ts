import {
  TenantConfig,
  Branch,
  UserProfile,
  UserSession,
  UserInvitation,
  Student,
  Staff,
  AcademicClass,
  CoachingCourse,
  CoachingBatch,
  AttendanceRecord,
  FeeStructure,
  StudentFeeLedger,
  PaymentTransaction,
  Exam,
  StudentExamResult,
  TimetableSlot,
  Homework,
  Notice,
  LeadCRM,
  NotificationItem,
  AuditLog,
  Guardian,
  StudentGuardian,
  Enrollment,
  DocumentMeta,
  TeacherAssignment,
} from '../types';
import {
  INITIAL_TENANTS,
  INITIAL_BRANCHES,
  INITIAL_USERS,
  INITIAL_SCHOOL_CLASSES,
  INITIAL_COACHING_COURSES,
  INITIAL_COACHING_BATCHES,
  INITIAL_STUDENTS,
  INITIAL_STAFF,
  INITIAL_ATTENDANCE,
  INITIAL_FEE_STRUCTURES,
  INITIAL_FEE_LEDGERS,
  INITIAL_PAYMENTS,
  INITIAL_EXAMS,
  INITIAL_EXAM_RESULTS,
  INITIAL_TIMETABLE,
  INITIAL_HOMEWORK,
  INITIAL_NOTICES,
  INITIAL_LEADS,
  INITIAL_NOTIFICATIONS,
  INITIAL_AUDIT_LOGS,
  INITIAL_TEACHER_ASSIGNMENTS,
} from './mockData';

class StorageService {
  private getItem<T>(key: string, defaultVal: T): T {
    try {
      const stored = localStorage.getItem(`edunexus_${key}`);
      if (!stored) {
        localStorage.setItem(`edunexus_${key}`, JSON.stringify(defaultVal));
        return defaultVal;
      }
      return JSON.parse(stored);
    } catch {
      return defaultVal;
    }
  }

  private setItem<T>(key: string, val: T): void {
    try {
      localStorage.setItem(`edunexus_${key}`, JSON.stringify(val));
    } catch (e) {
      console.error('Storage save error:', e);
    }
  }

  // Tenants
  getTenants(): TenantConfig[] {
    return this.getItem<TenantConfig[]>('tenants', INITIAL_TENANTS);
  }

  saveTenants(tenants: TenantConfig[]): void {
    this.setItem('tenants', tenants);
  }

  getTenantById(id: string): TenantConfig | undefined {
    return this.getTenants().find((t) => t.id === id);
  }

  updateTenant(updated: TenantConfig): void {
    const tenants = this.getTenants().map((t) => (t.id === updated.id ? updated : t));
    this.saveTenants(tenants);
  }

  // Branches
  getBranches(tenantId?: string): Branch[] {
    const all = this.getItem<Branch[]>('branches', INITIAL_BRANCHES);
    return tenantId ? all.filter((b) => b.tenantId === tenantId) : all;
  }

  saveBranches(branches: Branch[]): void {
    this.setItem('branches', branches);
  }

  // Users
  getUsers(): UserProfile[] {
    return this.getItem<UserProfile[]>('users', INITIAL_USERS);
  }

  saveUsers(users: UserProfile[]): void {
    this.setItem('users', users);
  }

  saveUser(user: UserProfile): void {
    const all = this.getUsers();
    const idx = all.findIndex((u) => u.id === user.id);
    if (idx >= 0) all[idx] = user;
    else all.unshift(user);
    this.saveUsers(all);
  }

  // Classes & Batches
  getClasses(tenantId: string): AcademicClass[] {
    const all = this.getItem<AcademicClass[]>('classes', INITIAL_SCHOOL_CLASSES);
    return all.filter((c) => c.tenantId === tenantId);
  }

  saveClasses(classes: AcademicClass[]): void {
    this.setItem('classes', classes);
  }

  getCourses(tenantId: string): CoachingCourse[] {
    const all = this.getItem<CoachingCourse[]>('courses', INITIAL_COACHING_COURSES);
    return all.filter((c) => c.tenantId === tenantId);
  }

  getBatches(tenantId: string): CoachingBatch[] {
    const all = this.getItem<CoachingBatch[]>('batches', INITIAL_COACHING_BATCHES);
    return all.filter((b) => b.tenantId === tenantId);
  }

  saveBatches(batches: CoachingBatch[]): void {
    this.setItem('batches', batches);
  }

  // Students
  getStudents(tenantId: string): Student[] {
    const all = this.getItem<Student[]>('students', INITIAL_STUDENTS);
    return all.filter((s) => s.tenantId === tenantId);
  }

  getAllStudents(): Student[] {
    return this.getItem<Student[]>('students', INITIAL_STUDENTS);
  }

  saveStudent(student: Student): void {
    const all = this.getAllStudents();
    const index = all.findIndex((s) => s.id === student.id);
    if (index >= 0) {
      all[index] = student;
    } else {
      all.unshift(student);
    }
    this.setItem('students', all);
  }

  deleteStudent(id: string): void {
    const all = this.getAllStudents().filter((s) => s.id !== id);
    this.setItem('students', all);
  }

  // Staff
  getStaff(tenantId: string): Staff[] {
    const all = this.getItem<Staff[]>('staff', INITIAL_STAFF);
    return all.filter((s) => s.tenantId === tenantId);
  }

  saveStaffMember(member: Staff): void {
    const all = this.getItem<Staff[]>('staff', INITIAL_STAFF);
    const index = all.findIndex((s) => s.id === member.id);
    if (index >= 0) {
      all[index] = member;
    } else {
      all.unshift(member);
    }
    this.setItem('staff', all);
  }

  deleteStaff(id: string): void {
    const all = this.getItem<Staff[]>('staff', INITIAL_STAFF).filter((s) => s.id !== id);
    this.setItem('staff', all);
  }

  // Teacher Assignments
  getTeacherAssignments(tenantId?: string): TeacherAssignment[] {
    const all = this.getItem<TeacherAssignment[]>('teacher_assignments', INITIAL_TEACHER_ASSIGNMENTS);
    return tenantId ? all.filter((ta) => ta.tenantId === tenantId) : all;
  }

  saveTeacherAssignment(assignment: TeacherAssignment): void {
    const all = this.getTeacherAssignments();
    const index = all.findIndex((ta) => ta.id === assignment.id);
    if (index >= 0) {
      all[index] = assignment;
    } else {
      all.unshift(assignment);
    }
    this.setItem('teacher_assignments', all);
  }

  deleteTeacherAssignment(id: string): void {
    const all = this.getTeacherAssignments().filter((ta) => ta.id !== id);
    this.setItem('teacher_assignments', all);
  }

  // Attendance
  getAttendance(tenantId: string, date?: string): AttendanceRecord[] {
    const all = this.getItem<AttendanceRecord[]>('attendance', INITIAL_ATTENDANCE);
    let filtered = all.filter((a) => a.tenantId === tenantId);
    if (date) {
      filtered = filtered.filter((a) => a.date === date);
    }
    return filtered;
  }

  markAttendance(records: AttendanceRecord[]): void {
    const all = this.getItem<AttendanceRecord[]>('attendance', INITIAL_ATTENDANCE);
    const updated = [...all];
    records.forEach((rec) => {
      const existingIdx = updated.findIndex(
        (a) => a.tenantId === rec.tenantId && a.studentId === rec.studentId && a.date === rec.date
      );
      if (existingIdx >= 0) {
        updated[existingIdx] = rec;
      } else {
        updated.unshift(rec);
      }
    });
    this.setItem('attendance', updated);
  }

  // Fees & Ledgers
  getFeeStructures(tenantId: string): FeeStructure[] {
    const all = this.getItem<FeeStructure[]>('fee_structures', INITIAL_FEE_STRUCTURES);
    return all.filter((f) => f.tenantId === tenantId);
  }

  getFeeLedgers(tenantId: string): StudentFeeLedger[] {
    const all = this.getItem<StudentFeeLedger[]>('fee_ledgers', INITIAL_FEE_LEDGERS);
    return all.filter((l) => l.tenantId === tenantId);
  }

  getStudentLedger(studentId: string): StudentFeeLedger | undefined {
    const all = this.getItem<StudentFeeLedger[]>('fee_ledgers', INITIAL_FEE_LEDGERS);
    return all.find((l) => l.studentId === studentId);
  }

  getPayments(tenantId: string): PaymentTransaction[] {
    const all = this.getItem<PaymentTransaction[]>('payments', INITIAL_PAYMENTS);
    return all.filter((p) => p.tenantId === tenantId);
  }

  recordPayment(payment: PaymentTransaction): void {
    const payments = this.getItem<PaymentTransaction[]>('payments', INITIAL_PAYMENTS);
    payments.unshift(payment);
    this.setItem('payments', payments);

    // Update student ledger
    const ledgers = this.getItem<StudentFeeLedger[]>('fee_ledgers', INITIAL_FEE_LEDGERS);
    const ledger = ledgers.find((l) => l.studentId === payment.studentId);
    if (ledger) {
      ledger.paidAmount += payment.amount;
      ledger.dueAmount = Math.max(0, ledger.netPayable - ledger.paidAmount);
      ledger.status = ledger.dueAmount === 0 ? 'PAID' : 'PARTIAL';
      this.setItem('fee_ledgers', ledgers);
    }
  }

  // Exams & Results
  getExams(tenantId: string): Exam[] {
    const all = this.getItem<Exam[]>('exams', INITIAL_EXAMS);
    return all.filter((e) => e.tenantId === tenantId);
  }

  getExamResults(tenantId: string, examId?: string): StudentExamResult[] {
    const all = this.getItem<StudentExamResult[]>('exam_results', INITIAL_EXAM_RESULTS);
    let filtered = all.filter((r) => r.tenantId === tenantId);
    if (examId) {
      filtered = filtered.filter((r) => r.examId === examId);
    }
    return filtered;
  }

  saveExam(exam: Exam): void {
    const all = this.getItem<Exam[]>('exams', INITIAL_EXAMS);
    const idx = all.findIndex((e) => e.id === exam.id);
    if (idx >= 0) all[idx] = exam;
    else all.unshift(exam);
    this.setItem('exams', all);
  }

  // Timetable
  getTimetable(tenantId: string, groupId?: string): TimetableSlot[] {
    const all = this.getItem<TimetableSlot[]>('timetable', INITIAL_TIMETABLE);
    let filtered = all.filter((t) => t.tenantId === tenantId);
    if (groupId) {
      filtered = filtered.filter((t) => t.groupId === groupId);
    }
    return filtered;
  }

  saveTimetable(slot: TimetableSlot): void {
    const all = this.getItem<TimetableSlot[]>('timetable', INITIAL_TIMETABLE);
    const idx = all.findIndex((t) => t.id === slot.id);
    if (idx >= 0) all[idx] = slot;
    else all.push(slot);
    this.setItem('timetable', all);
  }

  // Homework
  getHomework(tenantId: string, groupId?: string): Homework[] {
    const all = this.getItem<Homework[]>('homework', INITIAL_HOMEWORK);
    let filtered = all.filter((h) => h.tenantId === tenantId);
    if (groupId) {
      filtered = filtered.filter((h) => h.groupId === groupId);
    }
    return filtered;
  }

  saveHomework(hw: Homework): void {
    const all = this.getItem<Homework[]>('homework', INITIAL_HOMEWORK);
    all.unshift(hw);
    this.setItem('homework', all);
  }

  // Notices
  getNotices(tenantId: string): Notice[] {
    const all = this.getItem<Notice[]>('notices', INITIAL_NOTICES);
    return all.filter((n) => n.tenantId === tenantId);
  }

  saveNotice(notice: Notice): void {
    const all = this.getItem<Notice[]>('notices', INITIAL_NOTICES);
    all.unshift(notice);
    this.setItem('notices', all);
  }

  // Leads CRM
  getLeads(tenantId: string): LeadCRM[] {
    const all = this.getItem<LeadCRM[]>('leads', INITIAL_LEADS);
    return all.filter((l) => l.tenantId === tenantId);
  }

  saveLead(lead: LeadCRM): void {
    const all = this.getItem<LeadCRM[]>('leads', INITIAL_LEADS);
    const idx = all.findIndex((l) => l.id === lead.id);
    if (idx >= 0) all[idx] = lead;
    else all.unshift(lead);
    this.setItem('leads', all);
  }

  // Notifications
  getNotifications(userId: string): NotificationItem[] {
    const all = this.getItem<NotificationItem[]>('notifications', INITIAL_NOTIFICATIONS);
    return all.filter((n) => n.userId === userId);
  }

  markNotificationRead(id: string): void {
    const all = this.getItem<NotificationItem[]>('notifications', INITIAL_NOTIFICATIONS);
    const item = all.find((n) => n.id === id);
    if (item) {
      item.isRead = true;
      this.setItem('notifications', all);
    }
  }

  // Audit Logging & Activity
  getAuditLogs(tenantId: string): AuditLog[] {
    const all = this.getItem<AuditLog[]>('audit_logs', INITIAL_AUDIT_LOGS);
    return all.filter((l) => l.tenantId === tenantId);
  }

  saveAuditLog(log: AuditLog): void {
    const all = this.getItem<AuditLog[]>('audit_logs', INITIAL_AUDIT_LOGS);
    all.unshift(log);
    this.setItem('audit_logs', all);
  }

  // User Invitations
  getInvitations(tenantId?: string): UserInvitation[] {
    const all = this.getItem<UserInvitation[]>('user_invitations', [
      {
        id: 'invite-1',
        tenantId: 'tenant-school-1',
        email: 'priya.nair@delhischool.edu.in',
        name: 'Priya Nair',
        role: 'TEACHER',
        token: 'INV-DEMO-9912',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        invitedBy: 'Dr. Sunita Verma',
        createdAt: new Date().toISOString(),
      },
    ]);
    return tenantId ? all.filter((i) => i.tenantId === tenantId) : all;
  }

  saveInvitation(inv: UserInvitation): void {
    const all = this.getInvitations();
    const idx = all.findIndex((i) => i.id === inv.id);
    if (idx >= 0) all[idx] = inv;
    else all.unshift(inv);
    this.setItem('user_invitations', all);
  }

  // Active User Sessions
  getSessions(userId: string): UserSession[] {
    const defaultSessions: UserSession[] = [
      {
        id: 'sess-1',
        userId,
        device: 'Desktop Workstation',
        browser: 'Chrome 124 on Windows 11',
        ipAddress: '103.21.124.89 (New Delhi, India)',
        lastActiveAt: 'Just now',
        isCurrent: true,
      },
      {
        id: 'sess-2',
        userId,
        device: 'Mobile Phone',
        browser: 'Safari on iPhone 15 Pro',
        ipAddress: '103.21.124.90 (New Delhi, India)',
        lastActiveAt: '2 hours ago',
        isCurrent: false,
      },
    ];
    const all = this.getItem<UserSession[]>(`sessions_${userId}`, defaultSessions);
    return all;
  }

  revokeSession(userId: string, sessionId: string): void {
    const sessions = this.getSessions(userId).filter((s) => s.id !== sessionId);
    this.setItem(`sessions_${userId}`, sessions);
  }

  revokeAllSessions(userId: string): void {
    const sessions = this.getSessions(userId).filter((s) => s.isCurrent);
    this.setItem(`sessions_${userId}`, sessions);
  }

  // Rate Limiting & Failed Login Tracker
  getFailedAttempts(email: string): { count: number; lockedUntil?: number } {
    const key = `failed_logins_${email.toLowerCase()}`;
    return this.getItem<{ count: number; lockedUntil?: number }>(key, { count: 0 });
  }

  recordFailedLogin(email: string): { count: number; lockedUntil?: number } {
    const key = `failed_logins_${email.toLowerCase()}`;
    const current = this.getFailedAttempts(email);
    const newCount = current.count + 1;
    let lockedUntil: number | undefined = undefined;
    if (newCount >= 5) {
      // 30-second lockout for demo rate limiting
      lockedUntil = Date.now() + 30 * 1000;
    }
    const updated = { count: newCount, lockedUntil };
    this.setItem(key, updated);
    return updated;
  }

  clearFailedLogins(email: string): void {
    const key = `failed_logins_${email.toLowerCase()}`;
    localStorage.removeItem(`edunexus_${key}`);
  }

  // ==========================================
  // GUARDIANS & FAMILY RELATIONSHIPS
  // ==========================================

  getGuardians(tenantId?: string): Guardian[] {
    const defaultGuardians: Guardian[] = [
      {
        id: 'gua-1',
        tenantId: 'tenant-school-1',
        name: 'Rajesh Sharma',
        phone: '+91 98765 43210',
        email: 'rajesh.sharma@example.com',
        occupation: 'Chartered Accountant',
        address: 'B-42, South Extension, New Delhi',
        createdAt: '2024-04-01T09:00:00Z',
        updatedAt: '2026-04-01T09:00:00Z',
      },
      {
        id: 'gua-2',
        tenantId: 'tenant-school-1',
        name: 'Meenakshi Sharma',
        phone: '+91 98765 43211',
        email: 'meenakshi.sharma@example.com',
        occupation: 'Architect',
        address: 'B-42, South Extension, New Delhi',
        createdAt: '2024-04-01T09:00:00Z',
        updatedAt: '2026-04-01T09:00:00Z',
      },
      {
        id: 'gua-3',
        tenantId: 'tenant-school-1',
        name: 'Amit Patel',
        phone: '+91 98111 22334',
        email: 'amit.patel@example.com',
        occupation: 'Software Director',
        address: 'Flat 302, Green Park, New Delhi',
        createdAt: '2024-04-01T09:00:00Z',
        updatedAt: '2026-04-01T09:00:00Z',
      },
      {
        id: 'gua-4',
        tenantId: 'tenant-coaching-1',
        name: 'Suresh Kumar',
        phone: '+91 99887 66554',
        email: 'suresh.kumar@example.com',
        occupation: 'Senior Physician',
        address: 'Sector 14, Gurugram',
        createdAt: '2024-04-01T09:00:00Z',
        updatedAt: '2026-04-01T09:00:00Z',
      },
    ];
    const all = this.getItem<Guardian[]>('guardians', defaultGuardians);
    return tenantId ? all.filter((g) => g.tenantId === tenantId) : all;
  }

  saveGuardian(guardian: Guardian): void {
    const all = this.getGuardians();
    const idx = all.findIndex((g) => g.id === guardian.id);
    if (idx >= 0) all[idx] = guardian;
    else all.unshift(guardian);
    this.setItem('guardians', all);
  }

  getStudentGuardians(studentId?: string): StudentGuardian[] {
    const defaultJunctions: StudentGuardian[] = [
      {
        id: 'sg-1',
        tenantId: 'tenant-school-1',
        studentId: 'student-1',
        guardianId: 'gua-1',
        relationshipType: 'FATHER',
        isPrimary: true,
        canPickup: true,
        receivesFeeAlerts: true,
        receivesAttendanceAlerts: true,
        createdAt: '2024-04-01T09:00:00Z',
      },
      {
        id: 'sg-2',
        tenantId: 'tenant-school-1',
        studentId: 'student-1',
        guardianId: 'gua-2',
        relationshipType: 'MOTHER',
        isPrimary: false,
        canPickup: true,
        receivesFeeAlerts: true,
        receivesAttendanceAlerts: true,
        createdAt: '2024-04-01T09:00:00Z',
      },
      {
        id: 'sg-3',
        tenantId: 'tenant-school-1',
        studentId: 'student-2',
        guardianId: 'gua-3',
        relationshipType: 'FATHER',
        isPrimary: true,
        canPickup: true,
        receivesFeeAlerts: true,
        receivesAttendanceAlerts: true,
        createdAt: '2024-04-01T09:00:00Z',
      },
      {
        id: 'sg-4',
        tenantId: 'tenant-coaching-1',
        studentId: 'student-101',
        guardianId: 'gua-4',
        relationshipType: 'FATHER',
        isPrimary: true,
        canPickup: true,
        receivesFeeAlerts: true,
        receivesAttendanceAlerts: true,
        createdAt: '2024-04-01T09:00:00Z',
      },
    ];
    const all = this.getItem<StudentGuardian[]>('student_guardians', defaultJunctions);
    return studentId ? all.filter((sg) => sg.studentId === studentId) : all;
  }

  saveStudentGuardian(junction: StudentGuardian): void {
    const all = this.getStudentGuardians();
    const idx = all.findIndex((sg) => sg.id === junction.id);
    if (idx >= 0) all[idx] = junction;
    else all.unshift(junction);
    this.setItem('student_guardians', all);
  }

  // ==========================================
  // HISTORICAL ENROLLMENTS
  // ==========================================

  getEnrollments(studentId?: string): Enrollment[] {
    const defaultEnrollments: Enrollment[] = [
      {
        id: 'enr-1',
        tenantId: 'tenant-school-1',
        studentId: 'student-1',
        academicYearId: 'ay-2026',
        classId: 'class-10',
        sectionId: 'sec-10a',
        status: 'ACTIVE',
        startDate: '2026-04-01',
        createdAt: '2026-04-01T08:00:00Z',
        updatedAt: '2026-04-01T08:00:00Z',
      },
      {
        id: 'enr-2',
        tenantId: 'tenant-school-1',
        studentId: 'student-1',
        academicYearId: 'ay-2025',
        classId: 'class-9',
        sectionId: 'sec-9b',
        status: 'COMPLETED',
        startDate: '2025-04-01',
        endDate: '2026-03-31',
        createdAt: '2025-04-01T08:00:00Z',
        updatedAt: '2026-03-31T08:00:00Z',
      },
      {
        id: 'enr-3',
        tenantId: 'tenant-coaching-1',
        studentId: 'student-101',
        academicYearId: 'ay-2026',
        batchId: 'batch-jee-adv-morning',
        status: 'ACTIVE',
        startDate: '2026-04-01',
        createdAt: '2026-04-01T08:00:00Z',
        updatedAt: '2026-04-01T08:00:00Z',
      },
    ];
    const all = this.getItem<Enrollment[]>('enrollments', defaultEnrollments);
    return studentId ? all.filter((e) => e.studentId === studentId) : all;
  }

  saveEnrollment(enrollment: Enrollment): void {
    const all = this.getEnrollments();
    const idx = all.findIndex((e) => e.id === enrollment.id);
    if (idx >= 0) all[idx] = enrollment;
    else all.unshift(enrollment);
    this.setItem('enrollments', all);
  }

  // ==========================================
  // STUDENT DOCUMENTS
  // ==========================================

  getDocuments(studentId?: string): DocumentMeta[] {
    const defaultDocs: DocumentMeta[] = [
      {
        id: 'doc-1',
        tenantId: 'tenant-school-1',
        entityType: 'STUDENT',
        entityId: 'student-1',
        fileName: 'Aadhaar_Card_Proof.pdf',
        storageKey: 'docs/students/student-1/aadhaar.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1048576,
        uploadedBy: 'Dr. Sunita Verma',
        uploadedAt: '2026-04-02T10:30:00Z',
      },
      {
        id: 'doc-2',
        tenantId: 'tenant-school-1',
        entityType: 'STUDENT',
        entityId: 'student-1',
        fileName: 'Birth_Certificate_Attested.pdf',
        storageKey: 'docs/students/student-1/birth_cert.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 524288,
        uploadedBy: 'Admin Desk',
        uploadedAt: '2026-04-02T10:32:00Z',
      },
      {
        id: 'doc-3',
        tenantId: 'tenant-school-1',
        entityType: 'STUDENT',
        entityId: 'student-1',
        fileName: 'Transfer_Certificate_Previous_School.pdf',
        storageKey: 'docs/students/student-1/tc.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 786432,
        uploadedBy: 'Admin Desk',
        uploadedAt: '2026-04-02T10:35:00Z',
      },
    ];
    const all = this.getItem<DocumentMeta[]>('documents', defaultDocs);
    return studentId ? all.filter((d) => d.entityId === studentId) : all;
  }

  saveDocument(doc: DocumentMeta): void {
    const all = this.getDocuments();
    all.unshift(doc);
    this.setItem('documents', all);
  }

  // Reset demo data
  resetAll(): void {
    localStorage.clear();
    window.location.reload();
  }
}

export const storage = new StorageService();
