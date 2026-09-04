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
  GradeScale,
  GraceMarkRecord,
  ResultRevisionLog,
  Expense,
  ExpenseCategory,
  Vendor,
  VendorBill,
  BankAccount,
  PettyCashTransaction,
  AccountTransfer,
  DepartmentBudget,
  FeeRefund,
  ConcessionRecord,
  SalaryStructure,
  PayrollRun,
  Payslip,
  SalaryAdvance,
  InventoryCategory,
  Warehouse,
  InventoryItem,
  StockMovement,
  FixedAsset,
  AssetMaintenanceRecord,
  BookTitle,
  BookCopy,
  LibraryMember,
  BookCirculationRecord,
  BookReservation,
  TransportVehicle,
  TransportDriver,
  TransportRoute,
  RouteStop,
  StudentTransportEnrollment,
  TransportTrip,
  FuelLog,
  Hostel,
  HostelRoom,
  HostelBed,
  HostelAllocation,
  HostelAttendanceRecord,
  GatePass,
  HostelComplaint,
  HostelMess,
  MessMealPlan,
  StudentMessSubscription,
  MessDailyMenu,
  MealConsumptionRecord,
  MessFeedback,
  StudentHealthProfile,
  StudentAllergy,
  ClinicFacility,
  MedicalVisit,
  HealthScreening,
  VaccinationRecord,
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
  INITIAL_GRADE_SCALES,
  INITIAL_TIMETABLE,
  INITIAL_HOMEWORK,
  INITIAL_NOTICES,
  INITIAL_LEADS,
  INITIAL_NOTIFICATIONS,
  INITIAL_AUDIT_LOGS,
  INITIAL_TEACHER_ASSIGNMENTS,
  INITIAL_EXPENSE_CATEGORIES,
  INITIAL_VENDORS,
  INITIAL_VENDOR_BILLS,
  INITIAL_EXPENSES,
  INITIAL_BANK_ACCOUNTS,
  INITIAL_PETTY_CASH,
  INITIAL_ACCOUNT_TRANSFERS,
  INITIAL_DEPARTMENT_BUDGETS,
  INITIAL_SALARY_STRUCTURES,
  INITIAL_PAYROLL_RUNS,
  INITIAL_PAYSLIPS,
  INITIAL_SALARY_ADVANCES,
  INITIAL_INVENTORY_CATEGORIES,
  INITIAL_WAREHOUSES,
  INITIAL_INVENTORY_ITEMS,
  INITIAL_STOCK_MOVEMENTS,
  INITIAL_FIXED_ASSETS,
  INITIAL_ASSET_MAINTENANCE,
  INITIAL_BOOK_TITLES,
  INITIAL_BOOK_COPIES,
  INITIAL_LIBRARY_MEMBERS,
  INITIAL_LIBRARY_CIRCULATION,
  INITIAL_TRANSPORT_VEHICLES,
  INITIAL_TRANSPORT_DRIVERS,
  INITIAL_TRANSPORT_ROUTES,
  INITIAL_TRANSPORT_ENROLLMENTS,
  INITIAL_TRANSPORT_TRIPS,
  INITIAL_FUEL_LOGS,
  INITIAL_HOSTELS,
  INITIAL_HOSTEL_ROOMS,
  INITIAL_HOSTEL_BEDS,
  INITIAL_HOSTEL_ALLOCATIONS,
  INITIAL_HOSTEL_ATTENDANCE,
  INITIAL_GATE_PASSES,
  INITIAL_HOSTEL_COMPLAINTS,
  INITIAL_HOSTEL_MESSES,
  INITIAL_MESS_MEAL_PLANS,
  INITIAL_MESS_SUBSCRIPTIONS,
  INITIAL_MESS_MENUS,
  INITIAL_MEAL_CONSUMPTIONS,
  INITIAL_MESS_FEEDBACK,
  INITIAL_CLINIC_FACILITIES,
  INITIAL_STUDENT_HEALTH_PROFILES,
  INITIAL_STUDENT_ALLERGIES,
  INITIAL_MEDICAL_VISITS,
  INITIAL_HEALTH_SCREENINGS,
  INITIAL_VACCINATION_RECORDS,
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

  // Fees & Ledgers (Document 53)
  getFeeStructures(tenantId: string): FeeStructure[] {
    const all = this.getItem<FeeStructure[]>('fee_structures', INITIAL_FEE_STRUCTURES);
    return all.filter((f) => f.tenantId === tenantId);
  }

  saveFeeStructure(structure: FeeStructure): void {
    const all = this.getItem<FeeStructure[]>('fee_structures', INITIAL_FEE_STRUCTURES);
    const idx = all.findIndex((f) => f.id === structure.id);
    if (idx >= 0) all[idx] = structure;
    else all.unshift(structure);
    this.setItem('fee_structures', all);
  }

  getFeeLedgers(tenantId: string): StudentFeeLedger[] {
    const all = this.getItem<StudentFeeLedger[]>('fee_ledgers', INITIAL_FEE_LEDGERS);
    return all.filter((l) => l.tenantId === tenantId);
  }

  saveStudentLedger(ledger: StudentFeeLedger): void {
    const all = this.getItem<StudentFeeLedger[]>('fee_ledgers', INITIAL_FEE_LEDGERS);
    const idx = all.findIndex((l) => l.id === ledger.id);
    if (idx >= 0) all[idx] = ledger;
    else all.unshift(ledger);
    this.setItem('fee_ledgers', all);
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

      // Update installments FIFO
      let rem = payment.amount;
      for (const inst of ledger.installments) {
        if (rem <= 0) break;
        const instDue = inst.amount - (inst.paidAmount || 0);
        if (instDue > 0) {
          const alloc = Math.min(rem, instDue);
          inst.paidAmount = (inst.paidAmount || 0) + alloc;
          rem -= alloc;
          if (inst.paidAmount >= inst.amount) {
            inst.status = 'PAID';
            inst.paidDate = new Date().toISOString().split('T')[0];
          } else {
            inst.status = 'PARTIAL';
          }
        }
      }
      this.setItem('fee_ledgers', ledgers);
    }

    // Auto-update bank account collection balance
    const accounts = this.getItem<BankAccount[]>('bank_accounts', INITIAL_BANK_ACCOUNTS);
    const collAcc = accounts.find((a) => a.tenantId === payment.tenantId && a.accountType === 'COLLECTION') || accounts[0];
    if (collAcc) {
      collAcc.balance += payment.amount;
      this.setItem('bank_accounts', accounts);
    }
  }

  applyFeeConcession(studentId: string, concession: ConcessionRecord): void {
    const ledgers = this.getItem<StudentFeeLedger[]>('fee_ledgers', INITIAL_FEE_LEDGERS);
    const ledger = ledgers.find((l) => l.studentId === studentId);
    if (ledger) {
      ledger.concession += concession.amount;
      ledger.concessionRecords = [...(ledger.concessionRecords || []), concession];
      ledger.netPayable = Math.max(0, ledger.totalFee - ledger.concession);
      ledger.dueAmount = Math.max(0, ledger.netPayable - ledger.paidAmount);
      ledger.status = ledger.dueAmount === 0 ? 'PAID' : ledger.paidAmount > 0 ? 'PARTIAL' : 'UPCOMING';
      this.setItem('fee_ledgers', ledgers);
    }
  }

  recordFeeRefund(refund: FeeRefund): void {
    const ledgers = this.getItem<StudentFeeLedger[]>('fee_ledgers', INITIAL_FEE_LEDGERS);
    const ledger = ledgers.find((l) => l.studentId === refund.studentId);
    if (ledger) {
      ledger.refunds = [...(ledger.refunds || []), refund];
      ledger.paidAmount = Math.max(0, ledger.paidAmount - refund.refundAmount);
      ledger.dueAmount = Math.max(0, ledger.netPayable - ledger.paidAmount);
      ledger.status = ledger.dueAmount === 0 ? 'PAID' : 'PARTIAL';
      this.setItem('fee_ledgers', ledgers);
    }
  }

  // -------------------------------------------------------------
  // EXPENSES, FINANCE & ACCOUNTING (Document 54)
  // -------------------------------------------------------------
  getExpenseCategories(tenantId: string): ExpenseCategory[] {
    const all = this.getItem<ExpenseCategory[]>('expense_categories', INITIAL_EXPENSE_CATEGORIES);
    return all.filter((c) => c.tenantId === tenantId);
  }

  saveExpenseCategory(cat: ExpenseCategory): void {
    const all = this.getItem<ExpenseCategory[]>('expense_categories', INITIAL_EXPENSE_CATEGORIES);
    const idx = all.findIndex((c) => c.id === cat.id);
    if (idx >= 0) all[idx] = cat;
    else all.push(cat);
    this.setItem('expense_categories', all);
  }

  getExpenses(tenantId: string): Expense[] {
    const all = this.getItem<Expense[]>('expenses', INITIAL_EXPENSES);
    return all.filter((e) => e.tenantId === tenantId);
  }

  saveExpense(exp: Expense): void {
    const all = this.getItem<Expense[]>('expenses', INITIAL_EXPENSES);
    const idx = all.findIndex((e) => e.id === exp.id);
    if (idx >= 0) all[idx] = exp;
    else all.unshift(exp);
    this.setItem('expenses', all);
  }

  approveExpense(expenseId: string, approvedBy: string): void {
    const all = this.getItem<Expense[]>('expenses', INITIAL_EXPENSES);
    const exp = all.find((e) => e.id === expenseId);
    if (exp) {
      exp.status = 'APPROVED';
      exp.approvedBy = approvedBy;
      exp.approvedAt = new Date().toISOString();
      this.setItem('expenses', all);
    }
  }

  payExpense(expenseId: string, paymentMethod: any, referenceNo: string, paidFromAccountId?: string): void {
    const all = this.getItem<Expense[]>('expenses', INITIAL_EXPENSES);
    const exp = all.find((e) => e.id === expenseId);
    if (exp) {
      exp.status = 'PAID';
      exp.paymentMethod = paymentMethod;
      exp.referenceNo = referenceNo;
      exp.paidAt = new Date().toISOString();
      this.setItem('expenses', all);

      // Deduct from bank account or petty cash
      if (paymentMethod === 'PETTY_CASH') {
        const pc = this.getItem<PettyCashTransaction[]>('petty_cash', INITIAL_PETTY_CASH);
        const lastBal = pc[0]?.balanceAfter || 15000;
        const newRecord: PettyCashTransaction = {
          id: `pc-${Date.now()}`,
          tenantId: exp.tenantId,
          type: 'DISBURSEMENT',
          amount: exp.totalAmount,
          category: exp.categoryName,
          description: exp.description,
          voucherNo: exp.voucherNo,
          custodian: 'Ramesh Gupta',
          date: new Date().toISOString().split('T')[0],
          balanceAfter: Math.max(0, lastBal - exp.totalAmount),
        };
        pc.unshift(newRecord);
        this.setItem('petty_cash', pc);
      } else {
        const accounts = this.getItem<BankAccount[]>('bank_accounts', INITIAL_BANK_ACCOUNTS);
        const acc = accounts.find((a) => a.id === paidFromAccountId) || accounts.find((a) => a.isPrimary) || accounts[0];
        if (acc) {
          acc.balance = Math.max(0, acc.balance - exp.totalAmount);
          this.setItem('bank_accounts', accounts);
        }
      }
    }
  }

  getVendors(tenantId: string): Vendor[] {
    const all = this.getItem<Vendor[]>('vendors', INITIAL_VENDORS);
    return all.filter((v) => v.tenantId === tenantId);
  }

  saveVendor(vendor: Vendor): void {
    const all = this.getItem<Vendor[]>('vendors', INITIAL_VENDORS);
    const idx = all.findIndex((v) => v.id === vendor.id);
    if (idx >= 0) all[idx] = vendor;
    else all.unshift(vendor);
    this.setItem('vendors', all);
  }

  getVendorBills(tenantId: string): VendorBill[] {
    const all = this.getItem<VendorBill[]>('vendor_bills', INITIAL_VENDOR_BILLS);
    return all.filter((b) => b.tenantId === tenantId);
  }

  saveVendorBill(bill: VendorBill): void {
    const all = this.getItem<VendorBill[]>('vendor_bills', INITIAL_VENDOR_BILLS);
    const idx = all.findIndex((b) => b.id === bill.id);
    if (idx >= 0) all[idx] = bill;
    else all.unshift(bill);
    this.setItem('vendor_bills', all);
  }

  recordVendorPayment(billId: string, amount: number, paymentMethod: string): void {
    const bills = this.getItem<VendorBill[]>('vendor_bills', INITIAL_VENDOR_BILLS);
    const bill = bills.find((b) => b.id === billId);
    if (bill) {
      bill.paidAmount += amount;
      bill.dueAmount = Math.max(0, bill.amount - bill.paidAmount);
      bill.status = bill.dueAmount === 0 ? 'PAID' : 'PARTIAL';
      this.setItem('vendor_bills', bills);
    }
  }

  getBankAccounts(tenantId: string): BankAccount[] {
    const all = this.getItem<BankAccount[]>('bank_accounts', INITIAL_BANK_ACCOUNTS);
    return all.filter((a) => a.tenantId === tenantId);
  }

  saveBankAccount(account: BankAccount): void {
    const all = this.getItem<BankAccount[]>('bank_accounts', INITIAL_BANK_ACCOUNTS);
    const idx = all.findIndex((a) => a.id === account.id);
    if (idx >= 0) all[idx] = account;
    else all.push(account);
    this.setItem('bank_accounts', all);
  }

  recordAccountTransfer(transfer: AccountTransfer): void {
    const transfers = this.getItem<AccountTransfer[]>('account_transfers', INITIAL_ACCOUNT_TRANSFERS);
    transfers.unshift(transfer);
    this.setItem('account_transfers', transfers);

    // Update balances
    const accounts = this.getItem<BankAccount[]>('bank_accounts', INITIAL_BANK_ACCOUNTS);
    const from = accounts.find((a) => a.id === transfer.fromAccountId);
    const to = accounts.find((a) => a.id === transfer.toAccountId);
    if (from) from.balance = Math.max(0, from.balance - transfer.amount);
    if (to) to.balance += transfer.amount;
    this.setItem('bank_accounts', accounts);
  }

  getPettyCash(tenantId: string): PettyCashTransaction[] {
    const all = this.getItem<PettyCashTransaction[]>('petty_cash', INITIAL_PETTY_CASH);
    return all.filter((p) => p.tenantId === tenantId);
  }

  recordPettyCash(item: PettyCashTransaction): void {
    const all = this.getItem<PettyCashTransaction[]>('petty_cash', INITIAL_PETTY_CASH);
    all.unshift(item);
    this.setItem('petty_cash', all);
  }

  getDepartmentBudgets(tenantId: string): DepartmentBudget[] {
    const all = this.getItem<DepartmentBudget[]>('department_budgets', INITIAL_DEPARTMENT_BUDGETS);
    return all.filter((b) => b.tenantId === tenantId);
  }

  saveDepartmentBudget(budget: DepartmentBudget): void {
    const all = this.getItem<DepartmentBudget[]>('department_budgets', INITIAL_DEPARTMENT_BUDGETS);
    const idx = all.findIndex((b) => b.id === budget.id);
    if (idx >= 0) all[idx] = budget;
    else all.push(budget);
    this.setItem('department_budgets', all);
  }

  // -------------------------------------------------------------
  // STAFF, PAYROLL & HR (Document 55)
  // -------------------------------------------------------------
  getSalaryStructures(tenantId: string): SalaryStructure[] {
    const all = this.getItem<SalaryStructure[]>('salary_structures', INITIAL_SALARY_STRUCTURES);
    return all.filter((s) => s.tenantId === tenantId);
  }

  saveSalaryStructure(structure: SalaryStructure): void {
    const all = this.getItem<SalaryStructure[]>('salary_structures', INITIAL_SALARY_STRUCTURES);
    const idx = all.findIndex((s) => s.id === structure.id);
    if (idx >= 0) all[idx] = structure;
    else all.unshift(structure);
    this.setItem('salary_structures', all);
  }

  getPayrollRuns(tenantId: string): PayrollRun[] {
    const all = this.getItem<PayrollRun[]>('payroll_runs', INITIAL_PAYROLL_RUNS);
    return all.filter((p) => p.tenantId === tenantId);
  }

  savePayrollRun(run: PayrollRun): void {
    const all = this.getItem<PayrollRun[]>('payroll_runs', INITIAL_PAYROLL_RUNS);
    const idx = all.findIndex((p) => p.id === run.id);
    if (idx >= 0) all[idx] = run;
    else all.unshift(run);
    this.setItem('payroll_runs', all);
  }

  getPayslips(tenantId: string, runId?: string): Payslip[] {
    const all = this.getItem<Payslip[]>('payslips', INITIAL_PAYSLIPS);
    return all.filter((p) => p.tenantId === tenantId && (!runId || p.payrollRunId === runId));
  }

  savePayslip(payslip: Payslip): void {
    const all = this.getItem<Payslip[]>('payslips', INITIAL_PAYSLIPS);
    const idx = all.findIndex((p) => p.id === payslip.id);
    if (idx >= 0) all[idx] = payslip;
    else all.unshift(payslip);
    this.setItem('payslips', all);
  }

  getSalaryAdvances(tenantId: string): SalaryAdvance[] {
    const all = this.getItem<SalaryAdvance[]>('salary_advances', INITIAL_SALARY_ADVANCES);
    return all.filter((a) => a.tenantId === tenantId);
  }

  saveSalaryAdvance(advance: SalaryAdvance): void {
    const all = this.getItem<SalaryAdvance[]>('salary_advances', INITIAL_SALARY_ADVANCES);
    const idx = all.findIndex((a) => a.id === advance.id);
    if (idx >= 0) all[idx] = advance;
    else all.unshift(advance);
    this.setItem('salary_advances', all);
  }

  approvePayrollRun(runId: string, approvedBy: string): void {
    const runs = this.getItem<PayrollRun[]>('payroll_runs', INITIAL_PAYROLL_RUNS);
    const run = runs.find((r) => r.id === runId);
    if (run) {
      run.status = 'APPROVED';
      run.approvedBy = approvedBy;
      run.approvedAt = new Date().toISOString();
      this.setItem('payroll_runs', runs);
    }
  }

  disbursePayrollRun(runId: string, fromAccountId?: string): void {
    const runs = this.getItem<PayrollRun[]>('payroll_runs', INITIAL_PAYROLL_RUNS);
    const run = runs.find((r) => r.id === runId);
    if (run) {
      run.status = 'DISBURSED';
      run.disbursedAt = new Date().toISOString();
      run.disbursedFromAccountId = fromAccountId;
      this.setItem('payroll_runs', runs);

      // Update payslips status to PAID
      const payslips = this.getItem<Payslip[]>('payslips', INITIAL_PAYSLIPS);
      payslips.forEach((p) => {
        if (p.payrollRunId === runId) {
          p.status = 'PAID';
        }
      });
      this.setItem('payslips', payslips);

      // Deduct from bank account
      const accounts = this.getItem<BankAccount[]>('bank_accounts', INITIAL_BANK_ACCOUNTS);
      const acc = accounts.find((a) => a.id === fromAccountId) || accounts.find((a) => a.isPrimary) || accounts[0];
      if (acc) {
        acc.balance = Math.max(0, acc.balance - run.totalNetPayout);
        this.setItem('bank_accounts', accounts);
      }
    }
  }

  // -------------------------------------------------------------
  // INVENTORY & ASSET MANAGEMENT (Document 56)
  // -------------------------------------------------------------
  getInventoryCategories(tenantId: string): InventoryCategory[] {
    const all = this.getItem<InventoryCategory[]>('inventory_categories', INITIAL_INVENTORY_CATEGORIES);
    return all.filter((c) => c.tenantId === tenantId);
  }

  getWarehouses(tenantId: string): Warehouse[] {
    const all = this.getItem<Warehouse[]>('warehouses', INITIAL_WAREHOUSES);
    return all.filter((w) => w.tenantId === tenantId);
  }

  saveWarehouse(warehouse: Warehouse): void {
    const all = this.getItem<Warehouse[]>('warehouses', INITIAL_WAREHOUSES);
    const idx = all.findIndex((w) => w.id === warehouse.id);
    if (idx >= 0) all[idx] = warehouse;
    else all.push(warehouse);
    this.setItem('warehouses', all);
  }

  getInventoryItems(tenantId: string): InventoryItem[] {
    const all = this.getItem<InventoryItem[]>('inventory_items', INITIAL_INVENTORY_ITEMS);
    return all.filter((i) => i.tenantId === tenantId);
  }

  saveInventoryItem(item: InventoryItem): void {
    const all = this.getItem<InventoryItem[]>('inventory_items', INITIAL_INVENTORY_ITEMS);
    const idx = all.findIndex((i) => i.id === item.id);
    if (idx >= 0) all[idx] = item;
    else all.unshift(item);
    this.setItem('inventory_items', all);
  }

  getStockMovements(tenantId: string): StockMovement[] {
    const all = this.getItem<StockMovement[]>('stock_movements', INITIAL_STOCK_MOVEMENTS);
    return all.filter((m) => m.tenantId === tenantId);
  }

  recordStockMovement(movement: StockMovement): void {
    const movements = this.getItem<StockMovement[]>('stock_movements', INITIAL_STOCK_MOVEMENTS);
    movements.unshift(movement);
    this.setItem('stock_movements', movements);

    // Update item stock level
    const items = this.getItem<InventoryItem[]>('inventory_items', INITIAL_INVENTORY_ITEMS);
    const item = items.find((i) => i.id === movement.itemId);
    if (item) {
      if (movement.type === 'STOCK_IN') {
        item.currentStock += movement.quantity;
      } else if (movement.type === 'STOCK_OUT') {
        item.currentStock = Math.max(0, item.currentStock - movement.quantity);
      } else if (movement.type === 'ADJUSTMENT') {
        item.currentStock = movement.quantity;
      }

      item.totalValue = item.currentStock * item.unitPrice;
      if (item.currentStock === 0) {
        item.status = 'OUT_OF_STOCK';
      } else if (item.currentStock <= item.reorderLevel) {
        item.status = 'LOW_STOCK';
      } else {
        item.status = 'IN_STOCK';
      }

      this.setItem('inventory_items', items);
    }
  }

  getFixedAssets(tenantId: string): FixedAsset[] {
    const all = this.getItem<FixedAsset[]>('fixed_assets', INITIAL_FIXED_ASSETS);
    return all.filter((a) => a.tenantId === tenantId);
  }

  saveFixedAsset(asset: FixedAsset): void {
    const all = this.getItem<FixedAsset[]>('fixed_assets', INITIAL_FIXED_ASSETS);
    const idx = all.findIndex((a) => a.id === asset.id);
    if (idx >= 0) all[idx] = asset;
    else all.unshift(asset);
    this.setItem('fixed_assets', all);
  }

  getAssetMaintenance(tenantId: string): AssetMaintenanceRecord[] {
    const all = this.getItem<AssetMaintenanceRecord[]>('asset_maintenance', INITIAL_ASSET_MAINTENANCE);
    return all.filter((m) => m.tenantId === tenantId);
  }

  recordAssetMaintenance(record: AssetMaintenanceRecord): void {
    const all = this.getItem<AssetMaintenanceRecord[]>('asset_maintenance', INITIAL_ASSET_MAINTENANCE);
    all.unshift(record);
    this.setItem('asset_maintenance', all);

    // Update asset status if needed
    if (record.status === 'SCHEDULED') {
      const assets = this.getItem<FixedAsset[]>('fixed_assets', INITIAL_FIXED_ASSETS);
      const asset = assets.find((a) => a.id === record.assetId);
      if (asset) {
        asset.status = 'IN_MAINTENANCE';
        this.setItem('fixed_assets', assets);
      }
    }
  }

  // Grade Scales
  getGradeScales(tenantId: string): GradeScale[] {
    const all = this.getItem<GradeScale[]>('grade_scales', INITIAL_GRADE_SCALES);
    return all.filter((s) => s.tenantId === tenantId);
  }

  saveGradeScale(scale: GradeScale): void {
    const all = this.getItem<GradeScale[]>('grade_scales', INITIAL_GRADE_SCALES);
    const idx = all.findIndex((s) => s.id === scale.id);
    if (idx >= 0) all[idx] = scale;
    else all.push(scale);
    this.setItem('grade_scales', all);
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

  saveExamResult(result: StudentExamResult): void {
    const all = this.getItem<StudentExamResult[]>('exam_results', INITIAL_EXAM_RESULTS);
    const idx = all.findIndex((r) => r.id === result.id);
    if (idx >= 0) all[idx] = result;
    else all.unshift(result);
    this.setItem('exam_results', all);
  }

  saveBulkExamResults(results: StudentExamResult[]): void {
    const all = this.getItem<StudentExamResult[]>('exam_results', INITIAL_EXAM_RESULTS);
    const updated = [...all];
    results.forEach((res) => {
      const idx = updated.findIndex((r) => r.id === res.id);
      if (idx >= 0) updated[idx] = res;
      else updated.unshift(res);
    });
    this.setItem('exam_results', updated);
  }

  approveExamResults(examId: string, approvedBy: string): void {
    const results = this.getItem<StudentExamResult[]>('exam_results', INITIAL_EXAM_RESULTS);
    const now = new Date().toISOString();
    results.forEach((r) => {
      if (r.examId === examId) {
        r.status = 'APPROVED';
        r.approvedBy = approvedBy;
        r.approvedAt = now;
      }
    });
    this.setItem('exam_results', results);

    const exams = this.getItem<Exam[]>('exams', INITIAL_EXAMS);
    const ex = exams.find((e) => e.id === examId);
    if (ex) {
      ex.status = 'APPROVED';
      this.setItem('exams', exams);
    }
  }

  publishExamResults(examId: string): void {
    const results = this.getItem<StudentExamResult[]>('exam_results', INITIAL_EXAM_RESULTS);
    const now = new Date().toISOString();
    results.forEach((r) => {
      if (r.examId === examId) {
        r.status = 'PUBLISHED';
        r.publishedAt = now;
      }
    });
    this.setItem('exam_results', results);

    const exams = this.getItem<Exam[]>('exams', INITIAL_EXAMS);
    const ex = exams.find((e) => e.id === examId);
    if (ex) {
      ex.isPublished = true;
      ex.status = 'PUBLISHED';
      this.setItem('exams', exams);
    }
  }

  reviseExamResult(
    resultId: string,
    updatedData: Partial<StudentExamResult>,
    reason: string,
    revisedBy: string
  ): void {
    const results = this.getItem<StudentExamResult[]>('exam_results', INITIAL_EXAM_RESULTS);
    const idx = results.findIndex((r) => r.id === resultId);
    if (idx >= 0) {
      const current = results[idx];
      const prevPercentage = current.percentage;
      const newVersion = (current.version || 1) + 1;
      const historyItem: ResultRevisionLog = {
        version: newVersion,
        reason,
        revisedBy,
        timestamp: new Date().toISOString(),
        previousPercentage: prevPercentage,
        newPercentage: updatedData.percentage !== undefined ? updatedData.percentage : prevPercentage,
      };

      const updatedLogs = [...(current.revisionHistory || []), historyItem];

      results[idx] = {
        ...current,
        ...updatedData,
        version: newVersion,
        status: 'REVISED',
        revisionHistory: updatedLogs,
      };
      this.setItem('exam_results', results);
    }
  }

  applyGraceMarks(
    resultId: string,
    subjectName: string,
    graceAdded: number,
    reason: string,
    approvedBy: string
  ): void {
    const results = this.getItem<StudentExamResult[]>('exam_results', INITIAL_EXAM_RESULTS);
    const idx = results.findIndex((r) => r.id === resultId);
    if (idx >= 0) {
      const current = results[idx];
      const subject = current.marksObtained.find((s) => s.subjectName === subjectName);
      if (subject) {
        const originalMarks = subject.marks;
        subject.marks = Math.min(subject.maxMarks, originalMarks + graceAdded);
        subject.graceMarks = (subject.graceMarks || 0) + graceAdded;
        subject.isGraceApplied = true;
        subject.percentage = Math.round((subject.marks / subject.maxMarks) * 10000) / 100;
        subject.passStatus = 'PASS';

        // Recalculate totals
        current.totalMarks = current.marksObtained.reduce((acc, curr) => acc + curr.marks, 0);
        current.percentage = Math.round((current.totalMarks / current.totalMaxMarks) * 10000) / 100;

        const auditItem: GraceMarkRecord = {
          id: `grace-${Date.now()}`,
          subjectName,
          originalMarks,
          graceAdded,
          finalMarks: subject.marks,
          reason,
          approvedBy,
          timestamp: new Date().toISOString(),
        };

        current.graceMarksLogs = [...(current.graceMarksLogs || []), auditItem];
        this.setItem('exam_results', results);
      }
    }
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
  getAuditLogs(tenantId?: string): AuditLog[] {
    const all = this.getItem<AuditLog[]>('audit_logs', INITIAL_AUDIT_LOGS);
    if (!tenantId) return all;
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

  // -------------------------------------------------------------
  // DOCUMENT 57: LIBRARY MANAGEMENT
  // -------------------------------------------------------------
  getBookTitles(tenantId?: string): BookTitle[] {
    const list = this.getItem<BookTitle[]>('book_titles', INITIAL_BOOK_TITLES);
    return tenantId ? list.filter((b) => b.tenantId === tenantId) : list;
  }

  saveBookTitle(title: BookTitle): void {
    const list = this.getBookTitles();
    const idx = list.findIndex((b) => b.id === title.id);
    if (idx >= 0) list[idx] = title;
    else list.unshift(title);
    this.setItem('book_titles', list);
  }

  getBookCopies(tenantId?: string): BookCopy[] {
    const list = this.getItem<BookCopy[]>('book_copies', INITIAL_BOOK_COPIES);
    return tenantId ? list.filter((c) => c.tenantId === tenantId) : list;
  }

  saveBookCopy(copy: BookCopy): void {
    const list = this.getBookCopies();
    const idx = list.findIndex((c) => c.id === copy.id);
    if (idx >= 0) list[idx] = copy;
    else list.unshift(copy);
    this.setItem('book_copies', list);

    // Sync Title counts
    const titles = this.getBookTitles();
    const tIdx = titles.findIndex((t) => t.id === copy.bookTitleId);
    if (tIdx >= 0) {
      const allCopies = list.filter((c) => c.bookTitleId === copy.bookTitleId);
      titles[tIdx].totalCopies = allCopies.length;
      titles[tIdx].availableCopies = allCopies.filter((c) => c.status === 'AVAILABLE').length;
      this.setItem('book_titles', titles);
    }
  }

  getLibraryMembers(tenantId?: string): LibraryMember[] {
    const list = this.getItem<LibraryMember[]>('library_members', INITIAL_LIBRARY_MEMBERS);
    return tenantId ? list.filter((m) => m.tenantId === tenantId) : list;
  }

  saveLibraryMember(member: LibraryMember): void {
    const list = this.getLibraryMembers();
    const idx = list.findIndex((m) => m.id === member.id);
    if (idx >= 0) list[idx] = member;
    else list.unshift(member);
    this.setItem('library_members', list);
  }

  getCirculationRecords(tenantId?: string): BookCirculationRecord[] {
    const list = this.getItem<BookCirculationRecord[]>('library_circulation', INITIAL_LIBRARY_CIRCULATION);
    return tenantId ? list.filter((r) => r.tenantId === tenantId) : list;
  }

  issueBookCopy(record: BookCirculationRecord): void {
    const circ = this.getCirculationRecords();
    circ.unshift(record);
    this.setItem('library_circulation', circ);

    // Update copy status
    const copies = this.getBookCopies();
    const cIdx = copies.findIndex((c) => c.id === record.copyId);
    if (cIdx >= 0) {
      copies[cIdx].status = 'ISSUED';
      this.setItem('book_copies', copies);

      // Decrement available copies in title
      const titles = this.getBookTitles();
      const tIdx = titles.findIndex((t) => t.id === copies[cIdx].bookTitleId);
      if (tIdx >= 0 && titles[tIdx].availableCopies > 0) {
        titles[tIdx].availableCopies -= 1;
        this.setItem('book_titles', titles);
      }
    }

    // Increment member active count
    const members = this.getLibraryMembers();
    const mIdx = members.findIndex((m) => m.id === record.memberId);
    if (mIdx >= 0) {
      members[mIdx].activeIssuedCount += 1;
      this.setItem('library_members', members);
    }
  }

  returnBookCopy(recordId: string, returnCondition: any, fineAmount: number = 0): void {
    const circ = this.getCirculationRecords();
    const rIdx = circ.findIndex((r) => r.id === recordId);
    if (rIdx < 0) return;

    circ[rIdx].status = 'RETURNED';
    circ[rIdx].returnedDate = new Date().toISOString().split('T')[0];
    circ[rIdx].fineAmount = fineAmount;
    if (fineAmount > 0) circ[rIdx].finePaid = true;
    this.setItem('library_circulation', circ);

    // Update copy status & condition
    const copies = this.getBookCopies();
    const cIdx = copies.findIndex((c) => c.id === circ[rIdx].copyId);
    if (cIdx >= 0) {
      copies[cIdx].status = 'AVAILABLE';
      if (returnCondition) copies[cIdx].condition = returnCondition;
      this.setItem('book_copies', copies);

      // Increment available copies in title
      const titles = this.getBookTitles();
      const tIdx = titles.findIndex((t) => t.id === copies[cIdx].bookTitleId);
      if (tIdx >= 0) {
        titles[tIdx].availableCopies += 1;
        this.setItem('book_titles', titles);
      }
    }

    // Decrement member active count
    const members = this.getLibraryMembers();
    const mIdx = members.findIndex((m) => m.id === circ[rIdx].memberId);
    if (mIdx >= 0 && members[mIdx].activeIssuedCount > 0) {
      members[mIdx].activeIssuedCount -= 1;
      this.setItem('library_members', members);
    }
  }

  renewBookCopy(recordId: string, newDueDate: string): void {
    const circ = this.getCirculationRecords();
    const rIdx = circ.findIndex((r) => r.id === recordId);
    if (rIdx >= 0) {
      circ[rIdx].dueDate = newDueDate;
      circ[rIdx].status = 'ISSUED';
      this.setItem('library_circulation', circ);
    }
  }

  // -------------------------------------------------------------
  // DOCUMENT 58: TRANSPORT MANAGEMENT
  // -------------------------------------------------------------
  getVehicles(tenantId?: string): TransportVehicle[] {
    const list = this.getItem<TransportVehicle[]>('transport_vehicles', INITIAL_TRANSPORT_VEHICLES);
    return tenantId ? list.filter((v) => v.tenantId === tenantId) : list;
  }

  saveVehicle(vehicle: TransportVehicle): void {
    const list = this.getVehicles();
    const idx = list.findIndex((v) => v.id === vehicle.id);
    if (idx >= 0) list[idx] = vehicle;
    else list.unshift(vehicle);
    this.setItem('transport_vehicles', list);
  }

  getDrivers(tenantId?: string): TransportDriver[] {
    const list = this.getItem<TransportDriver[]>('transport_drivers', INITIAL_TRANSPORT_DRIVERS);
    return tenantId ? list.filter((d) => d.tenantId === tenantId) : list;
  }

  saveDriver(driver: TransportDriver): void {
    const list = this.getDrivers();
    const idx = list.findIndex((d) => d.id === driver.id);
    if (idx >= 0) list[idx] = driver;
    else list.unshift(driver);
    this.setItem('transport_drivers', list);
  }

  getRoutes(tenantId?: string): TransportRoute[] {
    const list = this.getItem<TransportRoute[]>('transport_routes', INITIAL_TRANSPORT_ROUTES);
    return tenantId ? list.filter((r) => r.tenantId === tenantId) : list;
  }

  saveRoute(route: TransportRoute): void {
    const list = this.getRoutes();
    const idx = list.findIndex((r) => r.id === route.id);
    if (idx >= 0) list[idx] = route;
    else list.unshift(route);
    this.setItem('transport_routes', list);
  }

  getTransportEnrollments(tenantId?: string): StudentTransportEnrollment[] {
    const list = this.getItem<StudentTransportEnrollment[]>('transport_enrollments', INITIAL_TRANSPORT_ENROLLMENTS);
    return tenantId ? list.filter((e) => e.tenantId === tenantId) : list;
  }

  saveTransportEnrollment(enrollment: StudentTransportEnrollment): void {
    const list = this.getTransportEnrollments();
    const idx = list.findIndex((e) => e.id === enrollment.id);
    if (idx >= 0) list[idx] = enrollment;
    else list.unshift(enrollment);
    this.setItem('transport_enrollments', list);

    // Update vehicle passenger allocation count
    const vehicles = this.getVehicles();
    const vIdx = vehicles.findIndex((v) => v.id === enrollment.vehicleId);
    if (vIdx >= 0) {
      const activeCount = list.filter((e) => e.vehicleId === enrollment.vehicleId && e.status === 'ACTIVE').length;
      vehicles[vIdx].allocatedStudents = activeCount;
      this.setItem('transport_vehicles', vehicles);
    }
  }

  getTransportTrips(tenantId?: string): TransportTrip[] {
    const list = this.getItem<TransportTrip[]>('transport_trips', INITIAL_TRANSPORT_TRIPS);
    return tenantId ? list.filter((t) => t.tenantId === tenantId) : list;
  }

  saveTransportTrip(trip: TransportTrip): void {
    const list = this.getTransportTrips();
    const idx = list.findIndex((t) => t.id === trip.id);
    if (idx >= 0) list[idx] = trip;
    else list.unshift(trip);
    this.setItem('transport_trips', list);
  }

  getFuelLogs(tenantId?: string): FuelLog[] {
    const list = this.getItem<FuelLog[]>('fuel_logs', INITIAL_FUEL_LOGS);
    return tenantId ? list.filter((f) => f.tenantId === tenantId) : list;
  }

  recordFuelLog(log: FuelLog): void {
    const list = this.getFuelLogs();
    list.unshift(log);
    this.setItem('fuel_logs', list);
  }

  // -------------------------------------------------------------
  // DOCUMENT 59: HOSTEL MANAGEMENT
  // -------------------------------------------------------------
  getHostels(tenantId?: string): Hostel[] {
    const list = this.getItem<Hostel[]>('hostels', INITIAL_HOSTELS);
    return tenantId ? list.filter((h) => h.tenantId === tenantId) : list;
  }

  saveHostel(hostel: Hostel): void {
    const list = this.getHostels();
    const idx = list.findIndex((h) => h.id === hostel.id);
    if (idx >= 0) list[idx] = hostel;
    else list.unshift(hostel);
    this.setItem('hostels', list);
  }

  getHostelRooms(tenantId?: string): HostelRoom[] {
    const list = this.getItem<HostelRoom[]>('hostel_rooms', INITIAL_HOSTEL_ROOMS);
    return tenantId ? list.filter((r) => r.tenantId === tenantId) : list;
  }

  saveHostelRoom(room: HostelRoom): void {
    const list = this.getHostelRooms();
    const idx = list.findIndex((r) => r.id === room.id);
    if (idx >= 0) list[idx] = room;
    else list.unshift(room);
    this.setItem('hostel_rooms', list);
  }

  getHostelBeds(tenantId?: string): HostelBed[] {
    const list = this.getItem<HostelBed[]>('hostel_beds', INITIAL_HOSTEL_BEDS);
    return tenantId ? list.filter((b) => b.tenantId === tenantId) : list;
  }

  saveHostelBed(bed: HostelBed): void {
    const list = this.getHostelBeds();
    const idx = list.findIndex((b) => b.id === bed.id);
    if (idx >= 0) list[idx] = bed;
    else list.unshift(bed);
    this.setItem('hostel_beds', list);
  }

  getHostelAllocations(tenantId?: string): HostelAllocation[] {
    const list = this.getItem<HostelAllocation[]>('hostel_allocations', INITIAL_HOSTEL_ALLOCATIONS);
    return tenantId ? list.filter((a) => a.tenantId === tenantId) : list;
  }

  allocateHostelBed(allocation: HostelAllocation): void {
    const list = this.getHostelAllocations();
    list.unshift(allocation);
    this.setItem('hostel_allocations', list);

    // Update bed status to OCCUPIED
    const beds = this.getHostelBeds();
    const bIdx = beds.findIndex((b) => b.id === allocation.bedId);
    if (bIdx >= 0) {
      beds[bIdx].status = 'OCCUPIED';
      beds[bIdx].studentId = allocation.studentId;
      beds[bIdx].studentName = allocation.studentName;
      this.setItem('hostel_beds', beds);
    }

    // Increment room occupiedBeds
    const rooms = this.getHostelRooms();
    const rIdx = rooms.findIndex((r) => r.id === allocation.roomId);
    if (rIdx >= 0) {
      rooms[rIdx].occupiedBeds = beds.filter((b) => b.roomId === allocation.roomId && b.status === 'OCCUPIED').length;
      this.setItem('hostel_rooms', rooms);
    }
  }

  checkOutHostelBed(allocationId: string): void {
    const list = this.getHostelAllocations();
    const aIdx = list.findIndex((a) => a.id === allocationId);
    if (aIdx < 0) return;

    list[aIdx].status = 'CHECKED_OUT';
    this.setItem('hostel_allocations', list);

    // Free bed
    const beds = this.getHostelBeds();
    const bIdx = beds.findIndex((b) => b.id === list[aIdx].bedId);
    if (bIdx >= 0) {
      beds[bIdx].status = 'VACANT';
      beds[bIdx].studentId = undefined;
      beds[bIdx].studentName = undefined;
      this.setItem('hostel_beds', beds);
    }

    // Decrement room occupiedBeds
    const rooms = this.getHostelRooms();
    const rIdx = rooms.findIndex((r) => r.id === list[aIdx].roomId);
    if (rIdx >= 0) {
      rooms[rIdx].occupiedBeds = Math.max(0, rooms[rIdx].occupiedBeds - 1);
      this.setItem('hostel_rooms', rooms);
    }
  }

  getHostelAttendance(tenantId?: string): HostelAttendanceRecord[] {
    const list = this.getItem<HostelAttendanceRecord[]>('hostel_attendance', INITIAL_HOSTEL_ATTENDANCE);
    return tenantId ? list.filter((a) => a.tenantId === tenantId) : list;
  }

  recordHostelAttendance(records: HostelAttendanceRecord[]): void {
    const list = this.getHostelAttendance();
    records.forEach((rec) => {
      const idx = list.findIndex((a) => a.date === rec.date && a.studentId === rec.studentId);
      if (idx >= 0) list[idx] = rec;
      else list.unshift(rec);
    });
    this.setItem('hostel_attendance', list);
  }

  getGatePasses(tenantId?: string): GatePass[] {
    const list = this.getItem<GatePass[]>('hostel_gate_passes', INITIAL_GATE_PASSES);
    return tenantId ? list.filter((g) => g.tenantId === tenantId) : list;
  }

  saveGatePass(pass: GatePass): void {
    const list = this.getGatePasses();
    const idx = list.findIndex((g) => g.id === pass.id);
    if (idx >= 0) list[idx] = pass;
    else list.unshift(pass);
    this.setItem('hostel_gate_passes', list);
  }

  getHostelComplaints(tenantId?: string): HostelComplaint[] {
    const list = this.getItem<HostelComplaint[]>('hostel_complaints', INITIAL_HOSTEL_COMPLAINTS);
    return tenantId ? list.filter((c) => c.tenantId === tenantId) : list;
  }

  saveHostelComplaint(complaint: HostelComplaint): void {
    const list = this.getHostelComplaints();
    const idx = list.findIndex((c) => c.id === complaint.id);
    if (idx >= 0) list[idx] = complaint;
    else list.unshift(complaint);
    this.setItem('hostel_complaints', list);
  }

  // -------------------------------------------------------------
  // DOCUMENT 60: HOSTEL MESS MANAGEMENT
  // -------------------------------------------------------------
  getHostelMesses(tenantId?: string): HostelMess[] {
    const list = this.getItem<HostelMess[]>('hostel_messes', INITIAL_HOSTEL_MESSES);
    return tenantId ? list.filter((m) => m.tenantId === tenantId) : list;
  }

  saveHostelMess(mess: HostelMess): void {
    const list = this.getHostelMesses();
    const idx = list.findIndex((m) => m.id === mess.id);
    if (idx >= 0) list[idx] = mess;
    else list.unshift(mess);
    this.setItem('hostel_messes', list);
  }

  getMessMealPlans(tenantId?: string): MessMealPlan[] {
    const list = this.getItem<MessMealPlan[]>('mess_meal_plans', INITIAL_MESS_MEAL_PLANS);
    return tenantId ? list.filter((p) => p.tenantId === tenantId) : list;
  }

  saveMessMealPlan(plan: MessMealPlan): void {
    const list = this.getMessMealPlans();
    const idx = list.findIndex((p) => p.id === plan.id);
    if (idx >= 0) list[idx] = plan;
    else list.unshift(plan);
    this.setItem('mess_meal_plans', list);
  }

  getMessSubscriptions(tenantId?: string): StudentMessSubscription[] {
    const list = this.getItem<StudentMessSubscription[]>('mess_subscriptions', INITIAL_MESS_SUBSCRIPTIONS);
    return tenantId ? list.filter((s) => s.tenantId === tenantId) : list;
  }

  saveMessSubscription(sub: StudentMessSubscription): void {
    const list = this.getMessSubscriptions();
    const idx = list.findIndex((s) => s.id === sub.id);
    if (idx >= 0) list[idx] = sub;
    else list.unshift(sub);
    this.setItem('mess_subscriptions', list);
  }

  getMessMenus(tenantId?: string): MessDailyMenu[] {
    const list = this.getItem<MessDailyMenu[]>('mess_daily_menus', INITIAL_MESS_MENUS);
    return tenantId ? list.filter((m) => m.tenantId === tenantId) : list;
  }

  saveMessMenu(menu: MessDailyMenu): void {
    const list = this.getMessMenus();
    const idx = list.findIndex((m) => m.id === menu.id);
    if (idx >= 0) list[idx] = menu;
    else list.unshift(menu);
    this.setItem('mess_daily_menus', list);
  }

  getMealConsumptions(tenantId?: string): MealConsumptionRecord[] {
    const list = this.getItem<MealConsumptionRecord[]>('meal_consumptions', INITIAL_MEAL_CONSUMPTIONS);
    return tenantId ? list.filter((c) => c.tenantId === tenantId) : list;
  }

  recordMealConsumption(record: MealConsumptionRecord): void {
    const list = this.getMealConsumptions();
    const idx = list.findIndex((c) => c.id === record.id);
    if (idx >= 0) list[idx] = record;
    else list.unshift(record);
    this.setItem('meal_consumptions', list);
  }

  getMessFeedback(tenantId?: string): MessFeedback[] {
    const list = this.getItem<MessFeedback[]>('mess_feedback', INITIAL_MESS_FEEDBACK);
    return tenantId ? list.filter((f) => f.tenantId === tenantId) : list;
  }

  saveMessFeedback(feedback: MessFeedback): void {
    const list = this.getMessFeedback();
    list.unshift(feedback);
    this.setItem('mess_feedback', list);
  }

  // -------------------------------------------------------------
  // DOCUMENT 61: HEALTH & MEDICAL MANAGEMENT
  // -------------------------------------------------------------
  getClinics(tenantId?: string): ClinicFacility[] {
    const list = this.getItem<ClinicFacility[]>('clinics', INITIAL_CLINIC_FACILITIES);
    return tenantId ? list.filter((c) => c.tenantId === tenantId) : list;
  }

  saveClinic(clinic: ClinicFacility): void {
    const list = this.getClinics();
    const idx = list.findIndex((c) => c.id === clinic.id);
    if (idx >= 0) list[idx] = clinic;
    else list.unshift(clinic);
    this.setItem('clinics', list);
  }

  getHealthProfiles(tenantId?: string): StudentHealthProfile[] {
    const list = this.getItem<StudentHealthProfile[]>('health_profiles', INITIAL_STUDENT_HEALTH_PROFILES);
    return tenantId ? list.filter((h) => h.tenantId === tenantId) : list;
  }

  saveHealthProfile(profile: StudentHealthProfile): void {
    const list = this.getHealthProfiles();
    const idx = list.findIndex((h) => h.id === profile.id || h.studentId === profile.studentId);
    if (idx >= 0) list[idx] = profile;
    else list.unshift(profile);
    this.setItem('health_profiles', list);
  }

  getStudentAllergies(tenantId?: string): StudentAllergy[] {
    const list = this.getItem<StudentAllergy[]>('student_allergies', INITIAL_STUDENT_ALLERGIES);
    return tenantId ? list.filter((a) => a.tenantId === tenantId) : list;
  }

  saveStudentAllergy(allergy: StudentAllergy): void {
    const list = this.getStudentAllergies();
    const idx = list.findIndex((a) => a.id === allergy.id);
    if (idx >= 0) list[idx] = allergy;
    else list.unshift(allergy);
    this.setItem('student_allergies', list);
  }

  getMedicalVisits(tenantId?: string): MedicalVisit[] {
    const list = this.getItem<MedicalVisit[]>('medical_visits', INITIAL_MEDICAL_VISITS);
    return tenantId ? list.filter((m) => m.tenantId === tenantId) : list;
  }

  saveMedicalVisit(visit: MedicalVisit): void {
    const list = this.getMedicalVisits();
    const idx = list.findIndex((m) => m.id === visit.id);
    if (idx >= 0) list[idx] = visit;
    else list.unshift(visit);
    this.setItem('medical_visits', list);
  }

  getHealthScreenings(tenantId?: string): HealthScreening[] {
    const list = this.getItem<HealthScreening[]>('health_screenings', INITIAL_HEALTH_SCREENINGS);
    return tenantId ? list.filter((s) => s.tenantId === tenantId) : list;
  }

  saveHealthScreening(screening: HealthScreening): void {
    const list = this.getHealthScreenings();
    const idx = list.findIndex((s) => s.id === screening.id);
    if (idx >= 0) list[idx] = screening;
    else list.unshift(screening);
    this.setItem('health_screenings', list);
  }

  getVaccinationRecords(tenantId?: string): VaccinationRecord[] {
    const list = this.getItem<VaccinationRecord[]>('vaccination_records', INITIAL_VACCINATION_RECORDS);
    return tenantId ? list.filter((v) => v.tenantId === tenantId) : list;
  }

  saveVaccinationRecord(record: VaccinationRecord): void {
    const list = this.getVaccinationRecords();
    const idx = list.findIndex((v) => v.id === record.id);
    if (idx >= 0) list[idx] = record;
    else list.unshift(record);
    this.setItem('vaccination_records', list);
  }

  // Reset demo data
  resetAll(): void {
    localStorage.clear();
    window.location.reload();
  }
}

export const storage = new StorageService();
