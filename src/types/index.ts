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
  | 'finance.view'
  | 'finance.manage'
  | 'expenses.create'
  | 'expenses.approve'
  | 'payroll.view'
  | 'payroll.process'
  | 'payroll.approve'
  | 'inventory.view'
  | 'inventory.manage'
  | 'library.view'
  | 'library.manage'
  | 'transport.view'
  | 'transport.manage'
  | 'hostel.view'
  | 'hostel.manage'
  | 'mess.view'
  | 'mess.manage'
  | 'health.view'
  | 'health.manage'
  | 'health.medical_visit'
  | 'health.records'
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
  | 'results.approve'
  | 'results.process'
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
  panNumber?: string;
  bankAccountNo?: string;
  bankName?: string;
  ifsc?: string;
  pfNumber?: string;
  salaryStructureId?: string;
  leaveBalance?: { casual: number; sick: number; earned: number };
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
  code?: string;
  amount: number;
  frequency: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'ONE_TIME';
  isOptional?: boolean;
  isTaxable?: boolean;
}

export interface FeeStructure {
  id: string;
  tenantId: string;
  name: string;             // e.g. "Grade 10 Standard", "JEE 2-Year Comprehensive"
  academicYear?: string;
  groupId?: string;         // Applicable class or course
  groupName?: string;
  heads: FeeHead[];
  totalAmount: number;
}

export interface ConcessionRecord {
  id: string;
  title: string;
  concessionType: 'MERIT' | 'SIBLING' | 'STAFF_WARD' | 'NEED_BASED' | 'SPECIAL';
  amount: number;
  approvedBy: string;
  reason: string;
  appliedAt: string;
}

export interface FeeInstallment {
  installmentNo: number;
  title: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  paidAmount?: number;
  status: 'PAID' | 'PARTIAL' | 'PENDING' | 'OVERDUE';
  lateFeeApplied?: number;
}

export interface FeeRefund {
  id: string;
  tenantId: string;
  studentId: string;
  studentName: string;
  receiptNo: string;
  refundAmount: number;
  paymentMode: string;
  reason: string;
  approvedBy: string;
  refundedAt: string;
  status: 'PROCESSED' | 'PENDING';
}

export interface StudentFeeLedger {
  id: string;
  tenantId: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  groupName: string;
  feeStructureId: string;
  feeStructureName?: string;
  totalFee: number;
  concession: number;
  concessionRecords?: ConcessionRecord[];
  lateFeeTotal?: number;
  netPayable: number;
  paidAmount: number;
  dueAmount: number;
  dueDate: string;
  status: 'PAID' | 'PARTIAL' | 'OVERDUE' | 'UPCOMING';
  installments: FeeInstallment[];
  refunds?: FeeRefund[];
}

export interface PaymentTransaction {
  id: string;
  tenantId: string;
  studentId: string;
  studentName: string;
  admissionNo?: string;
  receiptNo: string;
  amount: number;
  paymentMode: 'RAZORPAY_UPI' | 'RAZORPAY_CARD' | 'RAZORPAY_NETBANKING' | 'CASH' | 'CHEQUE' | 'BANK_TRANSFER';
  transactionRef: string;
  paidAt: string;
  receivedBy: string;
  notes?: string;
  feeHeadBreakdown: { headName: string; amount: number }[];
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  chequeNo?: string;
  bankName?: string;
}

// -------------------------------------------------------------
// DOCUMENT 54: EXPENSES, FINANCE & ACCOUNTING TYPES
// -------------------------------------------------------------
export type ExpenseStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'PAID' | 'REJECTED';

export interface ExpenseCategory {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  budgetAmount: number;
  icon?: string;
  color?: string;
}

export interface Vendor {
  id: string;
  tenantId: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  gstin?: string;
  address: string;
  bankName?: string;
  accountNo?: string;
  ifsc?: string;
  category: string;
  paymentTerms: string;
}

export interface VendorBill {
  id: string;
  tenantId: string;
  vendorId: string;
  vendorName: string;
  billNo: string;
  billDate: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  dueAmount: number;
  status: 'UNPAID' | 'PARTIAL' | 'PAID';
  category: string;
  description: string;
}

