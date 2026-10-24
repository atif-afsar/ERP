import React, { useState, useEffect, useCallback } from 'react';
import { useTenant } from '../../context/TenantContext';
import { reportsService } from '../../services/reportsService';
import { useAuth } from '../../context/AuthContext';
import { FinancialYearPayments } from './FinancialYearPayments';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  CreditCard, 
  CalendarCheck, 
  Award, 
  Download, 
  Calendar, 
  Building,
  RefreshCw,
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';
import { StatCard } from '../../components/ui/StatCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

export const ReportsModule: React.FC = () => {
  const { currentTenant, getLabel, isSchool } = useTenant();
  const { can } = useAuth();
  const canSeePayments = can('fee_reports.view');
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'attendance' | 'finance' | 'payments' | 'academics'>('overview');
  const [selectedRange, setSelectedRange] = useState<'week' | 'month' | 'term' | 'year'>('month');

  // Loading & Error States
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Authoritative State from VPS PostgreSQL
  const [overview, setOverview] = useState<any>({
    students: { total: 0, active: 0 },
    staff: { total: 0, active: 0 },
    finance: { totalAssigned: 0, totalCollected: 0, totalOutstanding: 0, collectionRate: 0 },
    attendance: { totalEntries: 0, presentCount: 0, absentCount: 0, overallPercentage: 100 },
    academics: { totalExams: 0, publishedExams: 0 },
  });

  const [students, setStudents] = useState<any[]>([]);
  const [attendanceReport, setAttendanceReport] = useState<{ summary: any; records: any[] }>({
    summary: { totalEntries: 0, presentCount: 0, absentCount: 0, attendancePercentage: 100 },
    records: [],
  });
  const [feeReport, setFeeReport] = useState<{ summary: any; monthly: any[]; ledgers: any[] }>({
    summary: { totalAssigned: 0, totalCollected: 0, totalOutstanding: 0, collectionRate: 0, overdueCount: 0 },
    monthly: [],
    ledgers: [],
  });
  const [examReport, setExamReport] = useState<{ exams: any[]; selectedExam: any; results: any[] }>({
    exams: [],
    selectedExam: null,
    results: [],
  });

  // Filters
  const [attendanceFilters, setAttendanceFilters] = useState<{ startDate: string; endDate: string }>({
    startDate: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
  });
  const [selectedExamId, setSelectedExamId] = useState<string>('');

  // 1. Load Overview Metrics
  const loadOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await reportsService.getOverview(currentTenant.id);
      setOverview(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch executive reports overview.');
    } finally {
      setLoading(false);
    }
  }, [currentTenant.id]);

  // 2. Load Active Tab Data
  const loadTabData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      if (activeTab === 'overview') {
        const data = await reportsService.getOverview(currentTenant.id);
        setOverview(data);
      } else if (activeTab === 'students') {
        const data = await reportsService.getStudents(currentTenant.id);
        setStudents(data);
      } else if (activeTab === 'attendance') {
        const data = await reportsService.getAttendance(currentTenant.id, attendanceFilters);
        setAttendanceReport(data);
      } else if (activeTab === 'finance') {
        const data = await reportsService.getFees(currentTenant.id);
        setFeeReport(data);
      } else if (activeTab === 'academics') {
        const data = await reportsService.getExams(currentTenant.id, selectedExamId ? { examId: selectedExamId } : undefined);
        setExamReport(data);
        if (data.selectedExam && !selectedExamId) {
          setSelectedExamId(data.selectedExam.id);
        }
      }
    } catch (err: any) {
      setError(err.message || `Failed to load ${activeTab} report data.`);
    } finally {
      setLoading(false);
    }
  }, [activeTab, currentTenant.id, attendanceFilters, selectedExamId]);

  useEffect(() => {
    loadTabData();
  }, [loadTabData]);

  // Handle Real Server-Side CSV Export with formula injection protection
  const handleExport = async (type: 'all' | 'students' | 'attendance' | 'finance' | 'academics') => {
    try {
      setExporting(true);
      if (type === 'all' || type === 'finance') {
        await reportsService.downloadFeesCsv(currentTenant.id);
      } else if (type === 'students') {
        await reportsService.downloadStudentsCsv(currentTenant.id);
      } else if (type === 'attendance') {
        await reportsService.downloadAttendanceCsv(currentTenant.id, attendanceFilters);
      } else if (type === 'academics') {
        await reportsService.downloadExamsCsv(currentTenant.id, selectedExamId ? { examId: selectedExamId } : undefined);
      }
    } catch (err: any) {
      alert(`Export failed: ${err.message || 'Network error'}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-3xl border border-slate-800 backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[11px] font-semibold flex items-center gap-1">
              <BarChart3 className="w-3.5 h-3.5" />
              Authoritative PostgreSQL Analytics
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Institutional Reports & Intelligence</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit metrics, demographic breakdowns, fee cashflows, and performance insights backed by PostgreSQL.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={loadTabData}
            disabled={loading}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => handleExport(activeTab === 'overview' ? 'all' : (activeTab as any))}
            disabled={exporting || loading}
            leftIcon={<Download className="w-4 h-4 text-white" />}
          >
            {exporting ? 'Generating CSV...' : 'Export (.CSV)'}
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between text-rose-300 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
          <button 
            onClick={loadTabData} 
            className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 rounded-lg font-semibold transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: 'overview', label: 'Executive Summary', icon: TrendingUp },
          { id: 'students', label: `${getLabel('studentPlural')} & Admissions`, icon: Users },
          { id: 'finance', label: 'Fee Cashflow & Aging', icon: CreditCard },
          ...(canSeePayments ? [{ id: 'payments', label: 'Payments by Financial Year', icon: Calendar }] : []),
          { id: 'attendance', label: 'Attendance & Regularity', icon: CalendarCheck },
          { id: 'academics', label: `${getLabel('examPlural')} & Results`, icon: Award },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              data-tab={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30 shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Loading Skeleton */}
      {loading && activeTab !== 'payments' && (
        <div className="p-12 text-center rounded-3xl bg-slate-900/40 border border-slate-800">
          <RefreshCw className="w-8 h-8 animate-spin text-sky-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-300">Loading authoritative report metrics...</p>
          <p className="text-xs text-slate-500 mt-1">Aggregating database-backed records and financial journals.</p>
        </div>
      )}

      {/* OVERVIEW TAB */}
      {!loading && activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title={`Total Active ${getLabel('studentPlural')}`}
              value={overview.students?.active || 0}
              change={`Total registered: ${overview.students?.total || 0}`}
              trend="up"
              icon={Users}
              iconColor="blue"
            />
            <StatCard
              title="Fee Collection Rate"
              value={`${overview.finance?.collectionRate || 0}%`}
              change={`${currentTenant.currencySymbol}${Number(overview.finance?.totalCollected || 0).toLocaleString('en-IN')} collected`}
              trend="up"
              icon={CreditCard}
              iconColor="emerald"
            />
            <StatCard
              title="Attendance Regularity"
              value={`${overview.attendance?.overallPercentage || 100}%`}
              change={`${overview.attendance?.presentCount || 0} presents out of ${overview.attendance?.totalEntries || 0}`}
              trend="up"
              icon={CalendarCheck}
              iconColor="purple"
            />
            <StatCard
              title="Active Staff Members"
              value={overview.staff?.active || 0}
              change={`Total staff: ${overview.staff?.total || 0}`}
              trend="neutral"
              icon={Building}
              iconColor="amber"
            />
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Financial Health Summary */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  Financial Inflow & Outstanding Status
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('finance')}
                  disabled={exporting}
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                >
                  Export
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-400">Total Billed & Invoiced</span>
                    <span className="text-white font-bold">{currentTenant.currencySymbol}{Number(overview.finance?.totalAssigned || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-sky-500 rounded-full" style={{ width: '100%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-400">Total Verified Collections</span>
                    <span className="text-emerald-400 font-bold">
                      {currentTenant.currencySymbol}{Number(overview.finance?.totalCollected || 0).toLocaleString('en-IN')} ({overview.finance?.collectionRate || 0}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(overview.finance?.collectionRate || 0, 100)}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-400">Total Outstanding Balance</span>
                    <span className="text-rose-400 font-bold">
                      {currentTenant.currencySymbol}{Number(overview.finance?.totalOutstanding || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-rose-500 rounded-full" 
                      style={{ width: `${Math.min(100 - (overview.finance?.collectionRate || 0), 100)}%` }} 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Academic & Attendance Summary */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-purple-400" />
                  Academic Excellence & Attendance
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('academics')}
                  disabled={exporting}
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                >
                  Export
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <p className="text-[11px] text-slate-400">Published Examinations</p>
                  <p className="text-lg font-extrabold text-white mt-0.5">{overview.academics?.publishedExams || 0} Published</p>
                  <span className="text-[10px] text-emerald-400 font-semibold">{overview.academics?.totalExams || 0} total cycles</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <p className="text-[11px] text-slate-400">Attendance Compliance</p>
                  <p className="text-lg font-extrabold text-white mt-0.5">{overview.attendance?.overallPercentage || 100}%</p>
                  <span className="text-[10px] text-sky-400 font-semibold">{overview.attendance?.presentCount || 0} marks verified</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-sky-500/5 border border-sky-500/20 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-sky-300">Audited Compliance Status</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Data directly reconciled from active PostgreSQL ledger entries and academic tables.
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 shrink-0">
                  <Award className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STUDENTS TAB */}
      {!loading && activeTab === 'students' && (
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white">Student Enrollment Register</h3>
              <p className="text-xs text-slate-400">Authoritative roster with current placements and guardian contacts.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('students')}
              disabled={exporting || students.length === 0}
              leftIcon={<Download className="w-4 h-4" />}
            >
              Export Students CSV
            </Button>
          </div>

          {students.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl">
              <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-300">No student enrollments found</p>
              <p className="text-xs text-slate-500 mt-1">Students admitted through the lifecycle module will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3">Adm No</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">{isSchool ? 'Class & Section' : 'Enrolled Batches'}</th>
                    <th className="p-3">Roll No</th>
                    <th className="p-3">Parent Name</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {students.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-mono font-bold text-sky-400">{s.admissionNo}</td>
                      <td className="p-3 font-semibold text-white">{s.studentName}</td>
                      <td className="p-3">{s.className} {s.sectionName}</td>
                      <td className="p-3 font-mono">{s.rollNo || '-'}</td>
                      <td className="p-3">{s.parentName || '-'}</td>
                      <td className="p-3 font-mono">{s.parentPhone || '-'}</td>
                      <td className="p-3">
                        <Badge variant={s.status === 'ACTIVE' ? 'emerald' : 'slate'}>
                          {s.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* FINANCE TAB */}
      {activeTab === 'payments' && canSeePayments && (
        <FinancialYearPayments tenantId={currentTenant.id} currency={currentTenant.currencySymbol || '₹'} />
      )}

      {!loading && activeTab === 'finance' && (
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white">Fee Ledger & Outstanding Status</h3>
              <p className="text-xs text-slate-400">Enrollment-linked receivables reconciled with accounting journal entries.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('finance')}
              disabled={exporting || feeReport.ledgers.length === 0}
              leftIcon={<Download className="w-4 h-4" />}
            >
              Export Fee Ledger CSV
            </Button>
          </div>

          {/* Fee KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Total Assigned</span>
              <p className="text-base font-bold text-white mt-1">
                {currentTenant.currencySymbol}{Number(feeReport.summary?.totalAssigned || 0).toLocaleString('en-IN')}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-emerald-400 uppercase font-bold">Collected</span>
              <p className="text-base font-bold text-emerald-400 mt-1">
                {currentTenant.currencySymbol}{Number(feeReport.summary?.totalCollected || 0).toLocaleString('en-IN')}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-rose-400 uppercase font-bold">Outstanding</span>
              <p className="text-base font-bold text-rose-400 mt-1">
                {currentTenant.currencySymbol}{Number(feeReport.summary?.totalOutstanding || 0).toLocaleString('en-IN')}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-sky-400 uppercase font-bold">Collection Rate</span>
              <p className="text-base font-bold text-sky-400 mt-1">
                {feeReport.summary?.collectionRate || 0}%
              </p>
            </div>
          </div>

          {feeReport.ledgers.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl">
              <CreditCard className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-300">No fee assignments recorded</p>
              <p className="text-xs text-slate-500 mt-1">Fees assigned to students will appear in this ledger.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3">Adm No</th>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Fee Structure</th>
                    <th className="p-3">Total Payable</th>
                    <th className="p-3">Paid Amount</th>
                    <th className="p-3">Due Balance</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {feeReport.ledgers.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-mono text-sky-400">{l.admissionNo}</td>
                      <td className="p-3 font-semibold text-white">{l.studentName}</td>
                      <td className="p-3 text-slate-400">{l.structureName}</td>
                      <td className="p-3 font-mono">{currentTenant.currencySymbol}{l.netPayable.toLocaleString('en-IN')}</td>
                      <td className="p-3 font-mono text-emerald-400">{currentTenant.currencySymbol}{l.paidAmount.toLocaleString('en-IN')}</td>
                      <td className="p-3 font-mono text-rose-400 font-bold">{currentTenant.currencySymbol}{l.dueAmount.toLocaleString('en-IN')}</td>
                      <td className="p-3">
                        <Badge variant={l.status === 'PAID' ? 'emerald' : l.status === 'OVERDUE' ? 'rose' : 'amber'}>
                          {l.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ATTENDANCE TAB */}
      {!loading && activeTab === 'attendance' && (
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white">Attendance Records & Compliance Log</h3>
              <p className="text-xs text-slate-400">Class and date-filtered regularity tracking backed by verification logs.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('attendance')}
                disabled={exporting || attendanceReport.records.length === 0}
                leftIcon={<Download className="w-4 h-4" />}
              >
                Export Attendance CSV
              </Button>
            </div>
          </div>

          {/* Attendance KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Total Entries</span>
              <p className="text-base font-bold text-white mt-1">
                {attendanceReport.summary?.totalEntries || 0}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-emerald-400 uppercase font-bold">Present Count</span>
              <p className="text-base font-bold text-emerald-400 mt-1">
                {attendanceReport.summary?.presentCount || 0}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-rose-400 uppercase font-bold">Absent Count</span>
              <p className="text-base font-bold text-rose-400 mt-1">
                {attendanceReport.summary?.absentCount || 0}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-purple-400 uppercase font-bold">Compliance Rate</span>
              <p className="text-base font-bold text-purple-400 mt-1">
                {attendanceReport.summary?.attendancePercentage || 100}%
              </p>
            </div>
          </div>

          {attendanceReport.records.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl">
              <CalendarCheck className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-300">No attendance records found for this period</p>
              <p className="text-xs text-slate-500 mt-1">Recorded daily sessions will be summarized here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Adm No</th>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Class & Section</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {attendanceReport.records.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-mono">{a.date}</td>
                      <td className="p-3 font-mono text-sky-400">{a.admissionNo}</td>
                      <td className="p-3 font-semibold text-white">{a.studentName}</td>
                      <td className="p-3">{a.groupName}</td>
                      <td className="p-3">
                        <Badge variant={a.status === 'PRESENT' ? 'emerald' : a.status === 'ABSENT' ? 'rose' : 'amber'}>
                          {a.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-slate-400">{a.remarks || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ACADEMICS TAB */}
      {!loading && activeTab === 'academics' && (
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white">Published Examination Results & Broadsheet</h3>
              <p className="text-xs text-slate-400">Officially published assessments with grade rankings.</p>
            </div>

            <div className="flex items-center gap-2">
              {examReport.exams.length > 0 && (
                <select
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  className="bg-slate-950 text-xs text-white border border-slate-800 rounded-xl px-3 py-1.5 focus:outline-hidden focus:border-sky-500"
                >
                  {examReport.exams.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.name} ({ex.class_name} · {ex.term})
                    </option>
                  ))}
                </select>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('academics')}
                disabled={exporting || examReport.results.length === 0}
                leftIcon={<Download className="w-4 h-4" />}
              >
                Export Broadsheet CSV
              </Button>
            </div>
          </div>

          {examReport.results.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl">
              <Award className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-300">No published examination results available</p>
              <p className="text-xs text-slate-500 mt-1">Results published by the academic administrator will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3">Adm No</th>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Exam Title</th>
                    <th className="p-3">Marks Obtained</th>
                    <th className="p-3">Percentage</th>
                    <th className="p-3">Grade</th>
                    <th className="p-3">Rank</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {examReport.results.map((r) => (
                    <tr key={r.enrollmentId} className="hover:bg-slate-800/40">
                      <td className="p-3 font-mono text-sky-400">{r.admissionNo}</td>
                      <td className="p-3 font-semibold text-white">{r.studentName}</td>
                      <td className="p-3 text-slate-300">{r.examName}</td>
                      <td className="p-3 font-mono font-bold">{r.totalMarks} / {r.totalMaxMarks}</td>
                      <td className="p-3 font-mono text-emerald-400 font-bold">{r.percentage}%</td>
                      <td className="p-3 font-bold text-sky-400">{r.grade}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold text-[11px]">
                          Rank #{r.rank}
                        </span>
                      </td>
                      <td className="p-3">
                        <Badge variant={r.status === 'PASSED' ? 'emerald' : 'rose'}>
                          {r.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
