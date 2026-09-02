export type TenantType = 'SCHOOL' | 'COACHING';

export type TenantStatus = 'trial' | 'active' | 'suspended' | 'inactive';

export interface Branch {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  isMain: boolean;
  address: string;
  phone: string;
  email?: string;
}

export type UserRole = 
  | 'SUPER_ADMIN' 
  | 'TENANT_ADMIN' 
  | 'BRANCH_MANAGER'
  | 'TEACHER' 
  | 'ACCOUNTANT' 
  | 'RECEPTIONIST'
  | 'STAFF' 
  | 'PARENT' 
  | 'STUDENT';

export type Role = UserRole;

export type PermissionScope = 'GLOBAL' | 'TENANT' | 'BRANCH' | 'ASSIGNED' | 'SELF';

export type Permission =
  | 'users.manage'
  | 'users.read'
  | 'users.invite'
  | 'roles.manage'
  | 'roles.read'
  | 'branches.read'
  | 'branches.manage_access'
  | 'students.view'
  | 'students.read'
  | 'students.create'
  | 'students.update'
  | 'students.delete'
  | 'students.archive'
  | 'students.export'
  | 'guardians.read'
  | 'guardians.create'
  | 'guardians.update'
  | 'staff.read'
  | 'staff.create'
  | 'staff.update'
  | 'staff.manage'
  | 'attendance.view'
  | 'attendance.read'
  | 'attendance.mark'
  | 'attendance.create'
  | 'attendance.update'
  | 'attendance.correct'
  | 'attendance.export'
  | 'fees.view'
  | 'fees.read'
  | 'fees.create'
  | 'fees.update'
  | 'fees.export'
  | 'payments.view'
  | 'payments.read'
  | 'payments.record'
  | 'payments.create'
  | 'payments.refund'
  | 'exams.view'
  | 'exams.read'
  | 'exams.create'
  | 'exams.update'
  | 'exams.publish'
  | 'results.view'
  | 'results.read'
  | 'results.create'
  | 'results.correct'
  | 'results.publish'
  | 'homework.view'
  | 'homework.create'
  | 'homework.update'
  | 'timetable.view'
  | 'timetable.manage'
  | 'communication.send'
  | 'announcements.view'
  | 'announcements.create'
  | 'documents.view'
  | 'documents.read'
  | 'documents.upload'
  | 'documents.delete'
  | 'reports.view'
  | 'reports.read'
  | 'reports.export'
  | 'reports.financial'
  | 'reports.academic'
  | 'audit.view'
  | 'audit.read'
  | 'settings.view'
  | 'settings.read'
  | 'settings.update'
  | 'tenants.manage'
  | 'subscriptions.manage';

