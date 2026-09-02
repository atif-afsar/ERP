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
  Lock,
  Unlock,
  AlertTriangle,
  Users,
  FileSpreadsheet,
  MessageSquare,
  Phone,
  Check,
  X,
  Building,
  GraduationCap,
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storageService';
import {
  AttendanceRecord,
  AttendanceStatus,
  Student,
  Staff,
} from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Tabs } from '../../components/ui/Tabs';

type StaffAttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'ON_LEAVE';

export const AttendanceModule: React.FC = () => {
  const { currentTenant, getLabel, isSchool, isCoaching } = useTenant();
  const { currentUser } = useAuth();

  // Navigation State
  const [activeTab, setActiveTab] = useState<'student_rollcall' | 'staff_rollcall' | 'qr_kiosk' | 'analytics'>('student_rollcall');

  // Date & Scoping State
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const classes = storage.getClasses(currentTenant.id);
  const batches = storage.getBatches(currentTenant.id);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    isSchool ? classes[0]?.id || '' : batches[0]?.id || ''
  );

  // Student Attendance State
  const students = storage.getStudents(currentTenant.id);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() =>
    storage.getAttendance(currentTenant.id, selectedDate)
  );
  const [isSessionLocked, setIsSessionLocked] = useState(false);
  const [remarksMap, setRemarksMap] = useState<Record<string, string>>({});

  // Audited Correction Modal State
  const [correctionStudent, setCorrectionStudent] = useState<Student | null>(null);
  const [targetCorrectionStatus, setTargetCorrectionStatus] = useState<AttendanceStatus>('PRESENT');
  const [correctionReason, setCorrectionReason] = useState('');
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);

  // Staff Attendance State
  const staffList = storage.getStaff(currentTenant.id);
  const [staffAttendanceMap, setStaffAttendanceMap] = useState<Record<string, StaffAttendanceStatus>>({
    'staff-101': 'PRESENT',
    'staff-102': 'PRESENT',
    'staff-103': 'ON_LEAVE',
    'staff-104': 'PRESENT',
    'staff-105': 'PRESENT',
  });

  // QR Scanner Simulation State
  const [scannedStudent, setScannedStudent] = useState<Student | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [autoNotifyWhatsApp, setAutoNotifyWhatsApp] = useState(true);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // Parent Alert State
  const [alertBroadcastSuccess, setAlertBroadcastSuccess] = useState<string | null>(null);

  // Filter students by selected group
  const groupStudents = students.filter((s) =>
    isSchool ? s.classId === selectedGroupId : s.batchIds?.includes(selectedGroupId)
  );

  // Status mapping
  const getStudentStatus = (studentId: string): AttendanceStatus => {
    const record = attendanceRecords.find((a) => a.studentId === studentId && a.date === selectedDate);
    return record?.status || 'PRESENT';
  };

  const handleStatusChange = (student: Student, newStatus: AttendanceStatus) => {
    // If locked, require audited correction workflow
    if (isSessionLocked) {
      setCorrectionStudent(student);
      setTargetCorrectionStatus(newStatus);
      setCorrectionReason('');
      setIsCorrectionModalOpen(true);
      return;
    }

    const updated: AttendanceRecord = {
      id: `att-${student.id}-${selectedDate}`,
      tenantId: currentTenant.id,
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      groupId: selectedGroupId,
      groupName: isSchool
        ? classes.find((c) => c.id === selectedGroupId)?.name || 'Class 10-A'
        : batches.find((b) => b.id === selectedGroupId)?.name || 'JEE Alpha',
      date: selectedDate,
      status: newStatus,
      markedBy: currentUser.name,
      markedAt: new Date().toLocaleTimeString(),
      method: 'MANUAL',
    };

    storage.markAttendance([updated]);
    setAttendanceRecords(storage.getAttendance(currentTenant.id, selectedDate));
  };

  // Execute Audited Correction
  const handleConfirmAuditedCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionStudent || !correctionReason) return;

    const oldStatus = getStudentStatus(correctionStudent.id);

    const updated: AttendanceRecord = {
      id: `att-${correctionStudent.id}-${selectedDate}`,
      tenantId: currentTenant.id,
      studentId: correctionStudent.id,
      studentName: `${correctionStudent.firstName} ${correctionStudent.lastName}`,
      groupId: selectedGroupId,
      groupName: isSchool
        ? classes.find((c) => c.id === selectedGroupId)?.name || 'Class 10-A'
        : batches.find((b) => b.id === selectedGroupId)?.name || 'JEE Alpha',
      date: selectedDate,
      status: targetCorrectionStatus,
      markedBy: `${currentUser.name} (Corrected)`,
      markedAt: new Date().toLocaleTimeString(),
      method: 'MANUAL',
    };

    storage.markAttendance([updated]);
    setAttendanceRecords(storage.getAttendance(currentTenant.id, selectedDate));

    // Audit log
    storage.saveAuditLog({
      id: `audit_${Date.now()}`,
      tenantId: currentTenant.id,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'ATTENDANCE_CORRECTED',
      category: 'STUDENT',
      entityType: 'ATTENDANCE',
      entityId: updated.id,
      details: `Corrected attendance for ${correctionStudent.firstName} ${correctionStudent.lastName} on ${selectedDate} from '${oldStatus}' to '${targetCorrectionStatus}'. Reason: ${correctionReason}`,
      timestamp: new Date().toISOString(),
      status: 'SUCCESS',
    });

    setIsCorrectionModalOpen(false);
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    if (isSessionLocked) return;

    const records: AttendanceRecord[] = groupStudents.map((stu) => ({
      id: `att-${stu.id}-${selectedDate}`,
      tenantId: currentTenant.id,
      studentId: stu.id,
      studentName: `${stu.firstName} ${stu.lastName}`,
      groupId: selectedGroupId,
      groupName: isSchool
        ? classes.find((c) => c.id === selectedGroupId)?.name || 'Class 10-A'
        : batches.find((b) => b.id === selectedGroupId)?.name || 'JEE Alpha',
      date: selectedDate,
      status,
      markedBy: currentUser.name,
      markedAt: new Date().toLocaleTimeString(),
      method: 'MANUAL',
    }));

    storage.markAttendance(records);
    setAttendanceRecords(storage.getAttendance(currentTenant.id, selectedDate));
  };

  // QR Simulator
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
        markedBy: 'QR Gate Terminal #1',
        markedAt: new Date().toLocaleTimeString(),
        method: 'QR_SCAN',
      };

      storage.markAttendance([record]);
      setAttendanceRecords(storage.getAttendance(currentTenant.id, selectedDate));

      if (autoNotifyWhatsApp) {
        setScanMessage(
          `Checked In: ${stu.firstName} ${stu.lastName} at ${record.markedAt}. WhatsApp alert dispatched to ${stu.parentPhone}!`
        );
      } else {
        setScanMessage(`Checked In: ${stu.firstName} ${stu.lastName} at ${record.markedAt}`);
      }

      setTimeout(() => setScanMessage(null), 4500);
    }, 400);
  };

  // Low Attendance Alert Dispatcher
  const handleSendDefaulterAlerts = () => {
    setAlertBroadcastSuccess(
      `Dispatched automated SMS & WhatsApp attendance alerts to 8 parents with attendance below 75% threshold.`
    );
    setTimeout(() => setAlertBroadcastSuccess(null), 4000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <CalendarCheck className="w-6 h-6 text-sky-400" />
              Attendance & Roll Call Suite
            </h2>
            <Badge variant="emerald" size="sm" dot>
              Live Session
            </Badge>
          </div>
          <p className="text-xs text-slate-400">
            Classroom roll call, session locking, audited corrections, staff attendance, QR gate scanner, and defaulter alerts.
          </p>
        </div>

        {/* Date Navigator */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="p-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono focus:border-sky-500"
          />
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs
        tabs={[
          { id: 'student_rollcall', label: `📋 Student Roll Call (${groupStudents.length})` },
          { id: 'staff_rollcall', label: `👨‍🏫 Staff & Faculty Attendance (${staffList.length})` },
          { id: 'qr_kiosk', label: '📱 High-Speed QR Kiosk Scanner' },
          { id: 'analytics', label: '📊 Intelligence & Low-Attendance Alerts' },
        ]}
        activeTab={activeTab}
        onChange={(t) => setActiveTab(t as any)}
      />

      {/* TAB 1: STUDENT ROLL CALL */}
      {activeTab === 'student_rollcall' && (
        <div className="space-y-4">
          
          {/* Action Bar */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-400 font-semibold">Target {getLabel('group')}:</label>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="p-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-bold"
              >
                {isSchool && classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                {isCoaching && batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>

              {/* Lock Toggle */}
              <button
                onClick={() => setIsSessionLocked(!isSessionLocked)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isSessionLocked
                    ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                }`}
              >
                {isSessionLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                <span>{isSessionLocked ? 'Locked (Requires Reason to Edit)' : 'Session Open'}</span>
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={isSessionLocked}
                onClick={() => handleMarkAll('PRESENT')}
                leftIcon={<Check className="w-3.5 h-3.5 text-emerald-400" />}
              >
                Mark All Present
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={isSessionLocked}
                onClick={() => handleMarkAll('ABSENT')}
                leftIcon={<X className="w-3.5 h-3.5 text-rose-400" />}
              >
                Mark All Absent
              </Button>
            </div>
          </div>

          {/* Roster Table */}
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800 font-mono">
                  <tr>
                    <th className="p-3.5">{getLabel('student')}</th>
                    <th className="p-3.5">{getLabel('admission')} No</th>
                    <th className="p-3.5">Roll Call Status</th>
                    <th className="p-3.5">Optional Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {groupStudents.map((stu) => {
                    const status = getStudentStatus(stu.id);

                    return (
                      <tr key={stu.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3.5 font-bold text-white flex items-center gap-3">
                          <img src={stu.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-700" />
                          <div>
                            <p>{stu.firstName} {stu.lastName}</p>
                            <p className="text-[10px] text-slate-400 font-normal font-mono">{stu.parentPhone}</p>
                          </div>
                        </td>

                        <td className="p-3.5 font-mono text-sky-400 font-semibold">{stu.admissionNo}</td>

                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5">
                            {(['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'EXCUSED'] as AttendanceStatus[]).map((st) => {
                              const isSelected = status === st;
                              const colors: Record<AttendanceStatus, string> = {
                                PRESENT: 'bg-emerald-500 text-white',
                                ABSENT: 'bg-rose-500 text-white',
                                LATE: 'bg-amber-500 text-slate-950 font-bold',
                                HALF_DAY: 'bg-indigo-500 text-white',
                                EXCUSED: 'bg-purple-500 text-white',
                              };

                              return (
                                <button
                                  key={st}
                                  onClick={() => handleStatusChange(stu, st)}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-mono font-semibold transition-all ${
                                    isSelected
                                      ? `${colors[st]} shadow-md`
                                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                                  }`}
                                >
                                  {st}
                                </button>
                              );
                            })}
                          </div>
                        </td>

                        <td className="p-3.5">
                          <input
                            type="text"
                            placeholder="Add note (e.g. Doctor appointment)..."
                            value={remarksMap[stu.id] || ''}
                            onChange={(e) => setRemarksMap({ ...remarksMap, [stu.id]: e.target.value })}
                            className="w-full max-w-xs p-1.5 bg-slate-950 border border-slate-800 rounded-lg text-[11px] text-slate-200 focus:outline-none focus:border-sky-500"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STAFF ROLL CALL */}
      {activeTab === 'staff_rollcall' && (
        <div className="space-y-4">
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-white text-sm">Employee & Educator Daily Attendance</h4>
              <p className="text-xs text-slate-400">Mark faculty and administrative staff presence for {selectedDate}.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const map: Record<string, StaffAttendanceStatus> = {};
                staffList.forEach((s) => (map[s.id] = 'PRESENT'));
                setStaffAttendanceMap(map);
              }}
              leftIcon={<Check className="w-3.5 h-3.5 text-emerald-400" />}
            >
              Mark All Staff Present
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {staffList.map((st) => {
              const status = staffAttendanceMap[st.id] || 'PRESENT';

              return (
                <div key={st.id} className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <img src={st.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover border border-slate-700" />
                      <div>
                        <h5 className="font-bold text-white text-xs">{st.name}</h5>
                        <p className="text-[10px] text-sky-400 font-mono">{st.designation}</p>
                      </div>
                    </div>
                    <Badge variant={status === 'PRESENT' ? 'emerald' : status === 'ON_LEAVE' ? 'purple' : 'rose'} size="sm">
                      {status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-4 gap-1 pt-2 border-t border-slate-800">
                    {(['PRESENT', 'ABSENT', 'HALF_DAY', 'ON_LEAVE'] as StaffAttendanceStatus[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => setStaffAttendanceMap({ ...staffAttendanceMap, [st.id]: s })}
                        className={`py-1 rounded text-[9px] font-mono font-semibold transition-all ${
                          status === s
                            ? 'bg-sky-500 text-white shadow'
                            : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {s.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: HIGH SPEED QR KIOSK */}
      {activeTab === 'qr_kiosk' && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <QrCode className="w-5 h-5 text-sky-400" />
                Automated Gate QR Kiosk Simulator
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Simulate instant barcode/QR badge scans with automated WhatsApp notifications to parents.
              </p>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <input
                type="checkbox"
                checked={autoNotifyWhatsApp}
                onChange={(e) => setAutoNotifyWhatsApp(e.target.checked)}
                className="rounded border-slate-700 text-emerald-500 focus:ring-0"
              />
              <span className="text-emerald-400 font-semibold">Auto-Dispatch Parent WhatsApp Alert</span>
            </label>
          </div>

          {/* Scan Toast */}
          {scanMessage && (
            <div className="p-4 bg-emerald-500/15 border border-emerald-500/40 rounded-2xl text-emerald-300 text-xs font-semibold flex items-center gap-3 animate-fade-in shadow-xl shadow-emerald-500/5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{scanMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Terminal Camera Box */}
            <div className="lg:col-span-5 bg-slate-950 p-6 rounded-3xl border border-slate-800 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-24 h-24 rounded-3xl bg-sky-500/10 border-2 border-dashed border-sky-400/50 flex items-center justify-center text-sky-400">
                <Camera className={`w-10 h-10 ${isScanning ? 'animate-pulse text-emerald-400' : ''}`} />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Gate Terminal #1 Ready</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Place student physical ID badge or phone under scanner</p>
              </div>
            </div>

            {/* Quick Scan Simulator Buttons */}
            <div className="lg:col-span-7 space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Click Student to Simulate Tap-In:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {students.slice(0, 6).map((stu) => (
                  <button
                    key={stu.id}
                    onClick={() => handleSimulateScan(stu)}
                    className="p-3 bg-slate-950 rounded-2xl border border-slate-800 hover:border-sky-500/50 text-left transition-all flex items-center gap-3 group"
                  >
                    <img src={stu.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white text-xs truncate group-hover:text-sky-300">
                        {stu.firstName} {stu.lastName}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono">{stu.admissionNo}</p>
                    </div>
                    <Zap className="w-4 h-4 text-slate-600 group-hover:text-amber-400" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ANALYTICS & DEFAULTERS */}
      {activeTab === 'analytics' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800">
              <p className="text-[10px] text-slate-400 uppercase font-mono">Today's Attendance Rate</p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">94.8%</p>
              <span className="text-[10px] text-slate-500 font-mono">460 Present / 485 Active</span>
            </div>

            <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800">
              <p className="text-[10px] text-slate-400 uppercase font-mono">Total Absences Today</p>
              <p className="text-2xl font-bold text-rose-400 mt-1">19</p>
              <span className="text-[10px] text-slate-500 font-mono">6 Excused with medical note</span>
            </div>

            <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800">
              <p className="text-[10px] text-slate-400 uppercase font-mono">Late Arrivals</p>
              <p className="text-2xl font-bold text-amber-400 mt-1">6</p>
              <span className="text-[10px] text-slate-500 font-mono">Arrived after 08:15 AM</span>
            </div>
          </div>

          {/* Low Attendance Notice & Alert Dispatcher */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h4 className="font-bold text-white text-base flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  Low Attendance Warning Roster (&lt; 75% Threshold)
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Students at risk of examination debarment due to insufficient minimum required attendance.
                </p>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={handleSendDefaulterAlerts}
                leftIcon={<Send className="w-3.5 h-3.5" />}
              >
                Send WhatsApp Alert to Defaulters
              </Button>
            </div>

            {/* Broadcast Toast */}
            {alertBroadcastSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4" />
                <span>{alertBroadcastSuccess}</span>
              </div>
            )}

            <div className="space-y-2">
              {students.slice(0, 3).map((stu) => (
                <div key={stu.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <img src={stu.photoUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                    <div>
                      <p className="font-bold text-white">{stu.firstName} {stu.lastName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">Parent: {stu.parentName} ({stu.parentPhone})</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-rose-400 font-mono font-bold">68.2% (14 Absences)</span>
                    <Badge variant="rose" size="sm">DEBARMENT WARNING</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AUDITED ATTENDANCE CORRECTION */}
      <Modal
        isOpen={isCorrectionModalOpen}
        onClose={() => setIsCorrectionModalOpen(false)}
        title="Audited Attendance Correction"
        maxWidth="md"
      >
        <form onSubmit={handleConfirmAuditedCorrection} className="space-y-4 text-xs">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 space-y-1">
            <p className="font-bold">Locked Session Modification Notice</p>
            <p>
              Changing attendance for <strong>{correctionStudent?.firstName} {correctionStudent?.lastName}</strong> on{' '}
              <strong>{selectedDate}</strong> to <strong>{targetCorrectionStatus}</strong> requires an audited justification.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-slate-400 font-semibold">Mandatory Correction Reason *</label>
            <textarea
              required
              rows={3}
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
              placeholder="e.g. Student was present in chemistry lab; teacher incorrectly marked absent during morning roll call."
              className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-sky-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsCorrectionModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Commit Audited Correction
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
