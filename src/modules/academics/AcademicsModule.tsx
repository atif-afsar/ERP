import React, { useState } from 'react';
import {
  GraduationCap,
  Plus,
  Users,
  Calendar,
  Clock,
  BookOpen,
  MapPin,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Layers,
  Building,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  ArrowUpRight,
  ShieldCheck,
  Award,
  RefreshCw,
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storageService';
import {
  AcademicClass,
  CoachingCourse,
  CoachingBatch,
  Staff,
  Student,
  Enrollment,
} from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Tabs } from '../../components/ui/Tabs';

interface AcademicYearSession {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'UPCOMING' | 'CLOSED' | 'ARCHIVED';
  enrolledStudentsCount: number;
}

const ACADEMIC_SESSIONS: AcademicYearSession[] = [
  {
    id: 'ay-2025',
    name: '2025–2026',
    startDate: '2025-04-01',
    endDate: '2026-03-31',
    status: 'CLOSED',
    enrolledStudentsCount: 420,
  },
  {
    id: 'ay-2026',
    name: '2026–2027',
    startDate: '2026-04-01',
    endDate: '2027-03-31',
    status: 'ACTIVE',
    enrolledStudentsCount: 485,
  },
  {
    id: 'ay-2027',
    name: '2027–2028',
    startDate: '2027-04-01',
    endDate: '2028-03-31',
    status: 'UPCOMING',
    enrolledStudentsCount: 0,
  },
];

interface SubjectItem {
  id: string;
  name: string;
  code: string;
  department: string;
  weeklyPeriods: number;
  passingMarks: number;
  maxMarks: number;
}

const SUBJECT_CATALOG: SubjectItem[] = [
  { id: 'sub-1', name: 'Physics', code: 'PHY-101', department: 'Science', weeklyPeriods: 6, passingMarks: 33, maxMarks: 100 },
  { id: 'sub-2', name: 'Mathematics', code: 'MTH-101', department: 'Mathematics', weeklyPeriods: 7, passingMarks: 33, maxMarks: 100 },
  { id: 'sub-3', name: 'Chemistry', code: 'CHM-101', department: 'Science', weeklyPeriods: 6, passingMarks: 33, maxMarks: 100 },
  { id: 'sub-4', name: 'Biology', code: 'BIO-101', department: 'Science', weeklyPeriods: 5, passingMarks: 33, maxMarks: 100 },
  { id: 'sub-5', name: 'English Literature', code: 'ENG-101', department: 'Languages', weeklyPeriods: 5, passingMarks: 33, maxMarks: 100 },
  { id: 'sub-6', name: 'Computer Science', code: 'CS-101', department: 'Technology', weeklyPeriods: 4, passingMarks: 33, maxMarks: 100 },
];

