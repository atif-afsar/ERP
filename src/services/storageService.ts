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

  // Reset demo data
  resetAll(): void {
    localStorage.clear();
    window.location.reload();
  }
}

export const storage = new StorageService();
