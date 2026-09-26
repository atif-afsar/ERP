import React from 'react';
import {
  Users,
  CalendarCheck,
  Calendar,
  CreditCard,
  GraduationCap,
  Sparkles,
  UserPlus,
  QrCode,
  Bell,
  Clock,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Award,
  DollarSign,
  Building,
  ArrowRight,
  Send,
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storageService';
import { StatCard } from '../../components/ui/StatCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

interface DashboardModuleProps {
  onNavigate: (navId: string) => void;
  onOpenAi: () => void;
}

export const DashboardModule: React.FC<DashboardModuleProps> = ({ onNavigate, onOpenAi }) => {
  const { currentTenant, getLabel, isSchool, currentBranch } = useTenant();
  const { currentUser, isSuperAdmin, isTeacher, isParent, isStudent, activeStudentId } = useAuth();

  // Live storage data
  const students = storage.getStudents(currentTenant.id);
  const staff = storage.getStaff(currentTenant.id);
  const feeLedgers = storage.getFeeLedgers(currentTenant.id);
  const attendance = storage.getAttendance(currentTenant.id, new Date().toISOString().split('T')[0]);
  const notices = storage.getNotices(currentTenant.id);
  const timetable = storage.getTimetable(currentTenant.id);

  // Financial calculations
  const totalNetPayable = feeLedgers.reduce((acc, l) => acc + l.netPayable, 0);
  const totalPaid = feeLedgers.reduce((acc, l) => acc + l.paidAmount, 0);
  const totalOutstanding = feeLedgers.reduce((acc, l) => acc + l.dueAmount, 0);
  const collectionPercentage = totalNetPayable > 0 ? Math.round((totalPaid / totalNetPayable) * 100) : 0;

  // Attendance calculations
  const presentCount = attendance.filter((a) => a.status === 'PRESENT').length;
  const absentCount = students.length > presentCount ? students.length - presentCount : 0;
  const attendanceRate = students.length > 0 ? Math.round((presentCount / students.length) * 100) : 94;

  // -------------------------------------------------------------
  // 1. SUPER ADMIN DASHBOARD
  // -------------------------------------------------------------
  if (isSuperAdmin) {
    const allTenants = storage.getTenants();
    const allStudents = storage.getAllStudents();
    const activeTenants = allTenants.filter((t) => t.status === 'active').length;

    return (
      <div className="space-y-6">
        {/* Executive Header */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="emerald" size="sm">Platform Master</Badge>
              <span className="text-xs text-slate-500 font-medium">Global Cloud Infrastructure</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">Platform Overview</h2>
            <p className="text-xs text-slate-500">Real-time status of all educational institutions and active subscriptions.</p>
          </div>
          <div className="flex items-center gap-2.5">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Building className="w-4 h-4" />}
              onClick={() => onNavigate('superadmin-tenants')}
            >
              Manage Institutions
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Sparkles className="w-4 h-4 text-emerald-600" />}
              onClick={onOpenAi}
            >
              AI Assistant
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Institutions"
            value={allTenants.length}
            change={`${activeTenants} Active`}
            trend="up"
            icon={Building}
            iconColor="emerald"
            onClick={() => onNavigate('superadmin-tenants')}
          />
          <StatCard
            title="Total Enrolled Students"
            value={allStudents.length.toLocaleString()}
            change="+12.4% this year"
            trend="up"
            icon={Users}
            iconColor="blue"
          />
          <StatCard
            title="Platform MRR"
            value="₹4,85,000"
            change="100% Collected"
            trend="up"
            icon={DollarSign}
            iconColor="emerald"
          />
          <StatCard
            title="System Health"
            value="99.98%"
            change="All Systems Operational"
            trend="neutral"
            icon={CheckCircle2}
            iconColor="purple"
          />
        </div>

        {/* Tenants List */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Institutional Tenants</h3>
            <Button size="sm" variant="outline" onClick={() => onNavigate('superadmin-tenants')}>
              View All
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allTenants.map((t) => (
              <div
                key={t.id}
                className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex items-start justify-between gap-3 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <img src={t.logo} alt={t.name} className="w-10 h-10 rounded-lg object-cover border border-slate-200" />
                  <div>
                    <h4 className="font-semibold text-slate-900 text-sm">{t.name}</h4>
                    <p className="text-xs text-slate-500">{t.planName} • {t.tenantType}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={t.status === 'active' ? 'emerald' : 'amber'} size="sm">
                        {t.status.toUpperCase()}
                      </Badge>
                      <span className="text-[11px] text-slate-400">Renews {t.subscriptionRenewalDate}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 2. PARENT PORTAL DASHBOARD
  // -------------------------------------------------------------
  if (isParent) {
    const student = students.find((s) => s.id === activeStudentId) || students[0];
    const studentLedger = feeLedgers.find((l) => l.studentId === student?.id);
    const childAttendance = attendance.find((a) => a.studentId === student?.id);

    return (
      <div className="space-y-6">
        {/* Child Header */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={student?.photoUrl}
              alt={student?.firstName}
              className="w-14 h-14 rounded-xl object-cover border border-slate-200 shadow-2xs"
            />
            <div>
              <Badge variant="blue" size="sm">
                {isSchool ? 'School Parent Portal' : 'Academy Parent Portal'}
              </Badge>
              <h2 className="text-xl font-bold text-slate-900 mt-1">
                {student?.firstName} {student?.lastName}
              </h2>
              <p className="text-xs text-slate-500">
                Admission No: <span className="font-semibold text-slate-800">{student?.admissionNo}</span> • Roll No: {student?.rollNo || '12'}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            leftIcon={<Sparkles className="w-4 h-4 text-emerald-600" />}
            onClick={onOpenAi}
          >
            Ask AI Assistant
          </Button>
        </div>

        {/* 3 Key Metric Cards for Parents */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase">
              <span>Today's Attendance</span>
              <CalendarCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline justify-between">
              <h3 className="text-xl font-bold text-slate-900">
                {childAttendance?.status === 'PRESENT' ? 'Present in Class' : 'Present'}
              </h3>
              <Badge variant="emerald" size="sm">95.4% Rate</Badge>
            </div>
            <p className="text-xs text-slate-500">Checked in at 08:32 AM via campus scanner</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase">
              <span>Fee Dues</span>
              <CreditCard className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline justify-between">
              <h3 className="text-xl font-bold text-slate-900">
                ₹{(studentLedger?.dueAmount || 0).toLocaleString()}
              </h3>
              <Badge variant={studentLedger?.dueAmount ? 'amber' : 'emerald'} size="sm">
                {studentLedger?.dueAmount ? 'Due Pending' : 'Paid in Full'}
              </Badge>
            </div>
            <Button size="sm" variant="primary" className="w-full mt-1 text-xs" onClick={() => onNavigate('fees')}>
              Pay Online Now
            </Button>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase">
              <span>Academic Grade</span>
              <Award className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline justify-between">
              <h3 className="text-xl font-bold text-slate-900">Grade A (88.6%)</h3>
              <Badge variant="purple" size="sm">Rank #4 in Class</Badge>
            </div>
            <Button size="sm" variant="outline" className="w-full mt-1 text-xs" onClick={() => onNavigate('exams')}>
              View Report Card
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 3. TEACHER / FACULTY DASHBOARD
  // -------------------------------------------------------------
  if (isTeacher) {
    return (
      <div className="space-y-6">
        {/* Teacher Header */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="emerald" size="sm">Faculty Desk</Badge>
              <span className="text-xs text-slate-500">{currentTenant.name}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
              Welcome back, {currentUser.name}
            </h2>
            <p className="text-xs text-slate-500">{currentUser.designation || 'Faculty'} • Here is your teaching schedule today.</p>
          </div>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<QrCode className="w-4 h-4" />}
            onClick={() => onNavigate('attendance')}
          >
            Mark QR Attendance
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Assigned Classes"
            value="3 Batches"
            subtitle="76 Total Students"
            icon={GraduationCap}
            iconColor="emerald"
          />
          <StatCard
            title="Today's Sessions"
            value="4 Periods"
            subtitle="2 Completed • 2 Remaining"
            icon={Calendar}
            iconColor="blue"
          />
          <StatCard
            title="Homework To Grade"
            value="14 Submissions"
            subtitle="Physics Assignment #4"
            icon={BookOpen}
            iconColor="amber"
          />
        </div>

        {/* Schedule & Shortcuts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Today's Class Schedule</h3>
            <div className="space-y-2.5">
              {timetable.slice(0, 3).map((slot) => (
                <div
                  key={slot.id}
                  className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 font-bold text-xs border border-emerald-200">
                      {slot.startTime} - {slot.endTime}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{slot.subject}</h4>
                      <p className="text-[11px] text-slate-500">{slot.groupName} • Room: {slot.roomNo}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => onNavigate('attendance')}>
                    Take Attendance
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">Quick Shortcuts</h3>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start text-xs text-slate-700"
                leftIcon={<BookOpen className="w-4 h-4 text-emerald-600" />}
                onClick={() => onNavigate('homework')}
              >
                Create Homework & Notes
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-xs text-slate-700"
                leftIcon={<Award className="w-4 h-4 text-purple-600" />}
                onClick={() => onNavigate('exams')}
              >
                Enter Examination Marks
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-xs text-slate-700"
                leftIcon={<CalendarCheck className="w-4 h-4 text-emerald-600" />}
                onClick={() => onNavigate('attendance')}
              >
                Subject-wise Attendance
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 4. STUDENT DASHBOARD
  // -------------------------------------------------------------
  if (isStudent) {
    const student = students[0];
    const studentLedger = feeLedgers.find((l) => l.studentId === student?.id);

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={student?.photoUrl}
              alt={student?.firstName}
              className="w-14 h-14 rounded-xl object-cover border border-slate-200"
            />
            <div>
              <Badge variant="emerald" size="sm">Student Portal</Badge>
              <h2 className="text-xl font-bold text-slate-900 mt-1">Hello, {student?.firstName || 'Student'}!</h2>
              <p className="text-xs text-slate-500">Admission No: {student?.admissionNo} • Roll No: {student?.rollNo || '12'}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" leftIcon={<QrCode className="w-4 h-4" />} onClick={() => onNavigate('attendance')}>
            View My Digital ID Card
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="My Attendance"
            value="96.2%"
            subtitle="142 Days Present"
            icon={CalendarCheck}
            iconColor="emerald"
          />
          <StatCard
            title="Fee Due"
            value={`₹${(studentLedger?.dueAmount || 0).toLocaleString()}`}
            subtitle="Term 2 Due"
            icon={CreditCard}
            iconColor={studentLedger?.dueAmount ? 'amber' : 'emerald'}
          />
          <StatCard
            title="Next Exam"
            value="Mathematics"
            subtitle="Starts Monday 09:00 AM"
            icon={Award}
            iconColor="blue"
          />
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 5. CANONICAL INSTITUTIONAL DASHBOARD (Sections 19–31)
  // (Principal, Administrator, Director, Accountant)
  // -------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* 20. DASHBOARD HEADER - Clean, Non-Hero Greeting */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              {currentBranch?.name || 'Main Campus'}
            </span>
            <span className="text-xs text-slate-500 font-medium">Session 2026–27</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            Good morning, {currentUser.name}
          </h2>
          <p className="text-xs text-slate-500">
            Here's today's operational overview at {currentTenant.name}.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<UserPlus className="w-4 h-4" />}
            onClick={() => onNavigate('students')}
          >
            + Add {getLabel('student')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<CalendarCheck className="w-4 h-4" />}
            onClick={() => onNavigate('attendance')}
          >
            Take Attendance
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<CreditCard className="w-4 h-4" />}
            onClick={() => onNavigate('fees')}
          >
            Collect Fee
          </Button>
        </div>
      </div>

      {/* 21. KPI CARDS (White, Clean, Indian Numbering) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={`Total ${getLabel('studentPlural')}`}
          value={students.length.toLocaleString('en-IN')}
          change="+8.4% this month"
          trend="up"
          icon={Users}
          iconColor="emerald"
          onClick={() => onNavigate('students')}
        />
        <StatCard
          title="Today's Attendance"
          value={`${attendanceRate}%`}
          change={`${presentCount} Present • ${absentCount} Absent`}
          trend="up"
          icon={CalendarCheck}
          iconColor="blue"
          onClick={() => onNavigate('attendance')}
        />
        <StatCard
          title="Fee Collection"
          value={`₹${(totalPaid / 100000).toFixed(1)}L`}
          change={`${collectionPercentage}% Collected`}
          trend="up"
          icon={CreditCard}
          iconColor="emerald"
          onClick={() => onNavigate('fees')}
        />
        <StatCard
          title="Active Staff"
          value={staff.length}
          change="100% On Duty"
          trend="neutral"
          icon={GraduationCap}
          iconColor="purple"
          onClick={() => onNavigate('academics')}
        />
      </div>

      {/* Main Content Grid: Fee Overview & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 26. Fee Collection Card */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Fee Collection Overview</h3>
              <p className="text-xs text-slate-500">Collected vs outstanding dues for current session</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => onNavigate('fees')}>
              View Fees
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-emerald-700">Collected: ₹{totalPaid.toLocaleString('en-IN')} ({collectionPercentage}%)</span>
              <span className="text-slate-600">Outstanding: ₹{totalOutstanding.toLocaleString('en-IN')}</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${collectionPercentage}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Total Net Invoiced</p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">₹{totalNetPayable.toLocaleString('en-IN')}</p>
            </div>
            <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-200">
              <p className="text-[11px] text-emerald-800 font-medium uppercase tracking-wider">Collected Revenue</p>
              <p className="text-sm font-bold text-emerald-800 mt-0.5">₹{totalPaid.toLocaleString('en-IN')}</p>
            </div>
            <div className="p-3 bg-rose-50/60 rounded-lg border border-rose-200">
              <p className="text-[11px] text-rose-800 font-medium uppercase tracking-wider">Outstanding Dues</p>
              <p className="text-sm font-bold text-rose-800 mt-0.5">₹{totalOutstanding.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>

        {/* 27. Quick Actions Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onNavigate('students')}
              className="p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 text-left transition-colors group"
            >
              <UserPlus className="w-4 h-4 text-emerald-600 mb-1.5" />
              <p className="text-xs font-semibold text-slate-800 group-hover:text-emerald-800">Add Student</p>
              <p className="text-[10px] text-slate-500">Admissions</p>
            </button>

            <button
              onClick={() => onNavigate('attendance')}
              className="p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 text-left transition-colors group"
            >
              <CalendarCheck className="w-4 h-4 text-emerald-600 mb-1.5" />
              <p className="text-xs font-semibold text-slate-800 group-hover:text-emerald-800">Take Attendance</p>
              <p className="text-[10px] text-slate-500">Daily Register</p>
            </button>

            <button
              onClick={() => onNavigate('fees')}
              className="p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 text-left transition-colors group"
            >
              <CreditCard className="w-4 h-4 text-emerald-600 mb-1.5" />
              <p className="text-xs font-semibold text-slate-800 group-hover:text-emerald-800">Collect Fee</p>
              <p className="text-[10px] text-slate-500">Issue Receipt</p>
            </button>

            <button
              onClick={() => onNavigate('homework')}
              className="p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 text-left transition-colors group"
            >
              <BookOpen className="w-4 h-4 text-emerald-600 mb-1.5" />
              <p className="text-xs font-semibold text-slate-800 group-hover:text-emerald-800">Create Homework</p>
              <p className="text-[10px] text-slate-500">Assignments</p>
            </button>

            <button
              onClick={() => onNavigate('exams')}
              className="p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 text-left transition-colors group"
            >
              <Award className="w-4 h-4 text-emerald-600 mb-1.5" />
              <p className="text-xs font-semibold text-slate-800 group-hover:text-emerald-800">Create Exam</p>
              <p className="text-[10px] text-slate-500">Assessments</p>
            </button>

            <button
              onClick={() => onNavigate('communication')}
              className="p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 text-left transition-colors group"
            >
              <Send className="w-4 h-4 text-emerald-600 mb-1.5" />
              <p className="text-xs font-semibold text-slate-800 group-hover:text-emerald-800">Announcement</p>
              <p className="text-[10px] text-slate-500">Broadcast Notice</p>
            </button>
          </div>
        </div>
      </div>

      {/* Lower Grid: Attention Required & Today's Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 30. Attention Required Alerts */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <h3 className="font-bold text-slate-900 text-sm">Attention Required</h3>
          <div className="space-y-2.5">
            <div
              onClick={() => onNavigate('fees')}
              className="p-3 rounded-lg bg-amber-50/70 border border-amber-200 cursor-pointer flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="font-medium text-slate-800">3 students have overdue fees</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-amber-600" />
            </div>

            <div
              onClick={() => onNavigate('attendance')}
              className="p-3 rounded-lg bg-rose-50/70 border border-rose-200 cursor-pointer flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2.5">
                <CalendarCheck className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-medium text-slate-800">{absentCount} students absent today</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-rose-600" />
            </div>

            <div
              onClick={() => onNavigate('academics')}
              className="p-3 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="font-medium text-slate-800">Class 10-A Timetable update pending</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            </div>
          </div>
        </div>

        {/* 29. Today's Schedule */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Today's Schedule</h3>
            <span className="text-[11px] text-slate-500 font-medium">Period 1 to 4</span>
          </div>
          <div className="space-y-2">
            {timetable.slice(0, 3).map((slot) => (
              <div key={slot.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-slate-900">{slot.subject}</p>
                  <p className="text-[11px] text-slate-500">{slot.groupName} • Room {slot.roomNo}</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {slot.startTime}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 28. Recent Activity */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Recent Activity</h3>
            <span className="text-[11px] text-slate-500 font-medium">Today</span>
          </div>
          <div className="space-y-2.5 text-xs">
            <div className="flex items-start gap-2.5 pb-2 border-b border-slate-100">
              <span className="text-[11px] text-slate-400 font-medium shrink-0 mt-0.5">10:42 AM</span>
              <div>
                <p className="font-medium text-slate-800">Fee payment received</p>
                <p className="text-[11px] text-emerald-700 font-semibold">₹12,000 from Rahul Sharma</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 pb-2 border-b border-slate-100">
              <span className="text-[11px] text-slate-400 font-medium shrink-0 mt-0.5">10:20 AM</span>
              <div>
                <p className="font-medium text-slate-800">New student admitted</p>
                <p className="text-[11px] text-slate-600">Aarav Singh (Class 10-A)</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-[11px] text-slate-400 font-medium shrink-0 mt-0.5">09:50 AM</span>
              <div>
                <p className="font-medium text-slate-800">Attendance completed</p>
                <p className="text-[11px] text-slate-600">Class 10-A (38/40 Present)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