export interface CustomRoleDefinition {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  description: string;
  scope: PermissionScope;
  permissions: Permission[];
  isSystemRole: boolean;
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

export const PERMISSIONS = {
  USERS_MANAGE: 'users.manage' as Permission,
  ROLES_MANAGE: 'roles.manage' as Permission,
  STUDENTS_VIEW: 'students.view' as Permission,
  STUDENTS_CREATE: 'students.create' as Permission,
  STUDENTS_UPDATE: 'students.update' as Permission,
  STUDENTS_DELETE: 'students.delete' as Permission,
  ATTENDANCE_VIEW: 'attendance.view' as Permission,
  ATTENDANCE_MARK: 'attendance.mark' as Permission,
  FEES_VIEW: 'fees.view' as Permission,
  FEES_CREATE: 'fees.create' as Permission,
  PAYMENTS_VIEW: 'payments.view' as Permission,
  PAYMENTS_RECORD: 'payments.record' as Permission,
  PAYMENTS_REFUND: 'payments.refund' as Permission,
  EXAMS_VIEW: 'exams.view' as Permission,
  RESULTS_PUBLISH: 'results.publish' as Permission,
  HOMEWORK_MANAGE: 'homework.create' as Permission,
  TIMETABLE_MANAGE: 'timetable.manage' as Permission,
  SETTINGS_MANAGE: 'settings.update' as Permission,
  TENANTS_MANAGE: 'tenants.manage' as Permission,
} as const;

export interface TenantLabels {
  group: string;              // e.g. "Class" vs "Batch"
  subgroup: string;           // e.g. "Section" vs "Track"
  groupPlural: string;        // e.g. "Classes" vs "Batches"
  student: string;            // e.g. "Student" vs "Learner"
  studentPlural: string;      // e.g. "Students" vs "Learners"
  staff: string;              // e.g. "Teacher" vs "Faculty"
  staffPlural: string;        // e.g. "Teachers" vs "Faculty"
  admission: string;          // e.g. "Admission" vs "Enrollment"
  period: string;             // e.g. "Academic Year" vs "Course Period"
  exam: string;               // e.g. "Examination" vs "Test Series"
  examPlural: string;         // e.g. "Examinations" vs "Tests"
  reportCard: string;         // e.g. "Report Card" vs "Performance Report"
  homework: string;           // e.g. "Homework" vs "Practice Sheet / DPP"
  feeStructure: string;       // e.g. "Annual Fee Structure" vs "Course Fee Plan"
}

export interface TenantFeatureFlags {
  attendance: boolean;
  qrAttendance: boolean;
  fees: boolean;
  onlinePayments: boolean;
  exams: boolean;
  reportCards: boolean;
  testSeries: boolean;
  rankComparison: boolean;
  homework: boolean;
  timetable: boolean;
  communication: boolean;
  whatsappAlerts: boolean;
  inquiryCrm: boolean;
  certificates: boolean;
  hrPayroll: boolean;
  aiAssistant: boolean;
  aiReportSummary: boolean;
  transport: boolean;
  library: boolean;
  hostel: boolean;
}

export interface TenantConfig {
  id: string;
  name: string;
  code: string;
  tenantType: TenantType;
  status: TenantStatus;
  logo: string;
  tagline?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  currency: string;
  currencySymbol: string;
  timezone: string;
  academicYear: string;
  labels: TenantLabels;
  features: TenantFeatureFlags;
  planName: string;
  subscriptionRenewalDate: string;
}

export type AuthState = 
  | 'UNKNOWN' 
  | 'AUTHENTICATING' 
  | 'AUTHENTICATED' 
  | 'UNAUTHENTICATED' 
  | 'SESSION_EXPIRED' 
  | 'TENANT_SUSPENDED';

export type UserAccountStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'REQUIRES_PASSWORD_RESET';

export interface UserSession {
  id: string;
  userId: string;
  device: string;
  browser: string;
  ipAddress: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

export interface UserInvitation {
  id: string;
  tenantId: string;
  branchId?: string;
  email: string;
  name: string;
  role: UserRole;
  token: string;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED';
  expiresAt: string;
  invitedBy: string;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  phone: string;
  role: UserRole;
  avatarUrl: string;
  designation?: string;
  department?: string;
  status?: UserAccountStatus;
  branchIds?: string[];        // Multi-branch assignments
  linkedStudentIds?: string[]; // For Parent role
  assignedGroupIds?: string[];  // For Teacher role (Class/Batch IDs)
  studentId?: string;          // For Student role
  createdAt: string;
}

export interface Student {
  id: string;
  tenantId: string;
  admissionNo: string;
  rollNo?: string;
  firstName: string;
  lastName: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dob: string;
  email?: string;
  phone?: string;
  photoUrl: string;
  address: string;
  status: 'ACTIVE' | 'INACTIVE' | 'GRADUATED' | 'TRANSFERRED' | 'ARCHIVED';
  
  // School Mode: Single Class & Section
  classId?: string;
  sectionId?: string;
  
  // Coaching Mode: Many-to-Many Batches & Courses
  batchIds?: string[];
  courseIds?: string[];
  enrollmentDate: string;
  
  // Parent Details
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  parentRelationship: 'FATHER' | 'MOTHER' | 'GUARDIAN';
  