export const AcademicsModule: React.FC = () => {
  const { currentTenant, getLabel, isSchool, isCoaching } = useTenant();
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'hierarchy' | 'sessions' | 'subjects' | 'promotion'>('hierarchy');
  const [classes, setClasses] = useState<AcademicClass[]>(() => storage.getClasses(currentTenant.id));
  const [courses, setCourses] = useState<CoachingCourse[]>(() => storage.getCourses(currentTenant.id));
  const [batches, setBatches] = useState<CoachingBatch[]>(() => storage.getBatches(currentTenant.id));
  const [students, setStudents] = useState<Student[]>(() => storage.getStudents(currentTenant.id));
  const staff = storage.getStaff(currentTenant.id);

  // Group Create Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newCapacity, setNewCapacity] = useState('40');
  const [newSchedule, setNewSchedule] = useState('Mon-Fri 08:00 AM - 02:00 PM');
  const [newRoom, setNewRoom] = useState('Room 101');

  // Promotion Wizard State
  const [sourceClassId, setSourceClassId] = useState<string>(classes[0]?.id || '');
  const [destClassId, setDestClassId] = useState<string>(classes[1]?.id || classes[0]?.id || '');
  const [targetSession, setTargetSession] = useState<string>('2026–2027');
  const [selectedStudentIdsForPromotion, setSelectedStudentIdsForPromotion] = useState<string[]>([]);
  const [promotionSuccessMsg, setPromotionSuccessMsg] = useState<string | null>(null);

  // Get students in source group
  const sourceStudents = students.filter((s) => s.classId === sourceClassId || s.batchIds?.includes(sourceClassId));

  const handleSelectAllStudentsForPromotion = () => {
    if (selectedStudentIdsForPromotion.length === sourceStudents.length) {
      setSelectedStudentIdsForPromotion([]);
    } else {
      setSelectedStudentIdsForPromotion(sourceStudents.map((s) => s.id));
    }
  };

  const handleToggleStudentPromotion = (id: string) => {
    if (selectedStudentIdsForPromotion.includes(id)) {
      setSelectedStudentIdsForPromotion(selectedStudentIdsForPromotion.filter((item) => item !== id));
    } else {
      setSelectedStudentIdsForPromotion([...selectedStudentIdsForPromotion, id]);
    }
  };

  // Run Bulk Promotion
  const handleExecuteBulkPromotion = () => {
    if (selectedStudentIdsForPromotion.length === 0) return;

    const sourceName = classes.find((c) => c.id === sourceClassId)?.name || sourceClassId;
    const destName = classes.find((c) => c.id === destClassId)?.name || destClassId;

    // Update students
    const updatedStudents = students.map((s) => {
      if (selectedStudentIdsForPromotion.includes(s.id)) {
        // Record new enrollment snapshot
        storage.saveEnrollment({
          id: `enr-${Date.now()}-${s.id}`,
          tenantId: currentTenant.id,
          studentId: s.id,
          academicYearId: targetSession,
          classId: destClassId,
          status: 'ACTIVE',
          startDate: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        return {
          ...s,
          classId: destClassId,
        };
      }
      return s;
    });

    updatedStudents.forEach((st) => storage.saveStudent(st));
    setStudents(storage.getStudents(currentTenant.id));

    // Audit log
    storage.saveAuditLog({
      id: `audit_${Date.now()}`,
      tenantId: currentTenant.id,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'BULK_PROMOTION_EXECUTED',
      category: 'STUDENT',
      entityType: 'PROMOTION',
      entityId: destClassId,
      details: `Promoted ${selectedStudentIdsForPromotion.length} students from '${sourceName}' to '${destName}' for session '${targetSession}'.`,
      timestamp: new Date().toISOString(),
      status: 'SUCCESS',
    });

    setPromotionSuccessMsg(
      `Successfully promoted ${selectedStudentIdsForPromotion.length} students to ${destName} for academic session ${targetSession}!`
    );
    setSelectedStudentIdsForPromotion([]);
    setTimeout(() => setPromotionSuccessMsg(null), 4000);
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName) return;

    if (isSchool) {
      const newClass: AcademicClass = {
        id: `class-${Date.now()}`,
        tenantId: currentTenant.id,
        name: newGroupName,
        sections: [
          {
            id: `sec-${Date.now()}-A`,
            name: 'Section A',
            capacity: parseInt(newCapacity, 10) || 40,
            classTeacherId: staff[0]?.id || '',
          },
        ],
      };
      const updated = [...classes, newClass];
      setClasses(updated);
      storage.saveClasses(updated);
    } else {
      const newBatch: CoachingBatch = {
        id: `batch-${Date.now()}`,
        tenantId: currentTenant.id,
        courseId: courses[0]?.id || '',
        name: newGroupName,
        schedule: newSchedule,
        startDate: '2026-04-01',
        endDate: '2027-03-31',
        enrolledCount: 0,
        capacity: parseInt(newCapacity, 10) || 45,
        roomNo: newRoom,
        facultyIds: [staff[0]?.id || 'staff-1'],
      };
      const updated = [...batches, newBatch];
      setBatches(updated);
      storage.saveBatches(updated);
    }

    setNewGroupName('');
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-sky-400" />
              Academic Structure & Promotion Engine
            </h2>
            <Badge variant="emerald" size="sm" dot>
              {currentTenant.academicYear || '2026-2027'} (Active Session)
            </Badge>
          </div>
          <p className="text-xs text-slate-400">
            Institutional academic hierarchy, batch capacities, multi-year session lifecycle, and bulk student promotions.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsAddModalOpen(true)}
        >
          {isSchool ? 'New Class & Section' : 'New Course Batch'}
        </Button>
      </div>

      {/* Main Tabs */}
      <Tabs
        tabs={[
          { id: 'hierarchy', label: `🏛️ ${isSchool ? 'Classes & Sections' : 'Courses & Batches'} (${isSchool ? classes.length : batches.length})` },
          { id: 'sessions', label: `📅 Academic Sessions (${ACADEMIC_SESSIONS.length})` },
          { id: 'subjects', label: `📖 Subject Catalog (${SUBJECT_CATALOG.length})` },
          { id: 'promotion', label: '🚀 Student Promotion & Rollover Wizard' },
        ]}
        activeTab={activeTab}
        onChange={(t) => setActiveTab(t as any)}
      />

      {/* TAB 1: ACADEMIC HIERARCHY & CAPACITY */}
      {activeTab === 'hierarchy' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isSchool
              ? classes.map((c) => (
                  <div key={c.id} className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-white text-base">{c.name}</h4>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">{c.sections.length} Active Sections</p>
                      </div>
                      <Badge variant="blue" size="sm">
                        {c.stream || 'General Curriculum'}
                      </Badge>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      {c.sections.map((sec) => {
                        const mentor = staff.find((s) => s.id === sec.classTeacherId);
                        const enrolledCount = students.filter((s) => s.classId === c.id).length;
                        const capacityPct = Math.round((enrolledCount / sec.capacity) * 100);

                        return (
                          <div key={sec.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white">{sec.name}</span>
                              <span className="font-mono text-[11px] text-slate-400">
                                {enrolledCount} / {sec.capacity} Seats
                              </span>
                            </div>

                            {/* Capacity Progress Bar */}
                            <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  capacityPct >= 90 ? 'bg-amber-400' : 'bg-sky-400'
                                }`}
                                style={{ width: `${Math.min(100, capacityPct)}%` }}
                              />
                            </div>

                            {mentor && (
                              <p className="text-[10px] text-slate-400 flex items-center gap-1.5">
                                <span className="text-slate-500">Mentor:</span>
                                <span className="text-sky-300 font-medium">{mentor.name}</span>
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              : batches.map((b) => (
                  <div key={b.id} className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-white text-base">{b.name}</h4>
                        <p className="text-[11px] text-sky-400 font-medium mt-0.5">{b.roomNo}</p>
                      </div>
                      <Badge variant="purple" size="sm">
                        {b.enrolledCount} / {b.capacity} Enrolled
                      </Badge>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-300 font-mono">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>{b.schedule}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>{b.startDate} to {b.endDate}</span>
                      </div>
                    </div>
                  </div>
                ))}
          </div>
        </div>
      )}

      {/* TAB 2: ACADEMIC SESSIONS & LIFECYCLE */}
      {activeTab === 'sessions' && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-white text-base">Academic Session Timeline</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Multi-year academic periods with active institutional boundaries and enrollment stats.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ACADEMIC_SESSIONS.map((sess) => (
              <div
                key={sess.id}
                className={`p-5 rounded-2xl border transition-all ${
                  sess.status === 'ACTIVE'
                    ? 'bg-sky-500/10 border-sky-500/40 shadow-lg shadow-sky-500/5'
                    : 'bg-slate-950 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-white text-lg">{sess.name}</h4>
                  <Badge
                    variant={sess.status === 'ACTIVE' ? 'emerald' : sess.status === 'UPCOMING' ? 'blue' : 'slate'}
                    size="sm"
                  >
                    {sess.status}
                  </Badge>
                </div>

                <div className="space-y-2 text-xs text-slate-300 font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Term Period:</span>
                    <span>{sess.startDate} to {sess.endDate}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Active Students:</span>
                    <span className="text-sky-400 font-bold">{sess.enrolledStudentsCount}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: SUBJECT REPOSITORY */}
      {activeTab === 'subjects' && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-white text-base">Subject Catalog & Disciplines</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Authorized academic subject codes, period loads, and passing grade criteria.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SUBJECT_CATALOG.map((sub) => (
              <div key={sub.id} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-white text-sm">{sub.name}</h4>
                    <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] font-mono">
                      {sub.code}
                    </span>
                  </div>
                  <Badge variant="purple" size="sm">{sub.department}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 font-mono pt-2 border-t border-slate-800/80">
                  <div>Weekly Load: <span className="text-white font-bold">{sub.weeklyPeriods} Hrs</span></div>
                  <div>Passing: <span className="text-emerald-400 font-bold">{sub.passingMarks} / {sub.maxMarks}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: BULK PROMOTION WIZARD */}
      {activeTab === 'promotion' && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-sky-400" />
                Student Promotion & Year-End Rollover Wizard
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Bulk promote students to the next grade or batch with academic standing clearance and audit logs.
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              disabled={selectedStudentIdsForPromotion.length === 0}
              onClick={handleExecuteBulkPromotion}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Promote Selected ({selectedStudentIdsForPromotion.length})
            </Button>
          </div>

          {/* Success Notification */}
          {promotionSuccessMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>{promotionSuccessMsg}</span>
            </div>
          )}

          {/* Step 1 & 2 Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1 text-xs">
              <label className="text-slate-400 font-semibold">1. Source {getLabel('group')} (Current):</label>
              <select
                value={sourceClassId}
                onChange={(e) => {
                  setSourceClassId(e.target.value);
                  setSelectedStudentIdsForPromotion([]);
                }}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-semibold"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({students.filter((s) => s.classId === c.id).length} Students)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 text-xs">
              <label className="text-slate-400 font-semibold">2. Target Destination {getLabel('group')}:</label>
              <select
                value={destClassId}
                onChange={(e) => setDestClassId(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-semibold"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 text-xs">
              <label className="text-slate-400 font-semibold">3. Target Academic Session:</label>
              <select
                value={targetSession}
                onChange={(e) => setTargetSession(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-semibold"
              >
                <option value="2026–2027">2026–2027 (Active Session)</option>
                <option value="2027–2028">2027–2028 (Upcoming Session)</option>
              </select>
            </div>
          </div>

          {/* Student Promotion Candidates Table */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Promotion Candidates in Source Group ({sourceStudents.length} students)
              </span>
              <Button variant="outline" size="sm" onClick={handleSelectAllStudentsForPromotion}>
                {selectedStudentIdsForPromotion.length === sourceStudents.length ? 'Deselect All' : 'Select All Eligible'}
              </Button>
            </div>

            <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800 font-mono">
                    <tr>
                      <th className="p-3 w-10 text-center">Select</th>
                      <th className="p-3">Student Name</th>
                      <th className="p-3">Admission No</th>
                      <th className="p-3">Exam Standing</th>
                      <th className="p-3">Attendance Clearance</th>
                      <th className="p-3">Eligibility</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {sourceStudents.map((stu) => {
                      const isSelected = selectedStudentIdsForPromotion.includes(stu.id);

                      return (
                        <tr
                          key={stu.id}
                          onClick={() => handleToggleStudentPromotion(stu.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-sky-500/10' : 'hover:bg-slate-800/30'
                          }`}
                        >
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded border-slate-700 text-sky-500 focus:ring-0"
                            />
                          </td>

                          <td className="p-3 font-bold text-white flex items-center gap-2">
                            <img src={stu.photoUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                            <span>{stu.firstName} {stu.lastName}</span>
                          </td>

                          <td className="p-3 font-mono text-sky-400">{stu.admissionNo}</td>
                          <td className="p-3 font-mono text-purple-300 font-bold">85.4% (Pass)</td>
                          <td className="p-3 font-mono text-emerald-400 font-bold">92.0% (Clear)</td>

                          <td className="p-3">
                            <Badge variant="emerald" size="sm">
                              ELIGIBLE
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE NEW GROUP */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={isSchool ? 'Create New Class & Section' : 'Create New Course Batch'}
        maxWidth="md"
      >
        <form onSubmit={handleCreateGroup} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="text-slate-400 font-semibold">
              {isSchool ? 'Class / Grade Name *' : 'Batch Title *'}
            </label>
            <input
              type="text"
              required
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder={isSchool ? 'e.g. Class 11 - Commerce' : 'e.g. JEE 2027 Evening Booster'}
              className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-400 font-semibold">Maximum Student Capacity</label>
            <input
              type="number"
              value={newCapacity}
              onChange={(e) => setNewCapacity(e.target.value)}
              className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
            />
          </div>

          {isCoaching && (
            <>
              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">Weekly Schedule</label>
                <input
                  type="text"
                  value={newSchedule}
                  onChange={(e) => setNewSchedule(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">Room / Lab Allocation</label>
                <input
                  type="text"
                  value={newRoom}
                  onChange={(e) => setNewRoom(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Academic Group
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