export interface Expense {
  id: string;
  tenantId: string;
  branchId?: string;
  categoryId: string;
  categoryName: string;
  vendorId?: string;
  vendorName?: string;
  billId?: string;
  amount: number;
  taxAmount?: number;
  totalAmount: number;
  date: string;
  description: string;
  paymentMethod: 'BANK_TRANSFER' | 'CASH' | 'CHEQUE' | 'CREDIT_CARD' | 'PETTY_CASH';
  status: ExpenseStatus;
  voucherNo: string;
  referenceNo?: string;
  approvedBy?: string;
  approvedAt?: string;
  paidAt?: string;
  createdBy: string;
  createdAt: string;
}

export interface BankAccount {
  id: string;
  tenantId: string;
  accountName: string;
  bankName: string;
  accountNo: string;
  ifsc: string;
  branch: string;
  accountType: 'CURRENT' | 'SAVINGS' | 'COLLECTION';
  balance: number;
  isPrimary: boolean;
}

export interface PettyCashTransaction {
  id: string;
  tenantId: string;
  type: 'DISBURSEMENT' | 'TOP_UP';
  amount: number;
  category: string;
  description: string;
  voucherNo: string;
  custodian: string;
  date: string;
  balanceAfter: number;
}

export interface AccountTransfer {
  id: string;
  tenantId: string;
  fromAccountId: string;
  fromAccountName: string;
  toAccountId: string;
  toAccountName: string;
  amount: number;
  transferDate: string;
  reference: string;
  transferredBy: string;
  notes?: string;
}

export interface DepartmentBudget {
  id: string;
  tenantId: string;
  department: string;
  academicYear: string;
  allocatedAmount: number;
  utilizedAmount: number;
  alertThresholdPct: number;
}

// -------------------------------------------------------------
// DOCUMENT 55: STAFF, PAYROLL & HR TYPES
// -------------------------------------------------------------
export interface SalaryComponent {
  id: string;
  name: string;
  type: 'EARNING' | 'DEDUCTION';
  amount: number;
  isPercentage: boolean;
  percentageOf?: 'BASIC' | 'GROSS';
}

export interface SalaryStructure {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  basicSalary: number;
  hra: number;
  da: number;
  specialAllowance: number;
  conveyanceAllowance: number;
  pfDeduction: number;
  esiDeduction: number;
  tdsDeduction: number;
  professionalTax: number;
  netCalculated: number;
}

export type PayrollRunStatus = 'DRAFT' | 'CALCULATED' | 'APPROVED' | 'DISBURSED';

export interface PayrollRun {
  id: string;
  tenantId: string;
  month: string;
  year: number;
  totalEmployees: number;
  totalGross: number;
  totalDeductions: number;
  totalNetPayout: number;
  status: PayrollRunStatus;
  calculatedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  disbursedAt?: string;
  disbursedFromAccountId?: string;
  payslipCount: number;
}

export interface Payslip {
  id: string;
  tenantId: string;
  payrollRunId: string;
  payslipNo: string;
  staffId: string;
  employeeCode: string;
  staffName: string;
  department: string;
  designation: string;
  panNumber: string;
  bankAccountNo: string;
  bankName: string;
  workingDays: number;
  presentDays: number;
  lopDays: number;
  basicPay: number;
  hra: number;
  da: number;
  specialAllowance: number;
  conveyanceAllowance: number;
  grossEarnings: number;
  pfDeduction: number;
  esiDeduction: number;
  tdsDeduction: number;
  professionalTax: number;
  lopDeduction: number;
  advanceDeduction: number;
  totalDeductions: number;
  netSalary: number;
  status: 'GENERATED' | 'PAID';
}

export interface SalaryAdvance {
  id: string;
  tenantId: string;
  staffId: string;
  staffName: string;
  amount: number;
  requestedDate: string;
  reason: string;
  repaymentMonths: number;
  monthlyDeduction: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REPAID';
  approvedBy?: string;
}

// -------------------------------------------------------------
// DOCUMENT 56: INVENTORY & ASSET MANAGEMENT TYPES
// -------------------------------------------------------------
export type InventoryUnit = 'PIECE' | 'BOX' | 'PACK' | 'SET' | 'KG' | 'LITRE' | 'DOZEN' | 'REAM';

export interface InventoryCategory {
  id: string;
  tenantId: string;
  name: string;
  code: string;
}