  // Dynamic fields
  qrCode: string;
  rfidCardNo?: string;
  emergencyContact?: string;
  bloodGroup?: string;
}

export interface Staff {
  id: string;
  tenantId: string;
  employeeCode: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl: string;
  role: UserRole;
  department: string;
  designation: string;
  qualification: string;
  joiningDate: string;
  salary: number;
  status: 'ACTIVE' | 'ON_LEAVE' | 'RESIGNED';
  subjects: string[];
  assignedGroupIds: string[]; // Class IDs or Batch IDs
}

export interface AcademicClass {
  id: string;
  tenantId: string;
  name: string;             // e.g. "Grade 10", "Class 12 - Science"
  numericGrade?: number;
  sections: { id: string; name: string; capacity: number; classTeacherId?: string }[];
  stream?: string;
}

export interface CoachingCourse {
  id: string;
  tenantId: string;
  name: string;             // e.g. "IIT-JEE Advanced (2 Year Foundation)"
  code: string;
  durationMonths: number;
  feeAmount: number;
  description: string;
  targetExam: string;
}

export interface CoachingBatch {
  id: string;
  tenantId: string;
  courseId: string;
  name: string;             // e.g. "JEE Alpha 2026", "NEET Super 30"
  startDate: string;
  endDate: string;
  schedule: string;         // e.g. "Mon, Wed, Fri (4:00 PM - 7:00 PM)"
  facultyIds: string[];
  roomNo: string;
  capacity: number;
  enrolledCount: number;
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'EXCUSED';

export interface AttendanceRecord {
  id: string;
  tenantId: string;
  studentId: string;
  studentName: string;
  groupId: string;          // Class ID or Batch ID
  groupName: string;
  date: string;             // YYYY-MM-DD
  status: AttendanceStatus;
  markedBy: string;
  markedAt: string;
  method: 'MANUAL' | 'QR_SCAN' | 'BIOMETRIC';
  notes?: string;
}

export interface FeeHead {
  id: string;
  name: string;             // e.g. "Tuition Fee", "Lab & Activity", "Transport"
  amount: number;
  frequency: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'ONE_TIME';
}

export interface FeeStructure {
  id: string;
  tenantId: string;
  name: string;             // e.g. "Grade 10 Standard", "JEE 2-Year Comprehensive"
  groupId?: string;         // Applicable class or course
  heads: FeeHead[];
  totalAmount: number;
}

export interface StudentFeeLedger {
  id: string;
  tenantId: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  groupName: string;
  feeStructureId: string;
  totalFee: number;
  concession: number;
  netPayable: number;
  paidAmount: number;
  dueAmount: number;
  dueDate: string;
  status: 'PAID' | 'PARTIAL' | 'OVERDUE' | 'UPCOMING';
  installments: {
    installmentNo: number;
    title: string;
    amount: number;
    dueDate: string;
    paidDate?: string;
    status: 'PAID' | 'PENDING' | 'OVERDUE';
  }[];
}

export interface PaymentTransaction {
  id: string;
  tenantId: string;
  studentId: string;
  studentName: string;
  receiptNo: string;
  amount: number;
  paymentMode: 'RAZORPAY_UPI' | 'RAZORPAY_CARD' | 'RAZORPAY_NETBANKING' | 'CASH' | 'CHEQUE' | 'BANK_TRANSFER';
  transactionRef: string;
  paidAt: string;
  receivedBy: string;
  notes?: string;
  feeHeadBreakdown: { headName: string; amount: number }[];
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
}

export interface Exam {
  id: string;
  tenantId: string;
  name: string;             // e.g. "Mid-Term Examination 2026" or "All-India Mock Test #4"
  examType: 'SCHOOL_TERM' | 'COACHING_TEST_SERIES' | 'QUIZ';
  groupIds: string[];       // Class or Batch IDs
  startDate: string;
  endDate: string;
  totalMarks: number;
  subjects: {
    subjectName: string;
    maxMarks: number;
    passMarks: number;
    date: string;
  }[];
  isPublished: boolean;
}

export interface StudentExamResult {
  id: string;
  tenantId: string;
  examId: string;
  examName: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  groupName: string;
  marksObtained: {
    subjectName: string;
    marks: number;
    maxMarks: number;
    grade?: string;
  }[];
  totalMarks: number;
  totalMaxMarks: number;
  percentage: number;
  grade?: string;
  rank?: number;
  totalInGroup?: number;
  aiSummary?: string;
}

export interface TimetableSlot {
  id: string;
  tenantId: string;
  groupId: string;          // Class/Section ID or Batch ID
  groupName: string;
  dayOfWeek: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY';
  startTime: string;        // "09:00"
  endTime: string;          // "10:00"
  subject: string;
  teacherId: string;
  teacherName: string;
  roomNo: string;
  color: string;
}

export interface Homework {
  id: string;
  tenantId: string;
  groupId: string;
  groupName: string;
  subject: string;
  title: string;
  description: string;
  assignedDate: string;
  dueDate: string;
  teacherName: string;
  attachmentUrl?: string;
  submissionsCount: number;
  totalStudents: number;
}

export interface Notice {
  id: string;
  tenantId: string;
  title: string;
  content: string;
  audience: 'ALL' | 'STUDENTS' | 'PARENTS' | 'STAFF' | 'SPECIFIC_GROUP';
  targetGroupId?: string;
  targetGroupName?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  publishedAt: string;
  author: string;
  hasAttachment?: boolean;
}

export type LeadStatus = 'NEW' | 'CONTACTED' | 'DEMO_SCHEDULED' | 'FOLLOW_UP' | 'ENROLLED' | 'LOST';

export interface LeadCRM {
  id: string;
  tenantId: string;
  studentName: string;
  parentName: string;
  phone: string;
  email?: string;
  interestedCourseOrClass: string;
  source: 'WALK_IN' | 'WEBSITE' | 'WHATSAPP' | 'REFERRAL' | 'SOCIAL_MEDIA';
  status: LeadStatus;
  assignedStaffId?: string;
  assignedStaffName?: string;
  followUpDate?: string;
  notes: string;
  estimatedValue?: number;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  tenantId: string;
  userId: string;
  title: string;
  message: string;
  type: 'FEE_DUE' | 'ATTENDANCE_ABSENT' | 'EXAM_RESULT' | 'HOMEWORK' | 'NOTICE' | 'PAYMENT_SUCCESS';
  createdAt: string;
  isRead: boolean;
  linkUrl?: string;
}

export interface AuditLog {
  id: string;
  tenantId: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  category: 'AUTHENTICATION' | 'USER_MANAGEMENT' | 'STUDENT' | 'ATTENDANCE' | 'FEES' | 'PAYMENTS' | 'RESULTS' | 'SETTINGS' | 'SECURITY' | 'ACADEMIC';
  entityType: string;
  entityId: string;
  details: string;
  timestamp: string;
  status: 'SUCCESS' | 'FAILED' | 'DENIED';
  ipAddress?: string;
  oldValues?: string;
  newValues?: string;
}

// ==========================================
// CANONICAL RELATIONAL DOMAIN ENTITIES (42-DATABASE-SCHEMA-ENTITY-RELATIONSHIPS)
// ==========================================

export interface Guardian {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  email?: string;
  occupation?: string;
  annualIncome?: number;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentGuardian {
  id: string;
  tenantId: string;
  studentId: string;
  guardianId: string;
  relationshipType: 'FATHER' | 'MOTHER' | 'GUARDIAN' | 'OTHER';
  isPrimary: boolean;
  canPickup: boolean;
  receivesFeeAlerts: boolean;
  receivesAttendanceAlerts: boolean;
  createdAt: string;
}

export interface Enrollment {
  id: string;
  tenantId: string;
  studentId: string;
  academicYearId: string;
  branchId?: string;
  classId?: string;
  sectionId?: string;
  batchId?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'TRANSFERRED' | 'PROMOTED' | 'WITHDRAWN';
  startDate: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherAssignment {
  id: string;
  tenantId: string;
  teacherId: string;
  branchId?: string;
  classId?: string;
  sectionId?: string;
  batchId?: string;
  subjectId: string;
  academicYearId: string;
  isClassTeacher?: boolean;
  createdAt: string;
}

export interface FeeAssignment {
  id: string;
  tenantId: string;
  studentId: string;
  feeStructureId: string;
  academicYearId: string;
  totalAmount: number;
  concession: number;
  netPayable: number;
  status: 'ACTIVE' | 'CANCELLED' | 'COMPLETED';
  createdAt: string;
  updatedAt: string;
}

export interface PaymentAllocation {
  id: string;
  tenantId: string;
  paymentId: string;
  ledgerId: string;
  feeHeadName: string;
  amountAllocated: number;
  createdAt: string;
}

export interface Refund {
  id: string;
  tenantId: string;
  paymentId: string;
  studentId: string;
  amount: number;
  reason: string;
  status: 'PENDING' | 'PROCESSED' | 'REJECTED';
  approvedBy?: string;
  processedAt?: string;
  createdAt: string;
}

export interface ExamSubject {
  id: string;
  examId: string;
  subjectId: string;
  subjectName: string;
  maxMarks: number;
  passMarks: number;
  examDate: string;
  startTime?: string;
  endTime?: string;
}

export interface NotificationDelivery {
  id: string;
  notificationId: string;
  channel: 'IN_APP' | 'SMS' | 'WHATSAPP' | 'EMAIL';
  recipient: string;
  status: 'DELIVERED' | 'FAILED' | 'PENDING';
  sentAt?: string;
  failedAt?: string;
  providerRef?: string;
}

export interface DocumentMeta {
  id: string;
  tenantId: string;
  entityType: 'STUDENT' | 'STAFF' | 'PAYMENT' | 'EXAM' | 'INSTITUTION';
  entityId: string;
  fileName: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
  uploadedAt: string;
}


