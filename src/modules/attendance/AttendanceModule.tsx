import React, { useState } from 'react';
import {
  CalendarCheck,
  QrCode,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Sparkles,
  Search,
  UserCheck,
  Save,
  Send,
  Camera,
  Play,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { storage } from '../../services/storageService';
import { AttendanceRecord, AttendanceStatus, Student } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Tabs } from '../../components/ui/Tabs';

export const AttendanceModule: React.FC = () => {
  const { currentTenant, getLabel, isSchool, isCoaching } = useTenant();
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [activeTab, setActiveTab] = useState<'manual' | 'qr'>('manual');
  
  const students = storage.getStudents(currentTenant.id);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() =>
    storage.getAttendance(currentTenant.id, selectedDate)
  );

  // Status mapping
  const getStudentStatus = (studentId: string): AttendanceStatus => {
    const record = attendanceRecords.find((a) => a.studentId === studentId && a.date === selectedDate);
    return record?.status || 'PRESENT';
  };

  const handleStatusChange = (student: Student, newStatus: AttendanceStatus) => {
    const updated: AttendanceRecord = {
      id: `att-${student.id}-${selectedDate}`,
      tenantId: currentTenant.id,
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      groupId: isSchool ? student.classId || 'class-10-a' : student.batchIds?.[0] || 'batch-jee-alpha',
      groupName: isSchool ? 'Class 10 - Section A' : 'JEE Alpha 2027',
      date: selectedDate,
      status: newStatus,
      markedBy: 'Admin / Faculty',
      markedAt: new Date().toLocaleTimeString(),
      method: 'MANUAL',
    };

    storage.markAttendance([updated]);
    setAttendanceRecords(storage.getAttendance(currentTenant.id, selectedDate));
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    const records: AttendanceRecord[] = students.map((stu) => ({
      id: `att-${stu.id}-${selectedDate}`,
      tenantId: currentTenant.id,
      studentId: stu.id,
      studentName: `${stu.firstName} ${stu.lastName}`,
      groupId: isSchool ? stu.classId || 'class-10-a' : stu.batchIds?.[0] || 'batch-jee-alpha',
      groupName: isSchool ? 'Class 10 - Section A' : 'JEE Alpha 2027',
      date: selectedDate,
      status,
      markedBy: 'Batch Punch',
      markedAt: new Date().toLocaleTimeString(),
      method: 'MANUAL',
    }));

    storage.markAttendance(records);
    setAttendanceRecords(records);
  };

  // QR Scanner Simulation State
  const [scannedStudent, setScannedStudent] = useState<Student | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [autoNotifyWhatsApp, setAutoNotifyWhatsApp] = useState(true);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  const handleSimulateScan = (stu: Student) => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setScannedStudent(stu);

      const record: AttendanceRecord = {
        id: `att-${stu.id}-${selectedDate}`,
        tenantId: currentTenant.id,
        studentId: stu.id,
        studentName: `${stu.firstName} ${stu.lastName}`,
        groupId: isSchool ? stu.classId || 'class-10-a' : stu.batchIds?.[0] || 'batch-jee-alpha',
        groupName: isSchool ? 'Class 10 - Section A' : 'JEE Alpha 2027',
        date: selectedDate,
        status: 'PRESENT',
        markedBy: 'Smart QR Gate Scanner',
        markedAt: new Date().toLocaleTimeString(),
        method: 'QR_SCAN',
      };

      storage.markAttendance([record]);
      setAttendanceRecords(storage.getAttendance(currentTenant.id, selectedDate));

      setScanMessage(
        `✅ Verified: ${stu.firstName} ${stu.lastName} marked PRESENT at ${record.markedAt}${
          autoNotifyWhatsApp ? ' • WhatsApp alert dispatched to parent' : ''
        }`
      );
    }, 600);
  };

  // Statistics
  const presentCount = students.filter((s) => getStudentStatus(s.id) === 'PRESENT').length;
  const absentCount = students.filter((s) => getStudentStatus(s.id) === 'ABSENT').length;
  const lateCount = students.filter((s) => getStudentStatus(s.id) === 'LATE').length;
  const attendanceRate = students.length > 0 ? Math.round((presentCount / students.length) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Module Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Attendance & QR Management
          </h2>
          <p className="text-xs text-slate-400">
            Daily roll call, QR Gate scanner, and instant parent notifications.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'manual', label: '📋 Roll Call Sheet' },
          { id: 'qr', label: '⚡ Live Smart QR Scanner' },
        ]}
        activeTab={activeTab}
        onChange={(t) => setActiveTab(t as any)}
      />

      {/* Summary KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <p className="text-[11px] text-slate-400 font-medium uppercase">Attendance Rate</p>
          <h3 className="text-2xl font-bold text-sky-400 mt-1">{attendanceRate}%</h3>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <p className="text-[11px] text-emerald-400 font-medium uppercase">Present</p>
          <h3 className="text-2xl font-bold text-emerald-400 mt-1">{presentCount}</h3>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <p className="text-[11px] text-rose-400 font-medium uppercase">Absent</p>
          <h3 className="text-2xl font-bold text-rose-400 mt-1">{absentCount}</h3>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <p className="text-[11px] text-amber-400 font-medium uppercase">Late</p>
          <h3 className="text-2xl font-bold text-amber-400 mt-1">{lateCount}</h3>
        </div>
      </div>

      {/* TAB 1: MANUAL ROLL CALL SHEET */}
      {activeTab === 'manual' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 glass-panel rounded-2xl border border-slate-800">
            <span className="text-xs font-semibold text-slate-300">
              Bulk Quick Actions ({students.length} {getLabel('studentPlural').toLowerCase()}):
            </span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="success" onClick={() => handleMarkAll('PRESENT')}>
                Mark All Present
              </Button>
              <Button size="sm" variant="danger" onClick={() => handleMarkAll('ABSENT')}>
                Mark All Absent
              </Button>
            </div>
          </div>

          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4">{getLabel('student')}</th>
                  <th className="px-6 py-4">{getLabel('admission')} No</th>
                  <th className="px-6 py-4">Status for {selectedDate}</th>
                  <th className="px-6 py-4 text-right">Quick Toggle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {students.map((stu) => {
                  const currentStatus = getStudentStatus(stu.id);

                  return (
                    <tr key={stu.id} className="hover:bg-slate-850/50 transition-colors">
                      <td className="px-6 py-4 flex items-center gap-3">
                        <img
                          src={stu.photoUrl}
                          alt={stu.firstName}
                          className="w-9 h-9 rounded-xl object-cover"
                        />
                        <div>
                          <p className="font-bold text-white">
                            {stu.firstName} {stu.lastName}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {isSchool ? 'Class 10-A' : 'JEE Alpha 2027'}
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-4 font-mono font-medium text-slate-300">
                        {stu.admissionNo}
                      </td>

                      <td className="px-6 py-4">
                        <Badge
                          variant={
                            currentStatus === 'PRESENT'
                              ? 'emerald'
                              : currentStatus === 'ABSENT'
                              ? 'rose'
                              : 'amber'
                          }
                          size="sm"
                          dot
                        >
                          {currentStatus}
                        </Badge>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleStatusChange(stu, 'PRESENT')}
                            className={`px-2.5 py-1 rounded-lg font-medium text-[11px] transition-all ${
                              currentStatus === 'PRESENT'
                                ? 'bg-emerald-600 text-white font-bold'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            P
                          </button>
                          <button
                            onClick={() => handleStatusChange(stu, 'ABSENT')}
                            className={`px-2.5 py-1 rounded-lg font-medium text-[11px] transition-all ${
                              currentStatus === 'ABSENT'
                                ? 'bg-rose-600 text-white font-bold'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            A
                          </button>
                          <button
                            onClick={() => handleStatusChange(stu, 'LATE')}
                            className={`px-2.5 py-1 rounded-lg font-medium text-[11px] transition-all ${
                              currentStatus === 'LATE'
                                ? 'bg-amber-600 text-white font-bold'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            L
                          </button>
                          <button
                            onClick={() => handleStatusChange(stu, 'EXCUSED')}
                            className={`px-2.5 py-1 rounded-lg font-medium text-[11px] transition-all ${
                              currentStatus === 'EXCUSED'
                                ? 'bg-sky-600 text-white font-bold'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            E
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE SMART QR SCANNER */}
      {activeTab === 'qr' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Scanner Viewfinder Box */}
          <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-sky-500/30 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-white text-base">Campus Gate QR Scanner</h3>
              </div>
              <Badge variant="emerald" size="sm" dot>Live Camera Active</Badge>
            </div>

            {/* Simulated Viewfinder */}
            <div className="relative h-72 bg-slate-950 rounded-2xl border-2 border-dashed border-sky-500/50 flex flex-col items-center justify-center p-6 text-center overflow-hidden">
              {/* Corner brackets */}
              <div className="absolute inset-8 border-2 border-sky-400/40 rounded-xl pointer-events-none animate-pulse" />

              <QrCode className="w-20 h-20 text-sky-400/60 mb-2" />
              <p className="text-xs text-slate-300 font-medium">
                Hold Student QR Badge in front of camera to automatically punch attendance.
              </p>

              {isScanning && (
                <div className="absolute inset-0 bg-sky-950/70 backdrop-blur-xs flex items-center justify-center gap-2 text-sky-300 font-bold text-sm">
                  <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                  Decoding Student ID...
                </div>
              )}
            </div>

            {/* Notification alert preview */}
            {scanMessage && (
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-semibold animate-scale-up">
                {scanMessage}
              </div>
            )}

            {/* WhatsApp Integration Switch */}
            <div className="flex items-center justify-between p-3.5 bg-slate-900/60 rounded-xl border border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-300">Auto-send WhatsApp entry alert to parent</span>
              </div>
              <input
                type="checkbox"
                checked={autoNotifyWhatsApp}
                onChange={(e) => setAutoNotifyWhatsApp(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Quick Scanner Simulator (Test with any enrolled student) */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="font-bold text-white text-base">Simulate Badge Tap</h3>
            <p className="text-xs text-slate-400">
              Click any {getLabel('student').toLowerCase()} to simulate instant QR gate check-in:
            </p>

            <div className="space-y-2.5 max-h-96 overflow-y-auto">
              {students.map((stu) => (
                <button
                  key={stu.id}
                  onClick={() => handleSimulateScan(stu)}
                  className="w-full p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/50 flex items-center justify-between transition-all group text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <img src={stu.photoUrl} alt="" className="w-8 h-8 rounded-lg object-cover" />
                    <div>
                      <p className="text-xs font-bold text-white group-hover:text-sky-400">
                        {stu.firstName} {stu.lastName}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">{stu.admissionNo}</p>
                    </div>
                  </div>
                  <Zap className="w-4 h-4 text-amber-400 group-hover:scale-125 transition-transform" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