export interface Warehouse {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  location: string;
  custodian: string;
}

export interface InventoryItem {
  id: string;
  tenantId: string;
  sku: string;
  name: string;
  categoryId: string;
  categoryName: string;
  warehouseId: string;
  warehouseName: string;
  unit: InventoryUnit;
  currentStock: number;
  minimumStock: number;
  reorderLevel: number;
  unitPrice: number;
  totalValue: number;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}

export type StockMovementType = 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT';

export interface StockMovement {
  id: string;
  tenantId: string;
  itemId: string;
  itemName: string;
  sku: string;
  type: StockMovementType;
  quantity: number;
  unit: string;
  sourceWarehouseId?: string;
  destWarehouseId?: string;
  recipient?: string;
  vendorName?: string;
  referenceDoc?: string;
  costPerUnit?: number;
  totalCost?: number;
  movementDate: string;
  recordedBy: string;
  remarks: string;
}

export type AssetStatus = 'ACTIVE' | 'IN_MAINTENANCE' | 'REPAIRED' | 'DECOMMISSIONED' | 'SCRAPPED';

export interface FixedAsset {
  id: string;
  tenantId: string;
  assetCode: string;
  name: string;
  category: string;
  location: string;
  custodian: string;
  purchaseDate: string;
  purchaseCost: number;
  vendorName: string;
  warrantyExpiry: string;
  serialNumber?: string;
  status: AssetStatus;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
}

export interface AssetMaintenanceRecord {
  id: string;
  tenantId: string;
  assetId: string;
  assetCode: string;
  assetName: string;
  maintenanceDate: string;
  type: 'PREVENTIVE' | 'CORRECTIVE' | 'AMC_SERVICE';
  serviceProvider: string;
  cost: number;
  details: string;
  performedBy: string;
  status: 'COMPLETED' | 'SCHEDULED';
}

// -------------------------------------------------------------
// DOCUMENT 57: LIBRARY MANAGEMENT TYPES
// -------------------------------------------------------------
export type BookCategory = 'SCIENCE' | 'MATHEMATICS' | 'LITERATURE' | 'SOCIAL_STUDIES' | 'COMPETITIVE_EXAM' | 'GENERAL' | 'REFERENCE';
export type BookCondition = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'DAMAGED';
export type BookCopyStatus = 'AVAILABLE' | 'ISSUED' | 'RESERVED' | 'LOST' | 'DAMAGED' | 'WEEDED';

export interface BookTitle {
  id: string;
  tenantId: string;
  title: string;
  author: string;
  isbn: string;
  publisher: string;
  edition: string;
  category: BookCategory;
  language: string;
  shelfLocation: string;
  totalCopies: number;
  availableCopies: number;
  coverUrl?: string;
}

export interface BookCopy {
  id: string;
  tenantId: string;
  bookTitleId: string;
  accessionNumber: string;
  barcode: string;
  condition: BookCondition;
  status: BookCopyStatus;
  shelfLocation: string;
  acquisitionDate: string;
  cost: number;
}

export interface LibraryMember {
  id: string;
  tenantId: string;
  memberType: 'STUDENT' | 'STAFF';
  personId: string;
  personName: string;
  cardNumber: string;
  maxAllowedBooks: number;
  activeIssuedCount: number;
  status: 'ACTIVE' | 'SUSPENDED';
}

export interface BookCirculationRecord {
  id: string;
  tenantId: string;
  copyId: string;
  accessionNumber: string;
  bookTitle: string;
  memberId: string;
  memberName: string;
  memberType: 'STUDENT' | 'STAFF';
  issuedDate: string;
  dueDate: string;
  returnedDate?: string;
  status: 'ISSUED' | 'RETURNED' | 'OVERDUE' | 'LOST';
  fineAmount: number;
  finePaid: boolean;
  issuedBy: string;
  receivedBy?: string;
}

export interface BookReservation {
  id: string;
  tenantId: string;
  bookTitleId: string;
  bookTitle: string;
  memberId: string;
  memberName: string;
  reservationDate: string;
  status: 'WAITING' | 'FULFILLED' | 'CANCELLED';
}

