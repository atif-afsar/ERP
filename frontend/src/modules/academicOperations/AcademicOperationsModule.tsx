import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { academicOperationsService as api } from '../../services/academicOperationsService';
import { masterDataService as master } from '../../services/masterDataService';
import { apiClient } from '../../services/api/apiClient';
import { QrSessionPanel } from '../qrAttendance/QrSessionPanel';
import { StudentQrCheckIn } from '../qrAttendance/StudentQrCheckIn';
import { LeavePanel } from '../hr/LeavePanel';
import { StaffAttendancePanel } from '../hr/StaffAttendancePanel';
import { PayrollPanel } from '../hr/PayrollPanel';
import { StaffImport } from '../hr/StaffImport';
import {
  CalendarCheck,
  QrCode,
  Users,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  History,
  Edit3,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

type Tab = 'staff' | 'assignments' | 'leave' | 'staffAttendance' | 'payroll' | 'timetable' | 'attendance' | 'qr' | 'reports' | 'self' | 'parent';
// Each sidebar route shows only its own tabs.
type Group = 'staff' | 'attendance' | 'timetable';
const TAB_GROUP: Record<Tab, Group> = {
  staff: 'staff', assignments: 'staff', leave: 'staff', staffAttendance: 'staff', payroll: 'staff',
  timetable: 'timetable',
  attendance: 'attendance', qr: 'attendance', reports: 'attendance', self: 'attendance', parent: 'attendance',
};

const Field = ({ label, className = '', ...p }: any) => (
  <label className={`block text-xs font-medium text-slate-700 ${className}`}>
    {label}
    <input {...p} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 disabled:bg-slate-100" />
  </label>
);

const Select = ({ label, items, value, onChange, required = false, disabled = false, placeholder = 'Select...' }: any) => (
  <label className="block text-xs font-medium text-slate-700">
    {label}
    <select
      required={required}
      disabled={disabled}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 disabled:bg-slate-100"
    >
      <option value="">{placeholder}</option>
      {items.map((x: any) => (
        <option key={x.id} value={x.id}>
          {x.name || x.label || x.title}
        </option>
      ))}
    </select>
  </label>
);

export const AcademicOperationsModule: React.FC<{ initialTab?: string }> = ({ initialTab }) => {
  const { currentTenant, hasEntitlement } = useTenant();
  const { currentUser, can, isTeacher, isParent, isStudent } = useAuth();
  const t = currentTenant.id;
  // QR attendance is sold only to coaching institutes on a plan that includes it.
  const qrEnabled = hasEntitlement('qr_attendance');

  // Initial tab resolution based on role
  const group: Group = initialTab && initialTab in TAB_GROUP ? TAB_GROUP[initialTab as Tab] : 'attendance';
  const resolvedInitialTab: Tab = useMemo(() => {
    if (group === 'staff') {
      if (can('staff.view')) return 'staff';
      if (can('hr.view') || can('hr.leave.request')) return 'leave';
      return 'payroll';
    }
    if (isStudent) return 'self';
    if (isParent) return 'parent';
    if (initialTab && initialTab in TAB_GROUP) {
      return initialTab as Tab;
    }
    if (can('attendance.view')) return 'attendance';
    if (can('staff.view')) return 'staff';
    return 'attendance';
  }, [initialTab, group, isStudent, isParent, can]);

  const [tab, setTab] = useState<Tab>(resolvedInitialTab);
  const heading = initialTab === 'staff'
    ? can('staff.view')
      ? { title: 'Staff & HR', subtitle: 'Staff records, teaching assignments, leave, staff attendance and payroll.' }
      : { title: 'My HR', subtitle: 'Request leave, check your balance and view your payslips.' }
    : initialTab === 'timetable'
    ? { title: 'Timetable', subtitle: 'Weekly class schedule with teacher and room clash checks.' }
    : isStudent
    ? { title: 'My Attendance', subtitle: qrEnabled ? 'Your attendance record. Scan the classroom QR to mark yourself present.' : 'Your attendance record.' }
    : isParent
    ? { title: "Children's Attendance", subtitle: 'Daily attendance for your linked children.' }
    : { title: 'Attendance', subtitle: qrEnabled ? 'Mark the class roster, run QR attendance, and export reports.' : 'Mark the class roster, make corrections, and export reports.' };
  const [data, setData] = useState<any>({
    staff: [],
    assignments: [],
    years: [],
    classes: [],
    sections: [],
    subjects: [],
    timetable: [],
    roster: [],
    teachingContext: []
  });

  const [showStaffImport, setShowStaffImport] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingRoster, setLoadingRoster] = useState(false);

  // Forms state
  const [staff, setStaff] = useState<any>({
    employeeId: '',
    name: '',
    email: '',
    designation: 'Teacher',
    department: 'Academics',
    employmentType: 'FULL_TIME',
    status: 'ACTIVE',
    teacherProfile: { qualification: '', specialization: '', experienceYears: 0 }
  });

  const [assignment, setAssignment] = useState<any>({
    teacherId: '',
    subjectId: '',
    classId: '',
    sectionId: '',
    academicYearId: '',
    isPrimary: false
  });

  const [slot, setSlot] = useState<any>({
    academicYearId: '',
    classId: '',
    sectionId: '',
    subjectId: '',
    teacherId: '',
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '09:45',
    room: ''
  });

  // Attendance Scope
  const [scope, setScope] = useState<any>({
    academicYearId: '',
    classId: '',
    sectionId: '',
    date: new Date().toISOString().slice(0, 10)
  });
  const [marks, setMarks] = useState<Record<string, string>>({});
  const scopeVersion = useRef(0);

  // Correction Modal state
  const [correctingRecord, setCorrectingRecord] = useState<any | null>(null);
  const [correctionReason, setCorrectionReason] = useState('');
  const [newStatus, setNewStatus] = useState('PRESENT');

  // History Modal state
  const [historyEnrollment, setHistoryEnrollment] = useState<any | null>(null);
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [historyCorrections, setHistoryCorrections] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Self-Service state
  const [selfAttendance, setSelfAttendance] = useState<any | null>(null);
  const [parentChildren, setParentChildren] = useState<any[]>([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [childAttendance, setChildAttendance] = useState<any | null>(null);
  const [parentDateRange, setParentDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10)
  });

  // Reports state
  const [reportFilter, setReportFilter] = useState({
    academicYearId: '',
    classId: '',
    sectionId: '',
    startDate: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10)
  });
  const [reportSummary, setReportSummary] = useState<any | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // Load foundational data
  const load = async () => {
    setErr('');
    try {
      const isStaffOrAdmin = can('master_data.view');
      const isTeacherUser = isTeacher || (!isStaffOrAdmin && can('attendance.view'));

      const promises: Promise<any>[] = [];

      if (can('staff.view')) promises.push(api.listStaff(t).catch(() => ({ data: [] })));
      else promises.push(Promise.resolve({ data: [] }));

      if (can('teaching_assignments.view')) promises.push(api.listAssignments(t).catch(() => ({ data: [] })));
      else promises.push(Promise.resolve({ data: [] }));

      if (isStaffOrAdmin) {
        promises.push(master.listYears(t).catch(() => ({ data: [] })));
        promises.push(master.listClasses(t).catch(() => ({ data: [] })));
        promises.push(master.listSections(t).catch(() => ({ data: [] })));
        promises.push(master.listSubjects(t).catch(() => ({ data: [] })));
        promises.push(Promise.resolve({ data: [] })); // teaching-context placeholder
      } else if (isTeacherUser) {
        promises.push(Promise.resolve({ data: [] }));
        promises.push(Promise.resolve({ data: [] }));
        promises.push(Promise.resolve({ data: [] }));
        promises.push(Promise.resolve({ data: [] }));
        promises.push(api.teachingContext(t).catch(() => ({ data: [] })));
      } else {
        promises.push(Promise.resolve({ data: [] }));
        promises.push(Promise.resolve({ data: [] }));
        promises.push(Promise.resolve({ data: [] }));
        promises.push(Promise.resolve({ data: [] }));
        promises.push(Promise.resolve({ data: [] }));
      }

      const [staffRes, assignRes, yearsRes, classesRes, sectionsRes, subjectsRes, ctxRes] = await Promise.all(promises);

      let years = yearsRes?.data || [];
      let classes = classesRes?.data || [];
      let sections = sectionsRes?.data || [];
      let subjects = subjectsRes?.data || [];
      const teachingContext = ctxRes?.data || [];

      // If user is a teacher without master_data.view, derive available dropdowns from teachingContext
      if (teachingContext.length > 0) {
        const unique = (key: string, nameKey: string, extra?: (x: any) => any) => {
          const map = new Map();
          for (const item of teachingContext) {
            const id = item[key];
            if (id && !map.has(id)) {
              map.set(id, { id, name: item[nameKey], ...(extra ? extra(item) : {}) });
            }
          }
          return Array.from(map.values());
        };

        years = unique('academic_year_id', 'academic_year_name');
        classes = unique('class_id', 'class_name', (x) => ({ academic_year_id: x.academic_year_id }));
        sections = unique('section_id', 'section_name', (x) => ({ class_id: x.class_id, academic_year_id: x.academic_year_id }));
        subjects = unique('subject_id', 'subject_name');
      }

      setData({
        staff: staffRes?.data || [],
        assignments: assignRes?.data || [],
        years,
        classes,
        sections,
        subjects,
        timetable: [],
        roster: [],
        teachingContext
      });

      // Auto-select first academic year if available and not yet set
      if (years.length > 0 && !scope.academicYearId) {
        const defaultYear = years[0].id;
        setScope((s: any) => ({ ...s, academicYearId: defaultYear }));
        setReportFilter((s: any) => ({ ...s, academicYearId: defaultYear }));
      }
    } catch (e: any) {
      setErr(e.message || 'Failed to load academic resources');
    }
  };

  useEffect(() => {
    load();
  }, [t]);

  // Load self-attendance for students
  useEffect(() => {
    if (tab === 'self' || isStudent) {
      api.getSelfAttendance(t)
        .then(res => setSelfAttendance(res.data))
        .catch(e => setErr(e.message));
    }
  }, [tab, isStudent, t]);

  // Load linked children for parents
  useEffect(() => {
    if (tab === 'parent' || isParent) {
      apiClient.request<any[]>('/api/v1/parents/children', { tenantId: t })
        .then(res => {
          const list = res.data || [];
          setParentChildren(list);
          if (list.length > 0 && !selectedChildId) {
            setSelectedChildId(list[0].id);
          }
        })
        .catch(() => {
          // If students list is restricted, attempt direct child fetch if user has linkedStudentIds
          if (currentUser?.linkedStudentIds && currentUser.linkedStudentIds.length > 0) {
            const list = currentUser.linkedStudentIds.map(id => ({ id, first_name: 'Student', last_name: id.slice(0, 6) }));
            setParentChildren(list);
            setSelectedChildId(list[0].id);
          }
        });
    }
  }, [tab, isParent, t]);

  // Load child attendance when selectedChildId changes
  useEffect(() => {
    if ((tab === 'parent' || isParent) && selectedChildId) {
      api.getChildAttendance(t, selectedChildId, parentDateRange)
        .then(res => setChildAttendance(res.data))
        .catch(e => setErr(e.message));
    }
  }, [tab, isParent, selectedChildId, parentDateRange, t]);

  // Cascading dropdown helpers
  const availableClasses = useMemo(() => {
    if (!scope.academicYearId) return [];
    if (data.teachingContext && data.teachingContext.length > 0) {
      const validClassIds = new Set(
        data.teachingContext
          .filter((ctx: any) => ctx.academic_year_id === scope.academicYearId)
          .map((ctx: any) => ctx.class_id)
      );
      return data.classes.filter((c: any) => validClassIds.has(c.id));
    }
    return data.classes.filter((c: any) => !c.academic_year_id || c.academic_year_id === scope.academicYearId);
  }, [scope.academicYearId, data.classes, data.teachingContext]);

  const availableSections = useMemo(() => {
    if (!scope.classId) return [];
    if (data.teachingContext && data.teachingContext.length > 0) {
      const validSectionIds = new Set(
        data.teachingContext
          .filter((ctx: any) => ctx.academic_year_id === scope.academicYearId && ctx.class_id === scope.classId)
          .map((ctx: any) => ctx.section_id)
          .filter(Boolean)
      );
      return data.sections.filter((s: any) => validSectionIds.has(s.id));
    }
    return data.sections.filter((s: any) => s.class_id === scope.classId);
  }, [scope.academicYearId, scope.classId, data.sections, data.teachingContext]);

  // Timetable section helper
  const timetableSections = useMemo(() => {
    return data.sections.filter((x: any) => x.class_id === slot.classId);
  }, [data.sections, slot.classId]);

  const changeScope = (updates: any) => {
    scopeVersion.current++;
    setScope((v: any) => ({ ...v, ...updates }));
    setData((v: any) => ({ ...v, roster: [] }));
    setMarks({});
    setMsg('');
    setErr('');
  };

  const run = async (fn: () => Promise<any>, successMsg: string) => {
    setErr('');
    setMsg('');
    setSubmitting(true);
    try {
      const r = await fn();
      setMsg(successMsg);
      return r;
    } catch (e: any) {
      setErr(e.message || 'Operation failed');
      throw e;
    } finally {
      setSubmitting(false);
    }
  };

  const loadRoster = async () => {
    if (!scope.academicYearId || !scope.classId || !scope.sectionId || !scope.date) {
      setErr('Please select an Academic Year, Class, Section, and Attendance Date.');
      return;
    }
    const version = ++scopeVersion.current;
    setLoadingRoster(true);
    setErr('');
    setMsg('');
    setData((v: any) => ({ ...v, roster: [] }));
    try {
      const r = await api.roster(t, scope);
      if (version !== scopeVersion.current) return;
      setData((d: any) => ({ ...d, roster: r.data }));
      const initialMarks: Record<string, string> = {};
      for (const item of r.data) {
        initialMarks[item.enrollment_id] = item.status || 'PRESENT';
      }
      setMarks(initialMarks);
      setMsg(
        r.data.length
          ? `Roster loaded with ${r.data.length} enrolled student(s). Verify or adjust statuses before saving.`
          : 'No active student enrollments found for this class and section.'
      );
    } catch (e: any) {
      if (version === scopeVersion.current) setErr(e.message || 'Failed to load roster');
    } finally {
      if (version === scopeVersion.current) setLoadingRoster(false);
    }
  };

  const markAll = (status: string) => {
    const updated: Record<string, string> = {};
    for (const row of data.roster) {
      updated[row.enrollment_id] = status;
    }
    setMarks(updated);
  };

  const handleSaveAttendance = async () => {
    if (!data.roster.length) return;
    const records = data.roster.map((row: any) => ({
      enrollmentId: row.enrollment_id,
      status: marks[row.enrollment_id] || 'PRESENT'
    }));

    await run(
      () =>
        api.saveAttendance(t, {
          academicYearId: scope.academicYearId,
          classId: scope.classId,
          sectionId: scope.sectionId,
          date: scope.date,
          records
        }),
      `Attendance saved successfully for ${records.length} student(s).`
    );
    // Reload roster to fetch authoritative saved statuses and updated_at timestamps
    await loadRoster();
  };

  const handleOpenCorrection = (row: any) => {
    setCorrectingRecord(row);
    setNewStatus(marks[row.enrollment_id] || row.status || 'PRESENT');
    setCorrectionReason('');
    setErr('');
  };

  const handleSubmitCorrection = async () => {
    if (!correctingRecord) return;
    if (!correctionReason.trim() || correctionReason.trim().length < 3) {
      setErr('A valid correction reason (minimum 3 characters) is required.');
      return;
    }

    setSubmitting(true);
    setErr('');
    setMsg('');
    try {
      await api.correctAttendance(t, {
        enrollmentId: correctingRecord.enrollment_id,
        attendanceDate: scope.date,
        newStatus,
        reason: correctionReason.trim(),
        expectedVersion: correctingRecord.version,
        expectedUpdatedAt: correctingRecord.updated_at
      });
      setMsg(`Attendance for ${correctingRecord.first_name} ${correctingRecord.last_name} corrected to ${newStatus}.`);
      setCorrectingRecord(null);
      setCorrectionReason('');
      await loadRoster();
    } catch (e: any) {
      if (
        e.code === 'STALE_UPDATE_CONFLICT' ||
        e.status === 409 ||
        e.message?.includes('STALE_UPDATE_CONFLICT') ||
        e.message?.includes('concurrently') ||
        e.message?.includes('modified') ||
        e.message?.includes('409')
      ) {
        setErr('Conflict: This record was modified concurrently by another user. Your form values have been preserved. Please review and re-apply.');
        api.roster(t, scope).then(r => {
          setData((d: any) => ({ ...d, roster: r.data }));
          const updated = r.data?.find((x: any) => x.enrollment_id === correctingRecord.enrollment_id);
          if (updated) {
            setCorrectingRecord((prev: any) => ({
              ...prev,
              version: updated.version,
              updated_at: updated.updated_at,
              status: updated.status
            }));
          }
        }).catch(() => {});
      } else {
        setErr(e.message || 'Correction failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenHistory = async (row: any) => {
    setHistoryEnrollment(row);
    setLoadingHistory(true);
    setHistoryRecords([]);
    setHistoryCorrections([]);
    try {
      const res = await api.getHistory(t, row.enrollment_id);
      setHistoryRecords(res.data?.records || []);
      setHistoryCorrections(res.data?.corrections || []);
    } catch (e: any) {
      setErr(e.message || 'Failed to load history');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Reports Generation
  const handleGenerateReport = async () => {
    if (!reportFilter.academicYearId) {
      setErr('Please select an Academic Year for the report.');
      return;
    }
    setLoadingReport(true);
    setErr('');
    try {
      const p: Record<string, string> = {
        academicYearId: reportFilter.academicYearId,
        startDate: reportFilter.startDate,
        endDate: reportFilter.endDate
      };
      if (reportFilter.classId) p.classId = reportFilter.classId;
      if (reportFilter.sectionId) p.sectionId = reportFilter.sectionId;

      const res = await api.getAttendanceSummary(t, p);
      setReportSummary(res.data);
    } catch (e: any) {
      setErr(e.message || 'Failed to generate attendance summary');
    } finally {
      setLoadingReport(false);
    }
  };

  const handleExportCsv = () => {
    const p = new URLSearchParams({
      academicYearId: reportFilter.academicYearId || scope.academicYearId,
      startDate: reportFilter.startDate,
      endDate: reportFilter.endDate
    });
    if (reportFilter.classId) p.set('classId', reportFilter.classId);
    if (reportFilter.sectionId) p.set('sectionId', reportFilter.sectionId);

    // Direct download trigger with tenantId header via blob fetch
    apiClient
      .request<Blob>(`/api/v1/attendance/reports/export?${p.toString()}`, {
        tenantId: t
      })
      .then((blob: any) => {
        const url = window.URL.createObjectURL(new Blob([blob], { type: 'text/csv' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_export_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      })
      .catch((e: any) => {
        setErr(e.message || 'CSV Export failed');
      });
  };

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{heading.title}</h1>
        <p className="text-xs sm:text-sm text-slate-500">{heading.subtitle}</p>
      </div>

      {/* Global Alerts */}
      {err && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 shadow-sm">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Error</p>
            <p className="text-xs text-rose-700">{err}</p>
          </div>
          <button onClick={() => setErr('')} className="text-xs text-rose-500 hover:text-rose-700">Dismiss</button>
        </div>
      )}

      {msg && (
        <div role="status" className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-sm">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Success</p>
            <p className="text-xs text-emerald-700">{msg}</p>
          </div>
          <button onClick={() => setMsg('')} className="text-xs text-emerald-500 hover:text-emerald-700">Dismiss</button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {/* Student View */}
        {isStudent && (
          <>
            <button
              onClick={() => setTab('self')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs sm:text-sm font-semibold transition-colors ${
                tab === 'self' ? 'bg-emerald-600 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <CalendarCheck className="h-4 w-4" />
              My Attendance
            </button>
            {qrEnabled && <button
              onClick={() => setTab('qr')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs sm:text-sm font-semibold transition-colors ${
                tab === 'qr' ? 'bg-emerald-600 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <QrCode className="h-4 w-4" />
              Scan QR
            </button>}
          </>
        )}

        {/* Parent View */}
        {isParent && (
          <button
            onClick={() => setTab('parent')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs sm:text-sm font-semibold transition-colors ${
              tab === 'parent' ? 'bg-emerald-600 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Users className="h-4 w-4" />
            Children's Attendance
          </button>
        )}

        {/* Staff / Management Tabs */}
        {!isStudent && !isParent && (
          <>
            {group === 'staff' && can('staff.view') && (
              <button
                onClick={() => setTab('staff')}
                className={`rounded-lg px-3.5 py-2 text-xs sm:text-sm font-semibold transition-colors ${
                  tab === 'staff' ? 'bg-emerald-600 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Staff & Teachers
              </button>
            )}

            {group === 'staff' && can('teaching_assignments.view') && (
              <button
                onClick={() => setTab('assignments')}
                className={`rounded-lg px-3.5 py-2 text-xs sm:text-sm font-semibold transition-colors ${
                  tab === 'assignments' ? 'bg-emerald-600 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Teaching Assignments
              </button>
            )}

            {group === 'staff' && ([
              ['leave', can('hr.view') ? 'Leave' : 'My Leave', can('hr.view') || can('hr.leave.request')],
              ['staffAttendance', 'Staff Attendance', can('hr.view')],
              ['payroll', can('hr.payroll.view') ? 'Payroll' : 'My Payslips', can('hr.payroll.view') || can('hr.payslip.view_own')],
            ] as [Tab, string, boolean][]).filter(([, , show]) => show).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`rounded-lg px-3.5 py-2 text-xs sm:text-sm font-semibold transition-colors ${
                  tab === id ? 'bg-emerald-600 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            ))}

            {group === 'timetable' && can('timetable.view') && (
              <button
                onClick={() => setTab('timetable')}
                className={`rounded-lg px-3.5 py-2 text-xs sm:text-sm font-semibold transition-colors ${
                  tab === 'timetable' ? 'bg-emerald-600 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Timetable
              </button>
            )}

            {group === 'attendance' && can('attendance.view') && (
              <button
                onClick={() => setTab('attendance')}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs sm:text-sm font-semibold transition-colors ${
                  tab === 'attendance' ? 'bg-emerald-600 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <CalendarCheck className="h-4 w-4" />
                Manual Attendance
              </button>
            )}

            {group === 'attendance' && qrEnabled && can('attendance.manage') && (
              <button
                onClick={() => setTab('qr')}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs sm:text-sm font-semibold transition-colors ${
                  tab === 'qr' ? 'bg-emerald-600 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <QrCode className="h-4 w-4" />
                QR Attendance
              </button>
            )}

            {group === 'attendance' && can('attendance.view') && (
              <button
                onClick={() => setTab('reports')}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs sm:text-sm font-semibold transition-colors ${
                  tab === 'reports' ? 'bg-emerald-600 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <FileSpreadsheet className="h-4 w-4" />
                Reports & Export
              </button>
            )}
          </>
        )}
      </div>

      {/* ================= TAB 1: STAFF & TEACHERS ================= */}
      {tab === 'staff' && (
        <div className="space-y-6">
          {can('staff.manage') && (
            <div className="flex justify-end">
              <button type="button" onClick={() => setShowStaffImport(v => !v)} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <FileSpreadsheet className="mr-1.5 inline h-4 w-4" />
                {showStaffImport ? 'Close import' : 'Bulk import (Excel / CSV)'}
              </button>
            </div>
          )}
          {can('staff.manage') && showStaffImport && <StaffImport tenantId={t} onComplete={() => load()} />}
          {can('staff.manage') && (
            <form
              onSubmit={e => {
                e.preventDefault();
                run(() => api.createStaff(t, staff), 'Staff member created successfully.').then(() => load());
              }}
              className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 md:grid-cols-4 shadow-sm"
            >
              <Field label="Employee ID" required value={staff.employeeId} onChange={(e: any) => setStaff({ ...staff, employeeId: e.target.value })} />
              <Field label="Full Name" required value={staff.name} onChange={(e: any) => setStaff({ ...staff, name: e.target.value })} />
              <Field label="Email" type="email" value={staff.email} onChange={(e: any) => setStaff({ ...staff, email: e.target.value })} />
              <Field label="Designation" required value={staff.designation} onChange={(e: any) => setStaff({ ...staff, designation: e.target.value })} />
              <Field label="Qualification" value={staff.teacherProfile.qualification} onChange={(e: any) => setStaff({ ...staff, teacherProfile: { ...staff.teacherProfile, qualification: e.target.value } })} />
              <Field label="Specialization" value={staff.teacherProfile.specialization} onChange={(e: any) => setStaff({ ...staff, teacherProfile: { ...staff.teacherProfile, specialization: e.target.value } })} />
              <button disabled={submitting} className="self-end rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                {submitting ? 'Creating...' : 'Create Staff Member'}
              </button>
            </form>
          )}

          <Table
            heads={['Employee ID', 'Name', 'Designation', 'Account Email', 'Action']}
            rows={data.staff.map((x: any) => [
              x.employeeId,
              x.name,
              x.designation,
              x.accountEmail || 'Not activated',
              can('teacher_accounts.manage') && x.teacherProfile && !x.userId ? (
                <button
                  onClick={async () => {
                    const r = await run(() => api.inviteTeacher(t, x.id), `Invitation created for ${x.name}.`);
                    if (r) setMsg(`One-time onboarding token for ${x.name}: ${r.data.onboardingToken}`);
                  }}
                  className="text-emerald-700 hover:underline font-medium text-xs"
                >
                  Invite Account
                </button>
              ) : (
                '—'
              )
            ])}
          />
        </div>
      )}

      {/* ================= HR: LEAVE, STAFF ATTENDANCE, PAYROLL ================= */}
      {tab === 'leave' && <LeavePanel tenantId={t} />}
      {tab === 'staffAttendance' && <StaffAttendancePanel tenantId={t} />}
      {tab === 'payroll' && <PayrollPanel tenantId={t} />}

      {/* ================= TAB 2: TEACHING ASSIGNMENTS ================= */}
      {tab === 'assignments' && (
        <div className="space-y-6">
          {can('teaching_assignments.manage') && (
            <form
              onSubmit={e => {
                e.preventDefault();
                run(() => api.createAssignment(t, { ...assignment, sectionId: assignment.sectionId || null }), 'Teaching assignment created.').then(() => load());
              }}
              className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 md:grid-cols-6 shadow-sm"
            >
              <Select label="Teacher" required items={data.staff.filter((x: any) => x.teacherProfile)} value={assignment.teacherId} onChange={(v: string) => setAssignment({ ...assignment, teacherId: v })} />
              <Select label="Subject" required items={data.subjects} value={assignment.subjectId} onChange={(v: string) => setAssignment({ ...assignment, subjectId: v })} />
              <Select label="Academic Year" required items={data.years} value={assignment.academicYearId} onChange={(v: string) => setAssignment({ ...assignment, academicYearId: v })} />
              <Select label="Class" required items={data.classes} value={assignment.classId} onChange={(v: string) => setAssignment({ ...assignment, classId: v })} />
              <Select label="Section (Optional for class-wide)" items={data.sections.filter((x: any) => x.class_id === assignment.classId)} value={assignment.sectionId} onChange={(v: string) => setAssignment({ ...assignment, sectionId: v })} placeholder="All Sections (Class-wide)" />
              <button disabled={submitting} className="self-end rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                {submitting ? 'Assigning...' : 'Assign Teacher'}
              </button>
            </form>
          )}

          <Table
            heads={['Teacher', 'Subject', 'Class', 'Section', 'Academic Year', 'Scope Type']}
            rows={data.assignments.map((x: any) => [
              x.teacher_name,
              x.subject_name,
              x.class_name,
              x.section_name || 'All Sections (Class-wide)',
              x.academic_year_name,
              x.section_id ? (
                <span className="rounded bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700 border border-sky-200">Section-Specific</span>
              ) : (
                <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 border border-indigo-200">Class-Wide</span>
              )
            ])}
          />
        </div>
      )}

      {/* ================= TAB 3: TIMETABLE ================= */}
      {tab === 'timetable' && (
        <div className="space-y-6">
          <p className="text-xs sm:text-sm text-slate-600">
            Within an academic year and day, teacher, section, and room times must not overlap. Validated against authoritative teaching assignments and schedule conflict checks.
          </p>
          <form
            onSubmit={e => {
              e.preventDefault();
              run(() => api.createTimetable(t, slot), 'Timetable period added successfully.');
            }}
            className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 md:grid-cols-5 shadow-sm"
          >
            <Select label="Academic Year" required items={data.years} value={slot.academicYearId} onChange={(v: string) => setSlot({ ...slot, academicYearId: v })} />
            <Select label="Class" required items={data.classes} value={slot.classId} onChange={(v: string) => setSlot({ ...slot, classId: v, sectionId: '' })} />
            <Select label="Section" required items={timetableSections} value={slot.sectionId} onChange={(v: string) => setSlot({ ...slot, sectionId: v })} />
            <Select label="Subject" required items={data.subjects} value={slot.subjectId} onChange={(v: string) => setSlot({ ...slot, subjectId: v })} />
            <Select label="Teacher" required items={data.staff.filter((x: any) => x.teacherProfile)} value={slot.teacherId} onChange={(v: string) => setSlot({ ...slot, teacherId: v })} />
            <Field label="Day of Week (1=Mon ... 7=Sun)" type="number" min="1" max="7" value={slot.dayOfWeek} onChange={(e: any) => setSlot({ ...slot, dayOfWeek: Number(e.target.value) })} />
            <Field label="Start Time" type="time" value={slot.startTime} onChange={(e: any) => setSlot({ ...slot, startTime: e.target.value })} />
            <Field label="End Time" type="time" value={slot.endTime} onChange={(e: any) => setSlot({ ...slot, endTime: e.target.value })} />
            <Field label="Room (Optional)" value={slot.room} onChange={(e: any) => setSlot({ ...slot, room: e.target.value })} />
            <div className="flex gap-2 self-end">
              {can('timetable.manage') && (
                <button disabled={submitting} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                  {submitting ? 'Adding...' : 'Add Period'}
                </button>
              )}
              <button
                type="button"
                onClick={async () => {
                  if (!slot.academicYearId || !slot.classId || !slot.sectionId) {
                    setErr('Select Academic Year, Class, and Section to load timetable.');
                    return;
                  }
                  const r = await run(() => api.listTimetable(t, { academicYearId: slot.academicYearId, classId: slot.classId, sectionId: slot.sectionId }), 'Timetable refreshed.');
                  if (r) setData((d: any) => ({ ...d, timetable: r.data }));
                }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Refresh
              </button>
            </div>
          </form>

          <Table
            heads={['Day', 'Time Window', 'Class', 'Section', 'Subject', 'Teacher', 'Room']}
            rows={data.timetable.map((x: any) => [
              `Day ${x.day_of_week}`,
              `${x.start_time} – ${x.end_time}`,
              x.class_name,
              x.section_name,
              x.subject_name,
              x.teacher_name,
              x.room || 'Standard'
            ])}
          />
        </div>
      )}

      {/* ================= TAB 4: MANUAL ATTENDANCE ================= */}
      {tab === 'attendance' && (
        <div className="space-y-6">
          {/* Scope Controls */}
          <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 md:grid-cols-5 shadow-sm">
            <Select
              label="Academic Year"
              required
              items={data.years}
              value={scope.academicYearId}
              onChange={(v: string) => changeScope({ academicYearId: v, classId: '', sectionId: '' })}
            />
            <Select
              label="Class"
              required
              disabled={!scope.academicYearId}
              items={availableClasses}
              value={scope.classId}
              onChange={(v: string) => changeScope({ classId: v, sectionId: '' })}
            />
            <Select
              label="Section"
              required
              disabled={!scope.classId}
              items={availableSections}
              value={scope.sectionId}
              onChange={(v: string) => changeScope({ sectionId: v })}
            />
            <Field
              label="Attendance Date"
              type="date"
              required
              value={scope.date}
              onChange={(e: any) => changeScope({ date: e.target.value })}
            />
            <div className="flex items-end">
              <button
                disabled={loadingRoster || !scope.academicYearId || !scope.classId || !scope.sectionId}
                onClick={loadRoster}
                className="w-full rounded-lg bg-slate-800 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
              >
                {loadingRoster ? 'Loading...' : 'Load Student Roster'}
              </button>
            </div>
          </div>

          {!loadingRoster && data.roster.length === 0 && scope.sectionId && !err && (
            <div data-testid="roster-empty-state" className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center">
              <Users className="mx-auto h-8 w-8 text-slate-400 mb-2" />
              <p className="text-sm font-semibold text-slate-700">No Enrolled Students Found</p>
              <p className="text-xs text-slate-500 mt-1">There are no active student enrollments for this class and section scope.</p>
            </div>
          )}

          {/* Roster Table with Bulk Controls */}
          {data.roster.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-slate-800">
                    Enrolled Students ({data.roster.length})
                  </span>
                  <span className="text-xs text-slate-500">
                    Date: {scope.date}
                  </span>
                </div>
                {can('attendance.manage') && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => markAll('PRESENT')}
                      className="rounded border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                    >
                      Mark All Present
                    </button>
                    <button
                      type="button"
                      onClick={() => markAll('ABSENT')}
                      className="rounded border border-rose-300 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                    >
                      Mark All Absent
                    </button>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                    <tr>
                      <th className="p-3">Roll No</th>
                      <th className="p-3">Admission No</th>
                      <th className="p-3">Student Name</th>
                      <th className="p-3">Attendance Status</th>
                      <th className="p-3">Audit / Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.roster.map((student: any) => {
                      const currentVal = marks[student.enrollment_id] || 'PRESENT';
                      const isRecorded = !!student.status;
                      return (
                        <tr key={student.enrollment_id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-mono text-xs">{student.roll_no || '—'}</td>
                          <td className="p-3 font-mono text-xs text-slate-500">{student.admission_no || '—'}</td>
                          <td className="p-3 font-medium text-slate-900">
                            {student.first_name} {student.last_name}
                          </td>
                          <td className="p-3">
                            <select
                              disabled={!can('attendance.manage')}
                              value={currentVal}
                              onChange={e =>
                                setMarks({
                                  ...marks,
                                  [student.enrollment_id]: e.target.value
                                })
                              }
                              className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold focus:outline-none ${
                                currentVal === 'PRESENT'
                                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                                  : currentVal === 'ABSENT'
                                  ? 'border-rose-300 bg-rose-50 text-rose-800'
                                  : currentVal === 'LATE'
                                  ? 'border-amber-300 bg-amber-50 text-amber-800'
                                  : currentVal === 'HALF_DAY'
                                  ? 'border-orange-300 bg-orange-50 text-orange-800'
                                  : 'border-blue-300 bg-blue-50 text-blue-800'
                              }`}
                            >
                              <option value="PRESENT">PRESENT</option>
                              <option value="ABSENT">ABSENT</option>
                              <option value="LATE">LATE</option>
                              <option value="EXCUSED">EXCUSED</option>
                              <option value="HALF_DAY">HALF_DAY</option>
                            </select>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              {isRecorded && can('attendance.correct') && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenCorrection(student)}
                                  className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                                >
                                  <Edit3 className="h-3 w-3" />
                                  Correct
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleOpenHistory(student)}
                                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 hover:underline"
                              >
                                <History className="h-3 w-3" />
                                History
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {can('attendance.manage') && (
                <div className="flex justify-end pt-3 border-t">
                  <button
                    disabled={submitting}
                    onClick={handleSaveAttendance}
                    className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {submitting ? 'Saving Atomically...' : 'Save Attendance Batch'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 5: QR ATTENDANCE (coaching plans) ================= */}
      {tab === 'qr' && qrEnabled && (isStudent ? <StudentQrCheckIn /> : <QrSessionPanel />)}

      {/* ================= TAB 6: REPORTS & EXPORT ================= */}
      {tab === 'reports' && (
        <div className="space-y-6">
          <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 md:grid-cols-6 shadow-sm">
            <Select
              label="Academic Year"
              required
              items={data.years}
              value={reportFilter.academicYearId}
              onChange={(v: string) => setReportFilter({ ...reportFilter, academicYearId: v })}
            />
            <Select
              label="Class (Optional)"
              items={availableClasses}
              value={reportFilter.classId}
              onChange={(v: string) => setReportFilter({ ...reportFilter, classId: v, sectionId: '' })}
              placeholder="All Classes"
            />
            <Select
              label="Section (Optional)"
              items={data.sections.filter((s: any) => s.class_id === reportFilter.classId)}
              value={reportFilter.sectionId}
              onChange={(v: string) => setReportFilter({ ...reportFilter, sectionId: v })}
              placeholder="All Sections"
            />
            <Field
              label="Start Date"
              type="date"
              value={reportFilter.startDate}
              onChange={(e: any) => setReportFilter({ ...reportFilter, startDate: e.target.value })}
            />
            <Field
              label="End Date"
              type="date"
              value={reportFilter.endDate}
              onChange={(e: any) => setReportFilter({ ...reportFilter, endDate: e.target.value })}
            />
            <div className="flex gap-2 items-end">
              <button
                disabled={loadingReport || !reportFilter.academicYearId}
                onClick={handleGenerateReport}
                className="flex-1 rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
              >
                {loadingReport ? 'Loading...' : 'Generate'}
              </button>
              <button
                type="button"
                onClick={handleExportCsv}
                className="rounded-lg border border-emerald-600 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
              >
                CSV
              </button>
            </div>
          </div>

          {reportSummary && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                <MetricCard label="Total Records" value={reportSummary.counts?.total || 0} color="slate" />
                <MetricCard label="Present" value={reportSummary.counts?.present || 0} color="emerald" />
                <MetricCard label="Absent" value={reportSummary.counts?.absent || 0} color="rose" />
                <MetricCard label="Late" value={reportSummary.counts?.late || 0} color="amber" />
                <MetricCard label="Excused" value={reportSummary.counts?.excused || 0} color="blue" />
                <MetricCard label="Attendance %" value={`${reportSummary.attendancePercentage}%`} color="indigo" />
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h4 className="text-sm font-semibold text-slate-800 mb-3">Student Performance Breakdown</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 uppercase text-slate-500 font-semibold">
                      <tr>
                        <th className="p-2.5">Roll No</th>
                        <th className="p-2.5">Student Name</th>
                        <th className="p-2.5">Present</th>
                        <th className="p-2.5">Absent</th>
                        <th className="p-2.5">Late</th>
                        <th className="p-2.5">Attendance Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportSummary.studentSummaries?.map((s: any) => (
                        <tr key={s.enrollment_id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-mono">{s.roll_no || '—'}</td>
                          <td className="p-2.5 font-medium text-slate-900">{s.first_name} {s.last_name}</td>
                          <td className="p-2.5 text-emerald-700 font-semibold">{s.present}</td>
                          <td className="p-2.5 text-rose-700 font-semibold">{s.absent}</td>
                          <td className="p-2.5 text-amber-700 font-semibold">{s.late}</td>
                          <td className="p-2.5 font-bold text-slate-800">{s.percentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 7: STUDENT SELF-SERVICE ================= */}
      {tab === 'self' && (
        <div className="space-y-6">
          {selfAttendance ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                <MetricCard label="Total Days" value={selfAttendance.summary?.total || 0} color="slate" />
                <MetricCard label="Present" value={selfAttendance.summary?.present || 0} color="emerald" />
                <MetricCard label="Absent" value={selfAttendance.summary?.absent || 0} color="rose" />
                <MetricCard label="Late" value={selfAttendance.summary?.late || 0} color="amber" />
                <MetricCard label="Excused" value={selfAttendance.summary?.excused || 0} color="blue" />
                <MetricCard label="Rate" value={`${selfAttendance.summary?.percentage}%`} color="indigo" />
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h4 className="text-sm font-semibold text-slate-800 mb-3">My Attendance Log</h4>
                <Table
                  heads={['Date', 'Class & Section', 'Status', 'Remarks']}
                  rows={selfAttendance.records?.map((r: any) => [
                    r.attendance_date,
                    `${r.class_name} - ${r.section_name}`,
                    <StatusBadge status={r.status} />,
                    r.remarks || '—'
                  ]) || []}
                />
              </div>
            </>
          ) : (
            !err && <p className="text-sm text-slate-500">Loading student attendance profile...</p>
          )}
        </div>
      )}

      {/* ================= TAB 8: PARENT SELF-SERVICE ================= */}
      {tab === 'parent' && (
        <div className="space-y-6">
          <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3 shadow-sm">
            <Select
              label="Select Child"
              items={parentChildren.map(c => ({ id: c.id, name: `${c.first_name} ${c.last_name} (${c.admission_no || c.id.slice(0, 6)})` }))}
              value={selectedChildId}
              onChange={(v: string) => setSelectedChildId(v)}
            />
            <Field
              label="From"
              type="date"
              value={parentDateRange.startDate}
              onChange={(e: any) => setParentDateRange({ ...parentDateRange, startDate: e.target.value })}
            />
            <Field
              label="To"
              type="date"
              value={parentDateRange.endDate}
              onChange={(e: any) => setParentDateRange({ ...parentDateRange, endDate: e.target.value })}
            />
          </div>

          {childAttendance && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                <MetricCard label="Total Days" value={childAttendance.summary?.total || 0} color="slate" />
                <MetricCard label="Present" value={childAttendance.summary?.present || 0} color="emerald" />
                <MetricCard label="Absent" value={childAttendance.summary?.absent || 0} color="rose" />
                <MetricCard label="Late" value={childAttendance.summary?.late || 0} color="amber" />
                <MetricCard label="Excused" value={childAttendance.summary?.excused || 0} color="blue" />
                <MetricCard label="Attendance Rate" value={`${childAttendance.summary?.percentage}%`} color="indigo" />
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h4 className="text-sm font-semibold text-slate-800 mb-3">Attendance History for Selected Child</h4>
                <Table
                  heads={['Date', 'Class & Section', 'Status', 'Remarks']}
                  rows={childAttendance.records?.map((r: any) => [
                    r.attendance_date,
                    `${r.class_name} - ${r.section_name}`,
                    <StatusBadge status={r.status} />,
                    r.remarks || '—'
                  ]) || []}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* ================= CORRECTION MODAL ================= */}
      {correctingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">Attendance Correction (Optimistic Locking)</h3>
              <button onClick={() => setCorrectingRecord(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            {err && (
              <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                {err}
              </div>
            )}
            <p className="text-xs text-slate-600">
              Student: <strong>{correctingRecord.first_name} {correctingRecord.last_name}</strong> (Roll: {correctingRecord.roll_no || '—'})
            </p>
            <div className="space-y-3">
              <label className="block text-xs font-medium text-slate-700">
                New Attendance Status
                <select
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
                >
                  <option value="PRESENT">PRESENT</option>
                  <option value="ABSENT">ABSENT</option>
                  <option value="LATE">LATE</option>
                  <option value="EXCUSED">EXCUSED</option>
                  <option value="HALF_DAY">HALF_DAY</option>
                </select>
              </label>

              <label className="block text-xs font-medium text-slate-700">
                Correction Reason (Mandatory, min 3 characters)
                <textarea
                  required
                  rows={3}
                  value={correctionReason}
                  onChange={e => setCorrectionReason(e.target.value)}
                  placeholder="e.g., Medical certificate submitted / Transit delay..."
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setCorrectingRecord(null)}
                className="rounded-lg border px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting || correctionReason.trim().length < 3}
                onClick={handleSubmitCorrection}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {submitting ? 'Applying...' : 'Apply Correction'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= HISTORY MODAL ================= */}
      {historyEnrollment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Attendance & Correction Audit History</h3>
                <p className="text-xs text-slate-500">
                  {historyEnrollment.first_name} {historyEnrollment.last_name} (Roll: {historyEnrollment.roll_no || '—'})
                </p>
              </div>
              <button onClick={() => setHistoryEnrollment(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {loadingHistory ? (
              <p className="text-xs text-slate-500 py-4">Loading audit entries...</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-700 mb-2">Recorded Attendance Records</h4>
                  <Table
                    heads={['Date', 'Status', 'Method', 'Recorded At']}
                    rows={historyRecords.map((r: any) => [
                      r.attendance_date,
                      <StatusBadge status={r.status} />,
                      r.qr_session_id ? 'QR Scan' : 'Manual',
                      new Date(r.created_at).toLocaleString()
                    ])}
                  />
                </div>

                {historyCorrections.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase text-slate-700 mb-2">Corrections History</h4>
                    <Table
                      heads={['Previous', 'New', 'Reason', 'Corrected By', 'Timestamp']}
                      rows={historyCorrections.map((c: any) => [
                        <StatusBadge status={c.previous_status} />,
                        <StatusBadge status={c.new_status} />,
                        c.reason,
                        c.actor_name || c.actor_email || 'Staff',
                        new Date(c.created_at).toLocaleString()
                      ])}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    PRESENT: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    ABSENT: 'bg-rose-50 text-rose-800 border-rose-200',
    LATE: 'bg-amber-50 text-amber-800 border-amber-200',
    EXCUSED: 'bg-blue-50 text-blue-800 border-blue-200',
    HALF_DAY: 'bg-orange-50 text-orange-800 border-orange-200',
    ACTIVE: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    CLOSED: 'bg-slate-100 text-slate-800 border-slate-300',
    EXPIRED: 'bg-amber-50 text-amber-800 border-amber-200',
    REVOKED: 'bg-rose-50 text-rose-800 border-rose-300'
  };
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold border ${styles[status] || 'bg-slate-50 text-slate-800 border-slate-200'}`}>
      {status}
    </span>
  );
};

const MetricCard = ({ label, value, color }: { label: string; value: string | number; color: string }) => {
  const colors: Record<string, string> = {
    slate: 'bg-slate-50 text-slate-900 border-slate-200',
    emerald: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    rose: 'bg-rose-50 text-rose-900 border-rose-200',
    amber: 'bg-amber-50 text-amber-900 border-amber-200',
    blue: 'bg-blue-50 text-blue-900 border-blue-200',
    indigo: 'bg-indigo-50 text-indigo-900 border-indigo-200'
  };
  return (
    <div className={`rounded-xl border p-3 ${colors[color] || colors.slate}`}>
      <p className="text-[11px] font-medium opacity-75">{label}</p>
      <p className="text-lg font-bold tracking-tight mt-0.5">{value}</p>
    </div>
  );
};

const Table = ({ heads, rows }: any) => (
  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
    <table className="w-full text-left text-xs sm:text-sm">
      <thead className="bg-slate-50 uppercase text-[11px] font-semibold text-slate-500">
        <tr>
          {heads.map((h: string) => (
            <th key={h} className="p-3">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.length === 0 ? (
          <tr>
            <td colSpan={heads.length} className="p-4 text-center text-xs text-slate-400">
              No entries found.
            </td>
          </tr>
        ) : (
          rows.map((r: any[], i: number) => (
            <tr key={i} className="hover:bg-slate-50/50">
              {r.map((v: any, j: number) => (
                <td key={j} className="p-3 text-slate-700">
                  {v}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);
