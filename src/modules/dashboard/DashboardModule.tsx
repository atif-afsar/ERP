import React, { useState } from 'react';
import {
  Users,
  CalendarCheck,
  Calendar,
  CreditCard,
  GraduationCap,
  Sparkles,
  TrendingUp,
  ArrowUpRight,
  UserPlus,
  QrCode,
  Bell,
  Clock,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Award,
  DollarSign,
  Send,
  Building,
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
  const { currentTenant, getLabel, isSchool, isCoaching } = useTenant();
  const { currentUser, isSuperAdmin, isAdmin, isTeacher, isParent, isStudent, activeStudentId } = useAuth();

  // Load live data from storage
  const students = storage.getStudents(currentTenant.id);
  const staff = storage.getStaff(currentTenant.id);
  const feeLedgers = storage.getFeeLedgers(currentTenant.id);
  const attendance = storage.getAttendance(currentTenant.id, new Date().toISOString().split('T')[0]);
  const notices = storage.getNotices(currentTenant.id);
  const exams = storage.getExams(currentTenant.id);
  const timetable = storage.getTimetable(currentTenant.id);
  const homework = storage.getHomework(currentTenant.id);
  const leads = storage.getLeads(currentTenant.id);

  // Financial Stats
  const totalNetPayable = feeLedgers.reduce((acc, l) => acc + l.netPayable, 0);
  const totalPaid = feeLedgers.reduce((acc, l) => acc + l.paidAmount, 0);
  const totalOutstanding = feeLedgers.reduce((acc, l) => acc + l.dueAmount, 0);
  const collectionPercentage = totalNetPayable > 0 ? Math.round((totalPaid / totalNetPayable) * 100) : 0;

  // Attendance Stats
  const presentCount = attendance.filter((a) => a.status === 'PRESENT').length;
  const attendanceRate = students.length > 0 ? Math.round((presentCount / students.length) * 100) : 92;

  // -------------------------------------------------------------
  // 1. SUPER ADMIN DASHBOARD
  // -------------------------------------------------------------
  if (isSuperAdmin) {
    const allTenants = storage.getTenants();
    const allStudents = storage.getAllStudents();
    const activeTenants = allTenants.filter((t) => t.status === 'active').length;

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-600/30 via-slate-900 to-indigo-950/60 p-6 sm:p-8 border border-amber-500/30 shadow-2xl">
          <div className="max-w-2xl space-y-2">
            <Badge variant="amber" dot>Super Admin SaaS Control</Badge>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Platform Master Dashboard
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Real-time multi-tenant health, subscriptions, tenant status, and platform revenue metrics.
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Building className="w-4 h-4" />}
              onClick={() => onNavigate('superadmin-tenants')}
            >
              Manage Tenants
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Sparkles className="w-4 h-4 text-amber-300" />}
              onClick={onOpenAi}
            >
              Platform AI Advisor
            </Button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Active Institutions"
            value={`${activeTenants} / ${allTenants.length}`}
            change="+1 New"
            trend="up"
            icon={Building}
            iconColor="amber"
          />
          <StatCard
            title="Total Students Served"
            value={allStudents.length}
            change="+14% MoM"
            trend="up"
            icon={Users}
            iconColor="blue"
          />
          <StatCard
            title="Monthly Recurring Revenue"
            value="₹2,45,000"
            change="+22.5%"
            trend="up"
            icon={DollarSign}
            iconColor="emerald"
          />
          <StatCard
            title="System Uptime"
            value="99.98%"
            change="All Systems Healthy"
            trend="neutral"
            icon={CheckCircle2}
            iconColor="purple"
          />
        </div>

        {/* Tenant Overview Grid */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Live Institutional Tenants</h3>
            <Button size="sm" variant="outline" onClick={() => onNavigate('superadmin-tenants')}>
              View All Tenants
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allTenants.map((t) => (
              <div
                key={t.id}
                className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start justify-between gap-3 hover:border-slate-700 transition-all"
              >
                <div className="flex items-center gap-3">
                  <img src={t.logo} alt={t.name} className="w-12 h-12 rounded-xl object-cover ring-2 ring-sky-500/20" />
                  <div>
                    <h4 className="font-bold text-white text-sm">{t.name}</h4>
                    <p className="text-xs text-slate-400">{t.planName} • {t.tenantType}</p>
                    <div className="flex items-center gap-2 mt-1.5">
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
    const studentResult = storage.getExamResults(currentTenant.id).find((r) => r.studentId === student?.id);
    const childAttendance = attendance.find((a) => a.studentId === student?.id);

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Child Greeting Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-900/40 via-slate-900 to-indigo-950/60 p-6 sm:p-8 border border-sky-500/20 shadow-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img
                src={student?.photoUrl}
                alt={student?.firstName}
                className="w-16 h-16 rounded-2xl object-cover ring-4 ring-sky-500/30 shadow-lg"
              />
              <div>
                <Badge variant="blue" size="sm" dot>
                  {isSchool ? 'School Parent Portal' : 'Academy Parent Portal'}
                </Badge>
                <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
                  {student?.firstName} {student?.lastName}
                </h2>
                <p className="text-xs text-slate-300">
                  Adm No: <span className="text-sky-400 font-medium">{student?.admissionNo}</span> • Roll No: {student?.rollNo || 'N/A'}
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              leftIcon={<Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />}
              onClick={onOpenAi}
            >
              Ask AI About {student?.firstName}
            </Button>
          </div>
        </div>

        {/* Top 3 Parent Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Attendance Widget */}
          <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase">Today's Attendance</span>
              <CalendarCheck className="w-4 h-4 text-sky-400" />
            </div>
            <div className="flex items-baseline justify-between">
              <h3 className="text-xl font-bold text-white">
                {childAttendance?.status === 'PRESENT' ? 'Present in Campus' : childAttendance?.status || 'Present'}
              </h3>
              <Badge variant="emerald" size="sm">94.2% Attendance</Badge>
            </div>
            <p className="text-xs text-slate-400">
              Verified entry at {childAttendance?.markedAt || '08:15 AM'} via Campus QR Gate
            </p>
          </div>

          {/* Fee Status Widget */}
          <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase">Fee Status</span>
              <CreditCard className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline justify-between">
              <h3 className="text-xl font-bold text-white">
                {studentLedger?.dueAmount && studentLedger.dueAmount > 0
                  ? `₹${studentLedger.dueAmount.toLocaleString()}`
                  : 'All Cleared'}
              </h3>
              <Badge variant={studentLedger?.dueAmount ? 'amber' : 'emerald'} size="sm">
                {studentLedger?.dueAmount ? 'Due Pending' : 'Paid in Full'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Next due: {studentLedger?.dueDate || 'Sep 30'}</span>
              <Button size="sm" variant="success" onClick={() => onNavigate('fees')}>
                Pay Now
              </Button>
            </div>
          </div>

          {/* Academic Result Widget */}
          <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase">Latest Result</span>
              <Award className="w-4 h-4 text-purple-400" />
            </div>
            <div className="flex items-baseline justify-between">
              <h3 className="text-xl font-bold text-white">
                {studentResult?.percentage ? `${studentResult.percentage}%` : '89.75%'}
              </h3>
              <Badge variant="purple" size="sm">
                Rank #{studentResult?.rank || 3}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 truncate">
              {studentResult?.examName || 'Half-Yearly Examination 2026'}
            </p>
          </div>
        </div>

        {/* AI Performance Evaluation & Homework */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AI Student Evaluation Card */}
          <div className="glass-panel p-6 rounded-2xl border border-purple-500/20 bg-gradient-to-b from-purple-950/20 to-slate-900/60 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h3 className="font-bold text-white text-sm">AI Performance Narrative & Guidance</h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-900/80 p-4 rounded-xl border border-slate-800">
              {studentResult?.aiSummary ||
                `${student?.firstName} has shown exemplary analytical skills in core STEM subjects this quarter. Continuing consistency in daily practice will ensure outstanding board performance.`}
            </p>
            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-400">Powered by EduNexus AI Engine</span>
              <Button size="sm" variant="outline" onClick={() => onNavigate('exams')}>
                View Detailed Report Card
              </Button>
            </div>
          </div>

          {/* Assigned Homework / DPP */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">Current Assignments & Homework</h3>
              <Button size="sm" variant="ghost" onClick={() => onNavigate('homework')}>
                View All
              </Button>
            </div>
            <div className="space-y-2.5">
              {homework.slice(0, 2).map((hw) => (
                <div key={hw.id} className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-sky-400">{hw.subject}</span>
                    <span className="text-[11px] text-slate-400">Due: {hw.dueDate}</span>
                  </div>
                  <p className="text-xs text-white font-medium">{hw.title}</p>
                </div>
              ))}
            </div>
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
      <div className="space-y-6 animate-fade-in">
        {/* Teacher Welcome Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-sky-950/40 p-6 sm:p-8 border border-emerald-500/20 shadow-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <Badge variant="emerald" size="sm" dot>
                {isSchool ? 'Teacher Workspace' : 'Faculty Workspace'}
              </Badge>
              <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
                Welcome back, {currentUser.name}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300">
                {currentUser.designation || 'Senior Faculty'} • {currentTenant.name}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="success"
                size="sm"
                leftIcon={<QrCode className="w-4 h-4" />}
                onClick={() => onNavigate('attendance')}
              >
                Scan Student QR
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Assigned Batches/Classes"
            value="3"
            subtitle="76 Total Students"
            icon={GraduationCap}
            iconColor="blue"
          />
          <StatCard
            title="Today's Sessions"
            value="4 Classes"
            subtitle="2 Completed • 2 Upcoming"
            icon={Calendar}
            iconColor="emerald"
          />
          <StatCard
            title="Homework To Grade"
            value="14 Pending"
            subtitle="Physics DPP #18"
            icon={BookOpen}
            iconColor="amber"
          />
        </div>

        {/* Today's Schedule & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="font-bold text-white text-base">Today's Class Schedule</h3>
            <div className="space-y-3">
              {timetable.slice(0, 3).map((slot, idx) => (
                <div
                  key={slot.id}
                  className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="px-3 py-1.5 rounded-lg bg-sky-500/10 text-sky-400 font-bold text-xs border border-sky-500/20">
                      {slot.startTime} - {slot.endTime}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{slot.subject}</h4>
                      <p className="text-xs text-slate-400">{slot.groupName} • {slot.roomNo}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onNavigate('attendance')}
                  >
                    Take Attendance
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="font-bold text-white text-base">Teacher Quick Shortcuts</h3>
            <div className="space-y-2">
              <Button
                variant="secondary"
                className="w-full justify-start text-xs"
                leftIcon={<BookOpen className="w-4 h-4 text-sky-400" />}
                onClick={() => onNavigate('homework')}
              >
                Create Homework / DPP
              </Button>
              <Button
                variant="secondary"
                className="w-full justify-start text-xs"
                leftIcon={<Award className="w-4 h-4 text-purple-400" />}
                onClick={() => onNavigate('exams')}
              >
                Enter Student Marks
              </Button>
              <Button
                variant="secondary"
                className="w-full justify-start text-xs"
                leftIcon={<CalendarCheck className="w-4 h-4 text-emerald-400" />}
                onClick={() => onNavigate('attendance')}
              >
                Launch QR Gate Scanner
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
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-900/40 via-slate-900 to-purple-950/40 p-6 sm:p-8 border border-sky-500/20 shadow-2xl">
          <h2 className="text-2xl font-bold text-white">Student Portal Dashboard</h2>
          <p className="text-xs text-slate-300 mt-1">
            Access your timetable, homework submissions, attendance record, and test analytics.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Attendance Score"
            value="94.2%"
            change="Regular"
            trend="up"
            icon={CalendarCheck}
            iconColor="emerald"
          />
          <StatCard
            title="Current Percentile"
            value="89.75%"
            change="Rank #3"
            trend="up"
            icon={Award}
            iconColor="purple"
          />
          <StatCard
            title="Pending Assignments"
            value="2 Due"
            change="Physics DPP"
            trend="neutral"
            icon={BookOpen}
            iconColor="amber"
          />
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 5. TENANT ADMIN DASHBOARD (DEFAULT)
  // -------------------------------------------------------------
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-900/30 via-slate-900 to-indigo-950/60 p-6 sm:p-8 border border-slate-800 shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant={isSchool ? 'blue' : 'purple'} dot>
                {isSchool ? 'School ERP Control' : 'Coaching ERP Control'}
              </Badge>
              <span className="text-xs text-slate-400 font-medium">Session {currentTenant.academicYear}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {currentTenant.name}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              {currentTenant.tagline || 'Institutional overview of academics, attendance, finance, and admissions.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<QrCode className="w-4 h-4" />}
              onClick={() => onNavigate('attendance')}
            >
              QR Attendance
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<UserPlus className="w-4 h-4" />}
              onClick={() => onNavigate('students')}
            >
              Add {getLabel('student')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Sparkles className="w-4 h-4 text-purple-400" />}
              onClick={onOpenAi}
            >
              AI Assistant
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={`Total ${getLabel('studentPlural')}`}
          value={students.length}
          change="+8 This Month"
          trend="up"
          icon={Users}
          iconColor="blue"
          onClick={() => onNavigate('students')}
        />
        <StatCard
          title="Today's Attendance"
          value={`${attendanceRate}%`}
          change={`${presentCount} Marked Present`}
          trend="up"
          icon={CalendarCheck}
          iconColor="emerald"
          onClick={() => onNavigate('attendance')}
        />
        <StatCard
          title="Fee Collections"
          value={`₹${totalPaid.toLocaleString()}`}
          change={`${collectionPercentage}% Collected`}
          trend="up"
          icon={CreditCard}
          iconColor="amber"
          onClick={() => onNavigate('fees')}
        />
        <StatCard
          title="Active Staff & Faculty"
          value={staff.length}
          change="100% Present"
          trend="neutral"
          icon={GraduationCap}
          iconColor="purple"
          onClick={() => onNavigate('academics')}
        />
      </div>

      {/* Main Operational Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Financial Progress & Recent Notices */}
        <div className="lg:col-span-2 space-y-6">
          {/* Financial Summary Box */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base">Fee Collection & Revenue Health</h3>
                <p className="text-xs text-slate-400">Overview of collected vs outstanding receivables</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => onNavigate('fees')}>
                Manage Fees
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-emerald-400">Collected: ₹{totalPaid.toLocaleString()} ({collectionPercentage}%)</span>
                <span className="text-rose-400">Outstanding: ₹{totalOutstanding.toLocaleString()}</span>
              </div>
              <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden flex">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${collectionPercentage}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                <p className="text-[10px] text-slate-400 uppercase font-medium">Net Invoiced</p>
                <p className="text-sm font-bold text-white">₹{totalNetPayable.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                <p className="text-[10px] text-emerald-400 uppercase font-medium">Cleared Amount</p>
                <p className="text-sm font-bold text-emerald-400">₹{totalPaid.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                <p className="text-[10px] text-rose-400 uppercase font-medium">Pending Dues</p>
                <p className="text-sm font-bold text-rose-400">₹{totalOutstanding.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Announcements / Notices */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Broadcast Announcements</h3>
              <Button size="sm" variant="ghost" onClick={() => onNavigate('communication')}>
                View All
              </Button>
            </div>
            <div className="space-y-3">
              {notices.map((notice) => (
                <div
                  key={notice.id}
                  className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <Badge variant={notice.priority === 'URGENT' ? 'rose' : 'blue'} size="sm">
                      {notice.priority}
                    </Badge>
                    <span className="text-[11px] text-slate-400">{notice.publishedAt}</span>
                  </div>
                  <h4 className="font-bold text-white text-sm">{notice.title}</h4>
                  <p className="text-xs text-slate-300 line-clamp-2">{notice.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Admissions CRM / Quick Launcher */}
        <div className="space-y-6">
          {/* Quick Launchers */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="font-bold text-white text-sm">Quick Operations</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="justify-start text-xs"
                leftIcon={<QrCode className="w-3.5 h-3.5 text-sky-400" />}
                onClick={() => onNavigate('attendance')}
              >
                QR Scanner
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="justify-start text-xs"
                leftIcon={<DollarSign className="w-3.5 h-3.5 text-emerald-400" />}
                onClick={() => onNavigate('fees')}
              >
                Collect Fee
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="justify-start text-xs"
                leftIcon={<Award className="w-3.5 h-3.5 text-purple-400" />}
                onClick={() => onNavigate('exams')}
              >
                {getLabel('exam')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="justify-start text-xs"
                leftIcon={<UserPlus className="w-3.5 h-3.5 text-amber-400" />}
                onClick={() => onNavigate('crm')}
              >
                {isSchool ? 'Admissions' : 'Leads CRM'}
              </Button>
            </div>
          </div>

          {/* CRM Leads Sneak Peek */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">
                {isSchool ? 'Recent Inquiries' : 'Hot Leads Pipeline'}
              </h3>
              <Button size="sm" variant="ghost" onClick={() => onNavigate('crm')}>
                Pipeline
              </Button>
            </div>
            <div className="space-y-2.5">
              {leads.slice(0, 3).map((lead) => (
                <div key={lead.id} className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">{lead.studentName}</span>
                    <Badge variant="purple" size="sm">{lead.status.replace('_', ' ')}</Badge>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">{lead.interestedCourseOrClass}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
