import React, { useState } from 'react';
import {
  Award,
  Plus,
  Printer,
  Sparkles,
  TrendingUp,
  BarChart3,
  Calendar,
  CheckCircle2,
  FileText,
  Users,
  Clock,
  MapPin,
  Check,
  X,
  Lock,
  Unlock,
  AlertTriangle,
  Send,
  Eye,
  BookOpen,
  GraduationCap,
  Layers,
  Building,
  RotateCcw,
  Save,
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storageService';
import { Exam, StudentExamResult, Student } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Tabs } from '../../components/ui/Tabs';

interface SubjectScheduleInput {
  subjectName: string;
  maxMarks: number;
  passMarks: number;
  date: string;
  startTime?: string;
  endTime?: string;
}

export const ExamsModule: React.FC = () => {
  const { currentTenant, getLabel, isSchool, isCoaching } = useTenant();
  const { currentUser, can } = useAuth();

  // Navigation State
  const [activeTab, setActiveTab] = useState<'schedules' | 'marks_entry' | 'leaderboard' | 'report_cards'>('schedules');

  // Primary State
  const [exams, setExams] = useState<Exam[]>(() => storage.getExams(currentTenant.id));
  const [examResults, setExamResults] = useState<StudentExamResult[]>(() => storage.getExamResults(currentTenant.id));
  const students = storage.getStudents(currentTenant.id);
  const classes = storage.getClasses(currentTenant.id);
  const batches = storage.getBatches(currentTenant.id);

  // Selected Exam Context
  const [selectedExamId, setSelectedExamId] = useState<string>(exams[0]?.id || '');
  const [selectedSubjectName, setSelectedSubjectName] = useState<string>('Mathematics');

  // Marks Entry State
  const [marksState, setMarksState] = useState<Record<string, number>>({
    'student-1': 88,
    'student-2': 94,
    'student-101': 91,
    'student-102': 78,
    'student-103': 64,
  });
  const [isMarksLocked, setIsMarksLocked] = useState(false);
  const [marksSaveToast, setMarksSaveToast] = useState<string | null>(null);

  // Modals State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedReportCardStudent, setSelectedReportCardStudent] = useState<Student | null>(null);
  const [publishSuccessMsg, setPublishSuccessMsg] = useState<string | null>(null);

  // Form State for Create Exam
  const [examForm, setExamForm] = useState({
    name: '',
    examType: isSchool ? 'MID_TERM' : 'JEE_MOCK',
    startDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    endDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    groupId: isSchool ? classes[0]?.id || '' : batches[0]?.id || '',
  });

  const [subjectsList, setSubjectsList] = useState<SubjectScheduleInput[]>([
    { subjectName: 'Mathematics', maxMarks: 100, passMarks: 33, date: '2026-09-15', startTime: '09:00 AM', endTime: '12:00 PM' },
    { subjectName: 'Physics', maxMarks: 100, passMarks: 33, date: '2026-09-17', startTime: '09:00 AM', endTime: '12:00 PM' },
    { subjectName: 'Chemistry', maxMarks: 100, passMarks: 33, date: '2026-09-19', startTime: '09:00 AM', endTime: '12:00 PM' },
  ]);

  const currentSelectedExam = exams.find((e) => e.id === selectedExamId) || exams[0];

  // Handle Save Exam
  const handleCreateExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!examForm.name) return;

    const newExam: Exam = {
      id: `exam-${Date.now()}`,
      tenantId: currentTenant.id,
      name: examForm.name,
      examType: isSchool ? 'SCHOOL_TERM' : 'COACHING_TEST_SERIES',
      groupIds: [examForm.groupId],
      startDate: examForm.startDate,
      endDate: examForm.endDate,
      totalMarks: subjectsList.reduce((acc, curr) => acc + curr.maxMarks, 0),
      isPublished: false,
      subjects: subjectsList,
    };

    storage.saveExam(newExam);
    setExams(storage.getExams(currentTenant.id));
    setIsAddModalOpen(false);
  };

  // Handle Save Marks
  const handleSaveMarks = () => {
    setMarksSaveToast(`Draft marks for ${selectedSubjectName} successfully saved.`);
    setTimeout(() => setMarksSaveToast(null), 3000);
  };

  // Handle Publish Exam Results
  const handlePublishResults = (examId: string) => {
    const updated = exams.map((e) => (e.id === examId ? { ...e, isPublished: true } : e));
    setExams(updated);
    const target = updated.find((e) => e.id === examId);
    if (target) storage.saveExam(target);

    // Audit log
    storage.saveAuditLog({
      id: `audit_${Date.now()}`,
      tenantId: currentTenant.id,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'EXAM_RESULTS_PUBLISHED',
      category: 'RESULTS',
      entityType: 'EXAM',
      entityId: examId,
      details: `Published official exam results for '${target?.name || examId}'. Report cards are now accessible to students & parents.`,
      timestamp: new Date().toISOString(),
      status: 'SUCCESS',
    });

    setPublishSuccessMsg(`Exam results successfully published! Student and parent portals updated.`);
    setTimeout(() => setPublishSuccessMsg(null), 4000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Award className="w-6 h-6 text-purple-400" />
              Examination & Assessment Suite
            </h2>
            <Badge variant="purple" size="sm" dot>
              Academic Year {currentTenant.academicYear || '2026-2027'}
            </Badge>
          </div>
          <p className="text-xs text-slate-400">
            Assessment scheduling, faculty marks entry console, grade calculations, result publishing, and official report cards.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsAddModalOpen(true)}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
        >
          Create Assessment Series
        </Button>
      </div>

      {/* Main Tabs */}
      <Tabs
        tabs={[
          { id: 'schedules', label: `📝 Assessment Series & Schedules (${exams.length})` },
          { id: 'marks_entry', label: '✍️ Faculty Marks Entry Console' },
          { id: 'leaderboard', label: '🏆 Leaderboard & Result Publishing' },
          { id: 'report_cards', label: `📄 Official Report Cards (${students.length})` },
        ]}
        activeTab={activeTab}
        onChange={(t) => setActiveTab(t as any)}
      />

      {/* TAB 1: ASSESSMENT SCHEDULES */}
      {activeTab === 'schedules' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exams.map((exam) => (
              <div key={exam.id} className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-white text-base">{exam.name}</h4>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      {exam.subjects.length} Subjects • Max {exam.totalMarks} Marks
                    </p>
                  </div>
                  <Badge variant={exam.isPublished ? 'emerald' : 'amber'} size="sm">
                    {exam.isPublished ? 'PUBLISHED' : 'IN GRADING'}
                  </Badge>
                </div>

                {/* Subject Sessions Roster */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Assessment Sessions
                  </span>
                  {exam.subjects.map((sub, i) => (
                    <div key={i} className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-white">{sub.subjectName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{sub.date}</p>
                      </div>
                      <span className="text-[11px] font-mono text-sky-400 font-bold">
                        Max: {sub.maxMarks}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-400">
                    {exam.startDate} to {exam.endDate}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedExamId(exam.id);
                      setActiveTab('marks_entry');
                    }}
                    leftIcon={<BookOpen className="w-3.5 h-3.5" />}
                  >
                    Enter Marks
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: MARKS ENTRY CONSOLE */}
      {activeTab === 'marks_entry' && (
        <div className="space-y-4">
          
          {/* Controls Bar */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-mono block">Select Exam:</label>
                <select
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  className="p-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-bold"
                >
                  {exams.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-mono block">Subject / Paper:</label>
                <select
                  value={selectedSubjectName}
                  onChange={(e) => setSelectedSubjectName(e.target.value)}
                  className="p-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-sky-300 font-bold font-mono"
                >
                  {currentSelectedExam?.subjects.map((sub, idx) => (
                    <option key={idx} value={sub.subjectName}>{sub.subjectName} (Max: {sub.maxMarks})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-mono block">Scoring Lock:</label>
                <button
                  onClick={() => setIsMarksLocked(!isMarksLocked)}
                  className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    isMarksLocked
                      ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                      : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  }`}
                >
                  {isMarksLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  <span>{isMarksLocked ? 'Scores Locked' : 'Unlocked'}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                disabled={isMarksLocked}
                onClick={handleSaveMarks}
                leftIcon={<Save className="w-3.5 h-3.5" />}
              >
                Save Draft Scores
              </Button>
            </div>
          </div>

          {/* Toast */}
          {marksSaveToast && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>{marksSaveToast}</span>
            </div>
          )}

          {/* Marks Scoring Table */}
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800 font-mono">
                  <tr>
                    <th className="p-3.5">Student Name</th>
                    <th className="p-3.5">Admission No</th>
                    <th className="p-3.5 w-40">Marks Obtained (Max: 100)</th>
                    <th className="p-3.5">Calculated %</th>
                    <th className="p-3.5">Grade</th>
                    <th className="p-3.5">Standing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {students.slice(0, 8).map((stu) => {
                    const markVal = marksState[stu.id] ?? 82;
                    const pct = Math.round((markVal / 100) * 100);
                    const grade = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B+' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : 'F';
                    const isPass = pct >= 33;

                    return (
                      <tr key={stu.id} className="hover:bg-slate-800/30">
                        <td className="p-3.5 font-bold text-white flex items-center gap-2.5">
                          <img src={stu.photoUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                          <span>{stu.firstName} {stu.lastName}</span>
                        </td>

                        <td className="p-3.5 font-mono text-sky-400">{stu.admissionNo}</td>

                        <td className="p-3.5">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            disabled={isMarksLocked}
                            value={markVal}
                            onChange={(e) =>
                              setMarksState({ ...marksState, [stu.id]: Number(e.target.value) })
                            }
                            className="w-24 p-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono font-bold text-center focus:border-sky-500"
                          />
                        </td>

                        <td className="p-3.5 font-mono font-bold text-slate-200">{pct}%</td>

                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 font-mono font-bold border border-purple-500/20">
                            {grade}
                          </span>
                        </td>

                        <td className="p-3.5">
                          <Badge variant={isPass ? 'emerald' : 'rose'} size="sm">
                            {isPass ? 'PASS' : 'FAIL'}
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
      )}

      {/* TAB 3: LEADERBOARD & PUBLISHING */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-6">
          
          {/* Action Header */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-white text-base">Academic Result Processing & Publishing</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Lock evaluated marks, generate final institutional report cards, and release to parent/student portals.
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => handlePublishResults(selectedExamId)}
              leftIcon={<Send className="w-3.5 h-3.5" />}
            >
              Publish Results & Release Cards
            </Button>
          </div>

          {/* Toast */}
          {publishSuccessMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>{publishSuccessMsg}</span>
            </div>
          )}

          {/* Top Rankers Podium */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-panel p-5 rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-500/5 to-transparent text-center space-y-2">
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold font-mono">
                🏆 RANK #1 (TOPPER)
              </span>
              <img
                src={students[1]?.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                alt=""
                className="w-16 h-16 rounded-full mx-auto object-cover border-2 border-amber-400 shadow-lg"
              />
              <h4 className="font-bold text-white text-sm">{students[1]?.firstName} {students[1]?.lastName}</h4>
              <p className="text-xl font-bold text-amber-300 font-mono">94.0%</p>
              <span className="text-[10px] text-slate-400 font-mono">Grade: A+ • 282/300 Marks</span>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-700 text-center space-y-2">
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold font-mono">
                🥈 RANK #2
              </span>
              <img
                src={students[0]?.photoUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'}
                alt=""
                className="w-16 h-16 rounded-full mx-auto object-cover border-2 border-slate-400 shadow-lg"
              />
              <h4 className="font-bold text-white text-sm">{students[0]?.firstName} {students[0]?.lastName}</h4>
              <p className="text-xl font-bold text-slate-200 font-mono">91.0%</p>
              <span className="text-[10px] text-slate-400 font-mono">Grade: A+ • 273/300 Marks</span>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-amber-700/30 text-center space-y-2">
              <span className="px-2 py-0.5 rounded-full bg-amber-700/20 text-amber-400 text-[10px] font-bold font-mono">
                🥉 RANK #3
              </span>
              <img
                src={students[2]?.photoUrl || 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150'}
                alt=""
                className="w-16 h-16 rounded-full mx-auto object-cover border-2 border-amber-600 shadow-lg"
              />
              <h4 className="font-bold text-white text-sm">{students[2]?.firstName} {students[2]?.lastName}</h4>
              <p className="text-xl font-bold text-amber-400 font-mono">88.5%</p>
              <span className="text-[10px] text-slate-400 font-mono">Grade: A • 265/300 Marks</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: OFFICIAL REPORT CARDS */}
      {activeTab === 'report_cards' && (
        <div className="space-y-4">
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-white text-sm">Official Academic Report Cards & Transcript Records</h4>
              <p className="text-xs text-slate-400">Generate, print, or export comprehensive marks transcripts.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {students.map((stu) => (
              <div key={stu.id} className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <img src={stu.photoUrl} alt="" className="w-10 h-10 rounded-full object-cover border border-slate-700" />
                    <div>
                      <h5 className="font-bold text-white text-sm">{stu.firstName} {stu.lastName}</h5>
                      <p className="text-[10px] text-sky-400 font-mono">{stu.admissionNo}</p>
                    </div>
                  </div>
                  <Badge variant="emerald" size="sm">PASS</Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 font-mono pt-2 border-t border-slate-800">
                  <div>Overall: <span className="text-white font-bold">88.5%</span></div>
                  <div>Grade: <span className="text-purple-400 font-bold">A</span></div>
                  <div>GPA: <span className="text-sky-400 font-bold">9.0 / 10</span></div>
                  <div>Attendance: <span className="text-emerald-400 font-bold">94%</span></div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setSelectedReportCardStudent(stu)}
                  leftIcon={<Eye className="w-3.5 h-3.5" />}
                >
                  View Official Marksheet
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: CREATE EXAM */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Create Assessment Series"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateExam} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="text-slate-400 font-semibold">Assessment Series Title *</label>
            <input
              type="text"
              required
              value={examForm.name}
              onChange={(e) => setExamForm({ ...examForm, name: e.target.value })}
              placeholder={isSchool ? 'e.g. CBSE Half-Yearly Examination 2026' : 'e.g. IIT-JEE Pinnacle All-India Mock #4'}
              className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-slate-400 font-semibold">Start Date</label>
              <input
                type="date"
                value={examForm.startDate}
                onChange={(e) => setExamForm({ ...examForm, startDate: e.target.value })}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-semibold">End Date</label>
              <input
                type="date"
                value={examForm.endDate}
                onChange={(e) => setExamForm({ ...examForm, endDate: e.target.value })}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Exam Series
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: OFFICIAL REPORT CARD PRINTABLE */}
      {selectedReportCardStudent && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedReportCardStudent(null)}
          title="Official Academic Transcript"
          maxWidth="2xl"
        >
          <div className="space-y-6 text-xs text-slate-300">
            
            {/* Header / Seal */}
            <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 text-center space-y-2">
              <h3 className="font-bold text-white text-lg tracking-wide uppercase font-mono">
                {currentTenant.name}
              </h3>
              <p className="text-[10px] text-sky-400 font-mono">OFFICIAL TRANSCRIPT OF ACADEMIC PERFORMANCE</p>
              <p className="text-[10px] text-slate-500 font-mono">Academic Session: {currentTenant.academicYear}</p>
            </div>

            {/* Student Demographics */}
            <div className="grid grid-cols-2 gap-3 p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px]">
              <div>Student Name: <span className="font-bold text-white">{selectedReportCardStudent.firstName} {selectedReportCardStudent.lastName}</span></div>
              <div>Admission No: <span className="font-bold text-sky-300">{selectedReportCardStudent.admissionNo}</span></div>
              <div>Parent / Guardian: <span className="text-slate-200">{selectedReportCardStudent.parentName}</span></div>
              <div>Attendance Clearance: <span className="text-emerald-400 font-bold">94.2% (Pass)</span></div>
            </div>

            {/* Subjects Table */}
            <div className="overflow-hidden rounded-xl border border-slate-800">
              <table className="w-full text-left font-mono text-[11px]">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-2.5">Subject</th>
                    <th className="p-2.5">Max Marks</th>
                    <th className="p-2.5">Pass Marks</th>
                    <th className="p-2.5">Marks Scored</th>
                    <th className="p-2.5">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  <tr>
                    <td className="p-2.5 text-white font-bold">Mathematics</td>
                    <td className="p-2.5">100</td>
                    <td className="p-2.5">33</td>
                    <td className="p-2.5 font-bold text-sky-300">92</td>
                    <td className="p-2.5 text-emerald-400 font-bold">A+</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-white font-bold">Physics</td>
                    <td className="p-2.5">100</td>
                    <td className="p-2.5">33</td>
                    <td className="p-2.5 font-bold text-sky-300">86</td>
                    <td className="p-2.5 text-purple-400 font-bold">A</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-white font-bold">Chemistry</td>
                    <td className="p-2.5">100</td>
                    <td className="p-2.5">33</td>
                    <td className="p-2.5 font-bold text-sky-300">88</td>
                    <td className="p-2.5 text-purple-400 font-bold">A</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Overall Summary */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between font-mono text-xs">
              <div>Total: <span className="font-bold text-white">266 / 300 (88.7%)</span></div>
              <div>Grade Point (GPA): <span className="font-bold text-sky-400">9.0 / 10.0</span></div>
              <Badge variant="emerald" size="md">FINAL RESULT: PASS</Badge>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <Button variant="outline" size="sm" onClick={() => window.print()} leftIcon={<Printer className="w-3.5 h-3.5" />}>
                Print Official Marksheet
              </Button>
            </div>

          </div>
        </Modal>
      )}

    </div>
  );
};