// -------------------------------------------------------------
// DOCUMENT 58: TRANSPORT MANAGEMENT TYPES
// -------------------------------------------------------------
export type VehicleType = 'SCHOOL_BUS' | 'MINI_BUS' | 'VAN' | 'CAR';
export type VehicleStatus = 'ACTIVE' | 'IN_SERVICE' | 'UNDER_MAINTENANCE' | 'OUT_OF_SERVICE';
export type VehicleOwnership = 'OWNED' | 'LEASED' | 'CONTRACTED';

export interface TransportVehicle {
  id: string;
  tenantId: string;
  vehicleCode: string;
  registrationNumber: string;
  vehicleType: VehicleType;
  capacity: number;
  allocatedStudents: number;
  ownership: VehicleOwnership;
  status: VehicleStatus;
  assignedDriverName?: string;
  insuranceExpiry: string;
  fitnessExpiry: string;
  pucExpiry: string;
  gpsDeviceId?: string;
}

export interface TransportDriver {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  licenseNumber: string;
  licenseExpiry: string;
  assignedVehicleId?: string;
  assignedVehicleCode?: string;
  policeVerified: boolean;
  status: 'ACTIVE' | 'ON_LEAVE';
}

export interface RouteStop {
  id: string;
  stopName: string;
  pickupTime: string;
  dropTime: string;
  fareAmount: number;
  stopOrder: number;
}

export interface TransportRoute {
  id: string;
  tenantId: string;
  routeCode: string;
  name: string;
  vehicleId: string;
  vehicleCode: string;
  driverName: string;
  stops: RouteStop[];
  startPoint: string;
  endPoint: string;
  totalDistanceKm: number;
}

export interface StudentTransportEnrollment {
  id: string;
  tenantId: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  classOrBatch: string;
  routeId: string;
  routeName: string;
  stopId: string;
  stopName: string;
  vehicleId: string;
  vehicleCode: string;
  monthlyFee: number;
  status: 'ACTIVE' | 'CANCELLED';
}

export interface TransportTrip {
  id: string;
  tenantId: string;
  tripDate: string;
  routeId: string;
  routeName: string;
  vehicleCode: string;
  driverName: string;
  tripType: 'MORNING_PICKUP' | 'EVENING_DROP';
  status: 'SCHEDULED' | 'IN_TRANSIT' | 'COMPLETED';
  boardedCount: number;
  totalExpected: number;
}

export interface FuelLog {
  id: string;
  tenantId: string;
  vehicleId: string;
  vehicleCode: string;
  date: string;
  odometerReading: number;
  quantityLitres: number;
  ratePerLitre: number;
  totalCost: number;
  fuelStation: string;
  invoiceRef: string;
}

// -------------------------------------------------------------
// DOCUMENT 59: HOSTEL MANAGEMENT TYPES
// -------------------------------------------------------------
export type HostelGenderPolicy = 'MALE' | 'FEMALE' | 'MIXED';
export type RoomType = 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'DORMITORY';
export type BedStatus = 'VACANT' | 'OCCUPIED' | 'UNDER_MAINTENANCE' | 'RESERVED';

