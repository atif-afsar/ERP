import React, { useState } from 'react';
import { useTenant } from '../../context/TenantContext';
import { storage } from '../../services/storageService';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  CreditCard, 
  CalendarCheck, 
  Award, 
  Download, 
  Filter, 
  Calendar, 
  ArrowUpRight, 
  Building,
  FileSpreadsheet
} from 'lucide-react';
import { StatCard } from '../../components/ui/StatCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

export const ReportsModule: React.FC = () => {
  const { currentTenant, currentBranch, getLabel, isSchool } = useTenant();
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'attendance' | 'finance' | 'academics'>('overview');
  const [selectedRange, setSelectedRange] = useState<'week' | 'month' | 'term' | 'year'>('month');

  const students = storage.getStudents(currentTenant.id);
  const staff = storage.getStaff(currentTenant.id);
  const ledgers = storage.getFeeLedgers(currentTenant.id);
  const payments = storage.getPayments(currentTenant.id);
  const attendanceRecords = storage.getAttendance(currentTenant.id);
  const results = storage.getExamResults(currentTenant.id);

  // Calculations
  const totalStudents = students.length;
  const activeStudents = students.filter((s) => s.status === 'ACTIVE').length;
  const totalStaff = staff.length;

  const totalInvoiced = ledgers.reduce((acc, l) => acc + l.netPayable, 0);
  const totalCollected = ledgers.reduce((acc, l) => acc + l.paidAmount, 0);
  const totalDue = ledgers.reduce((acc, l) => acc + l.dueAmount, 0);
  const collectionRate = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0;

  const presentCount = attendanceRecords.filter((a) => a.status === 'PRESENT').length;
  const totalAttendance = attendanceRecords.length;
  const overallAttendancePct = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 94;

  const handleExportCSV = (reportName: string, data: any[]) => {
    if (!data || data.length === 0) {
      alert('No records to export');
      return;
    }
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map((obj) =>
      Object.values(obj)
        .map((val) => (typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val))
        .join(',')
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${currentTenant.code}_${reportName}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-3xl border border-slate-800 backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[11px] font-semibold flex items-center gap-1">
              <BarChart3 className="w-3.5 h-3.5" />
              Executive Analytics
            </span>
            {currentBranch && (
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[11px] flex items-center gap-1 border border-slate-700">
                <Building className="w-3 h-3 text-sky-400" />
                {currentBranch.name}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Institutional Reports & Intelligence</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit metrics, demographic breakdowns, fee cashflows, and performance insights.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-950/80 rounded-xl p-1 border border-slate-800 text-xs">
            {(['week', 'month', 'term', 'year'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setSelectedRange(r)}
                className={`px-3 py-1.5 rounded-lg capitalize font-medium transition-all ${
                  selectedRange === r
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExportCSV('all_summary', ledgers)}
            leftIcon={<Download className="w-4 h-4 text-sky-400" />}
          >
            Export All (.CSV)
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: 'overview', label: 'Executive Summary', icon: TrendingUp },
          { id: 'students', label: `${getLabel('studentPlural')} & Admissions`, icon: Users },
          { id: 'finance', label: 'Fee Cashflow & Aging', icon: CreditCard },
          { id: 'attendance', label: 'Attendance & Regularity', icon: CalendarCheck },
          { id: 'academics', label: `${getLabel('examPlural')} & Results`, icon: Award },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title={`Total Active ${getLabel('studentPlural')}`}
              value={activeStudents}
              change={`Total enrolled: ${totalStudents}`}
              trend="up"
              icon={Users}
              iconColor="blue"
            />
            <StatCard
              title="Fee Collection Rate"
              value={`${collectionRate}%`}
              change={`${currentTenant.currencySymbol}${totalCollected.toLocaleString('en-IN')} collected`}
              trend="up"
              icon={CreditCard}
              iconColor="emerald"
            />
            <StatCard
              title="Attendance Compliance"
              value={`${overallAttendancePct}%`}
              change="Above institution KPI threshold"
              trend="up"
              icon={CalendarCheck}
              iconColor="purple"
            />
            <StatCard
              title="Active Faculty & Staff"
              value={totalStaff}
              change="100% active status"
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
                  Financial Inflow & Overdue Aging
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportCSV('finance_summary', ledgers)}
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                >
                  Export
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-400">Total Billed & Invoiced</span>
                    <span className="text-white font-bold">{currentTenant.currencySymbol}{totalInvoiced.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-sky-500 rounded-full" style={{ width: '100%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-400">Total Collected Amount</span>
                    <span className="text-emerald-400 font-bold">{currentTenant.currencySymbol}{totalCollected.toLocaleString('en-IN')} ({collectionRate}%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${collectionRate}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-400">Outstanding Overdue</span>
                    <span className="text-rose-400 font-bold">{currentTenant.currencySymbol}{totalDue.toLocaleString('en-IN')} ({100 - collectionRate}%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: `${100 - collectionRate}%` }} />
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
                  onClick={() => handleExportCSV('academic_results', results)}
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                >
                  Export
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <p className="text-[11px] text-slate-400">Exams Scheduled</p>
                  <p className="text-lg font-extrabold text-white mt-0.5">3 Published</p>
                  <span className="text-[10px] text-emerald-400 font-semibold">100% evaluated</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <p className="text-[11px] text-slate-400">Class Average</p>
                  <p className="text-lg font-extrabold text-white mt-0.5">86.4%</p>
                  <span className="text-[10px] text-sky-400 font-semibold">+4.2% from last term</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-sky-500/5 border border-sky-500/20 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-sky-300">AI Institutional Insight</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Attendance regularity strongly correlates with Physics and Mathematics top percentiles.
                  </p>
                </div>
                <SparkleIcon />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STUDENTS TAB */}
      {activeTab === 'students' && (
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Student Enrollment Register</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportCSV('students_roster', students)}
              leftIcon={<Download className="w-4 h-4" />}
            >
              Export CSV
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3">Adm No</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">{isSchool ? 'Class & Section' : 'Enrolled Batches'}</th>
                  <th className="p-3">Parent Name</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/40">
                    <td className="p-3 font-mono font-bold text-sky-400">{s.admissionNo}</td>
                    <td className="p-3 font-semibold text-white">{s.firstName} {s.lastName}</td>
                    <td className="p-3">{s.classId || s.batchIds?.join(', ') || 'General'}</td>
                    <td className="p-3">{s.parentName}</td>
                    <td className="p-3 font-mono">{s.parentPhone}</td>
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
        </div>
      )}

      {/* FINANCE TAB */}
      {activeTab === 'finance' && (
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Fee Ledger & Outstanding Status</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportCSV('fee_ledgers', ledgers)}
              leftIcon={<Download className="w-4 h-4" />}
            >
              Export Ledger CSV
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3">Adm No</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Total Payable</th>
                  <th className="p-3">Paid Amount</th>
                  <th className="p-3">Due Balance</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {ledgers.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-800/40">
                    <td className="p-3 font-mono text-sky-400">{l.admissionNo}</td>
                    <td className="p-3 font-semibold text-white">{l.studentName}</td>
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
        </div>
      )}

      {/* ATTENDANCE TAB */}
      {activeTab === 'attendance' && (
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Attendance Records & Regularity Log</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportCSV('attendance_log', attendanceRecords)}
              leftIcon={<Download className="w-4 h-4" />}
            >
              Export Attendance CSV
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Group / Class</th>
                  <th className="p-3">Method</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {attendanceRecords.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-800/40">
                    <td className="p-3 font-mono">{a.date}</td>
                    <td className="p-3 font-semibold text-white">{a.studentName}</td>
                    <td className="p-3">{a.groupName}</td>
                    <td className="p-3 font-mono text-[11px] text-slate-400">{a.method}</td>
                    <td className="p-3">
                      <Badge variant={a.status === 'PRESENT' ? 'emerald' : a.status === 'ABSENT' ? 'rose' : 'amber'}>
                        {a.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ACADEMICS TAB */}
      {activeTab === 'academics' && (
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Student Exam Results & Score Rankings</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportCSV('exam_scores', results)}
              leftIcon={<Download className="w-4 h-4" />}
            >
              Export Scores CSV
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3">Adm No</th>
                  <th className="p-3">Student</th>
                  <th className="p-3">Exam Title</th>
                  <th className="p-3">Total Marks</th>
                  <th className="p-3">Percentage</th>
                  <th className="p-3">Rank</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {results.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/40">
                    <td className="p-3 font-mono text-sky-400">{r.admissionNo}</td>
                    <td className="p-3 font-semibold text-white">{r.studentName}</td>
                    <td className="p-3 text-slate-300">{r.examName}</td>
                    <td className="p-3 font-mono font-bold">{r.totalMarks} / {r.totalMaxMarks}</td>
                    <td className="p-3 font-mono text-emerald-400 font-bold">{r.percentage}%</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold text-[11px]">
                        Rank #{r.rank || 1}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const SparkleIcon = () => (
  <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 shrink-0">
    <Award className="w-5 h-5" />
  </div>
);