export interface Hostel {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  genderPolicy: HostelGenderPolicy;
  wardenName: string;
  wardenPhone: string;
  totalRooms: number;
  totalBeds: number;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface HostelRoom {
  id: string;
  tenantId: string;
  hostelId: string;
  hostelCode: string;
  block: string;
  floor: number;
  roomNumber: string;
  roomType: RoomType;
  capacity: number;
  occupiedBeds: number;
  hasAttachedBath: boolean;
  isAirConditioned: boolean;
  monthlyRent: number;
}

export interface HostelBed {
  id: string;
  tenantId: string;
  roomId: string;
  roomNumber: string;
  hostelId: string;
  bedCode: string;
  bedNumber: number;
  status: BedStatus;
  studentId?: string;
  studentName?: string;
}

export interface HostelAllocation {
  id: string;
  tenantId: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  hostelId: string;
  hostelName: string;
  roomId: string;
  roomNumber: string;
  bedId: string;
  bedCode: string;
  allocationDate: string;
  securityDeposit: number;
  monthlyFee: number;
  status: 'ACTIVE' | 'CHECKED_OUT';
}

export interface HostelAttendanceRecord {
  id: string;
  tenantId: string;
  date: string;
  hostelId: string;
  studentId: string;
  studentName: string;
  roomNumber: string;
  status: 'PRESENT' | 'ABSENT' | 'ON_LEAVE';
  remarks?: string;
}

export interface GatePass {
  id: string;
  tenantId: string;
  studentId: string;
  studentName: string;
  roomNumber: string;
  passType: 'DAY_OUT' | 'NIGHT_OUT' | 'HOME_VISIT';
  departureTime: string;
  expectedReturn: string;
  actualReturn?: string;
  reason: string;
  approvedBy: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RETURNED';
}

export interface HostelComplaint {
  id: string;
  tenantId: string;
  studentId: string;
  studentName: string;
  roomNumber: string;
  category: 'PLUMBING' | 'ELECTRICAL' | 'FURNITURE' | 'CLEANLINESS' | 'OTHER';
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  loggedAt: string;
}

// -------------------------------------------------------------
// DOCUMENT 60: HOSTEL MESS MANAGEMENT TYPES
// -------------------------------------------------------------
export type MealType = 'BREAKFAST' | 'LUNCH' | 'SNACKS' | 'DINNER';
export type DietaryPreference = 'VEG' | 'NON_VEG' | 'JAIN';

export interface HostelMess {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  hostelId: string;
  hostelName: string;
  seatingCapacity: number;
  breakfastWindow: string;
  lunchWindow: string;
  snacksWindow: string;
  dinnerWindow: string;
  status: 'ACTIVE' | 'CLOSED';
}

export interface MessMealPlan {
  id: string;
  tenantId: string;
  name: string;
  dietaryType: DietaryPreference;
  mealsIncluded: MealType[];
  monthlyRate: number;
  description: string;
}

export interface StudentMessSubscription {
  id: string;
  tenantId: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  messId: string;
  planId: string;
  planName: string;
  dietaryPreference: DietaryPreference;
  monthlyRate: number;
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED';
}

export interface MessDailyMenu {
  id: string;
  tenantId: string;
  dayOfWeek: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
  breakfast: string;
  lunch: string;
  snacks: string;
  dinner: string;
  specialNote?: string;
}

export interface MealConsumptionRecord {
  id: string;
  tenantId: string;
  date: string;
  mealType: MealType;
  messId: string;
  totalExpected: number;
  totalServed: number;
  status: 'SCHEDULED' | 'SERVING' | 'COMPLETED';
}

export interface MessFeedback {
  id: string;
  tenantId: string;
  studentId: string;
  studentName: string;
  date: string;
  mealType: MealType;
  rating: number; // 1 to 5
  comment: string;
  category: 'TASTE' | 'HYGIENE' | 'PORTION' | 'TEMPERATURE';
  status: 'REVIEWED' | 'PENDING';
}

// -------------------------------------------------------------
// DOCUMENT 61: HEALTH & MEDICAL MANAGEMENT TYPES
// -------------------------------------------------------------
export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'UNKNOWN';
export type AllergySeverity = 'MILD' | 'MODERATE' | 'SEVERE' | 'CRITICAL';
export type VisitStatus = 'OPEN' | 'COMPLETED' | 'FOLLOW_UP_REQUIRED' | 'REFERRED_TO_HOSPITAL' | 'CANCELLED';

export interface StudentHealthProfile {
  id: string;
  tenantId: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  bloodGroup: BloodGroup;
  heightCm: number;
  weightKg: number;
  bmi: number;
  chronicConditions?: string;
  dietaryRestrictions?: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  preferredHospital?: string;
  updatedAt: string;
}

export interface StudentAllergy {
  id: string;
  tenantId: string;
  studentId: string;
  substance: string;
  category: 'FOOD' | 'MEDICATION' | 'ENVIRONMENTAL' | 'OTHER';
  severity: AllergySeverity;
  reaction: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface ClinicFacility {
  id: string;
  tenantId: string;
  name: string;
  location: string;
  nurseInCharge: string;
  contactPhone: string;
  bedCount: number;
  status: 'ACTIVE' | 'CLOSED';
}

export interface MedicalVisit {
  id: string;
  tenantId: string;
  clinicId: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  visitDate: string;
  visitTime: string;
  chiefComplaint: string;
  symptoms: string;
  vitalTempF?: number;
  vitalPulse?: number;
  vitalBp?: string;
  diagnosis: string;
  treatmentGiven: string;
  medicationGiven?: string;
  status: VisitStatus;
  recordedBy: string;
  parentNotified: boolean;
}

export interface HealthScreening {
  id: string;
  tenantId: string;
  studentId: string;
  studentName: string;
  date: string;
  screeningType: 'ANNUAL_CHECKUP' | 'VISION' | 'DENTAL' | 'FITNESS';
  visionRight: string;
  visionLeft: string;
  dentalHealth: 'HEALTHY' | 'CAVITIES_OBSERVED' | 'ORTHODONTIC_CARE_REQUIRED';
  generalFitness: 'EXCELLENT' | 'GOOD' | 'NEEDS_ATTENTION';
  doctorNotes: string;
  examinerName: string;
}

export interface VaccinationRecord {
  id: string;
  tenantId: string;
  studentId: string;
  studentName: string;
  vaccineName: string;
  doseNumber: number;
  dateAdministered: string;
  administeredBy: string;
  certificateRef?: string;
  status: 'COMPLETED' | 'DUE' | 'EXEMPTED';
}

export type ResultStatus = 'PROCESSING' | 'READY' | 'APPROVED' | 'PUBLISHED' | 'REVISED';
export type ResultPassStatus = 'PASS' | 'FAIL' | 'WITHHELD' | 'INCOMPLETE' | 'ABSENT' | 'EXEMPTED';

export interface GradeBand {
  id: string;
  grade: string;
  minPercentage: number;
  maxPercentage: number;
  gradePoint: number;
  description: string;
  isPassing: boolean;
}

export interface GradeScale {
  id: string;
  tenantId: string;
  name: string;
  scaleType: 'CBSE_9_POINT' | 'PERCENTAGE_LETTER' | 'GPA_4_POINT' | 'PERCENTILE_COACHING';
  bands: GradeBand[];
  isDefault: boolean;
}

export interface PassingRuleConfig {
  overallMinPercentage: number;
  subjectMinPercentage: number;
  allowGraceMarks: boolean;
  maxGracePerSubject: number;
  maxTotalGrace: number;
}

export interface SubjectResultItem {
  subjectName: string;
  marks: number;
  maxMarks: number;
  theoryMarks?: number;
  practicalMarks?: number;
  internalMarks?: number;
  percentage: number;
  grade?: string;
  gradePoint?: number;
  passStatus?: 'PASS' | 'FAIL' | 'ABSENT' | 'EXEMPTED' | 'WITHHELD';
  graceMarks?: number;
  isGraceApplied?: boolean;
}

export interface GraceMarkRecord {
  id: string;
  subjectName: string;
  originalMarks: number;
  graceAdded: number;
  finalMarks: number;
  reason: string;
  approvedBy: string;
  timestamp: string;
}

export interface ResultRevisionLog {
  version: number;
  reason: string;
  revisedBy: string;
  timestamp: string;
  previousPercentage: number;
  newPercentage: number;
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
    startTime?: string;
    endTime?: string;
    theoryMax?: number;
    practicalMax?: number;
    internalMax?: number;
  }[];
  gradeScaleId?: string;
  passingRules?: PassingRuleConfig;
  status?: ResultStatus;
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
  rollNo?: string;
  marksObtained: SubjectResultItem[];
  totalMarks: number;
  totalMaxMarks: number;
  percentage: number;
  grade?: string;
  gradePoint?: number;
  gpa?: number;
  rank?: number;
  totalInGroup?: number;
  passStatus: ResultPassStatus;
  status: ResultStatus;
  version: number;
  academicYear?: string;
  term?: string;
  attendancePercentage?: number;
  teacherRemarks?: string;
  principalRemarks?: string;
  publishedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  graceMarksLogs?: GraceMarkRecord[];
  revisionHistory?: ResultRevisionLog[];
  gradeScaleName?: string;
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
  category: 'AUTHENTICATION' | 'USER_MANAGEMENT' | 'STUDENT' | 'ATTENDANCE' | 'FEES' | 'PAYMENTS' | 'FINANCE' | 'PAYROLL' | 'INVENTORY' | 'LIBRARY' | 'TRANSPORT' | 'HOSTEL' | 'MESS' | 'HEALTH' | 'RESULTS' | 'SETTINGS' | 'SECURITY' | 'ACADEMIC';
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


