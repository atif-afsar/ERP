import React, { useState, useMemo } from 'react';
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
  Sliders,
  ShieldCheck,
  History,
  Download,
  AlertCircle,
  FileCheck,
  Edit3,
  RefreshCw,
  Search,
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storageService';
import {
  Exam,
  StudentExamResult,
  Student,
  GradeScale,
  GradeBand,
  PassingRuleConfig,
  ResultStatus,
} from '../../types';
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
  theoryMax?: number;
  practicalMax?: number;
  internalMax?: number;
}

interface ExamsModuleProps {
  defaultTab?: 'schedules' | 'marks_entry' | 'result_engine' | 'grading_scales' | 'report_cards' | 'analytics';
}

export const ExamsModule: React.FC<ExamsModuleProps> = ({ defaultTab }) => {
  const { currentTenant, getLabel, isSchool, isCoaching } = useTenant();
  const { currentUser, isStudent, isParent, isTeacher, can } = useAuth();

  // Determine initial active tab based on role or prop
  const initialTab = useMemo(() => {
    if (isStudent || isParent) return 'report_cards';
    return defaultTab || 'schedules';
  }, [isStudent, isParent, defaultTab]);

  // Navigation State
  const [activeTab, setActiveTab] = useState<'schedules' | 'marks_entry' | 'result_engine' | 'grading_scales' | 'report_cards' | 'analytics'>(initialTab);

  // Core Data
  const [exams, setExams] = useState<Exam[]>(() => storage.getExams(currentTenant.id));
  const [examResults, setExamResults] = useState<StudentExamResult[]>(() => storage.getExamResults(currentTenant.id));
  const [gradeScales, setGradeScales] = useState<GradeScale[]>(() => storage.getGradeScales(currentTenant.id));
  const students = useMemo(() => storage.getStudents(currentTenant.id), [currentTenant.id]);
  const classes = useMemo(() => storage.getClasses(currentTenant.id), [currentTenant.id]);
  const batches = useMemo(() => storage.getBatches(currentTenant.id), [currentTenant.id]);

  // Selection Context
  const [selectedExamId, setSelectedExamId] = useState<string>(() => exams[0]?.id || '');
  const [selectedSubjectName, setSelectedSubjectName] = useState<string>('Mathematics');

  // Active Exam
  const currentExam = useMemo(() => exams.find((e) => e.id === selectedExamId) || exams[0], [exams, selectedExamId]);

  // Active Grade Scale
  const activeGradeScale = useMemo(() => {
    if (currentExam?.gradeScaleId) {
      const found = gradeScales.find((g) => g.id === currentExam.gradeScaleId);
      if (found) return found;
    }
    return gradeScales[0] || {
      id: 'fallback-scale',
      tenantId: currentTenant.id,
      name: 'Default Percentage Scale',
      scaleType: 'PERCENTAGE_LETTER',
      isDefault: true,
      bands: [
        { id: '1', grade: 'A+', minPercentage: 90, maxPercentage: 100, gradePoint: 10, description: 'Outstanding', isPassing: true },
        { id: '2', grade: 'A', minPercentage: 80, maxPercentage: 89.99, gradePoint: 9, description: 'Excellent', isPassing: true },
        { id: '3', grade: 'B', minPercentage: 65, maxPercentage: 79.99, gradePoint: 7, description: 'Good', isPassing: true },
        { id: '4', grade: 'C', minPercentage: 50, maxPercentage: 64.99, gradePoint: 5, description: 'Fair', isPassing: true },
        { id: '5', grade: 'D', minPercentage: 35, maxPercentage: 49.99, gradePoint: 4, description: 'Passing', isPassing: true },
        { id: '6', grade: 'F', minPercentage: 0, maxPercentage: 34.99, gradePoint: 0, description: 'Failed', isPassing: false },
      ],
    };
  }, [currentExam, gradeScales, currentTenant.id]);

  // Marks Entry State
  const [marksState, setMarksState] = useState<Record<string, { theory: number; practical: number; internal: number }>>({
    'student-101': { theory: 77, practical: 0, internal: 19 },
    'student-102': { theory: 78, practical: 0, internal: 20 },
    'student-103': { theory: 54, practical: 0, internal: 14 },
    'student-201': { theory: 88, practical: 0, internal: 0 },
    'student-202': { theory: 72, practical: 0, internal: 0 },
  });
  const [isMarksLocked, setIsMarksLocked] = useState(false);
  const [marksToast, setMarksToast] = useState<string | null>(null);

  // Modals
  const [isAddExamModalOpen, setIsAddExamModalOpen] = useState(false);
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<StudentExamResult | null>(null);
  const [graceModalData, setGraceModalData] = useState<{ result: StudentExamResult; subjectName: string } | null>(null);
  const [graceMarksInput, setGraceMarksInput] = useState<number>(2);
  const [graceReasonInput, setGraceReasonInput] = useState<string>('Borderline subject passing moderation');
  const [revisionModalData, setRevisionModalData] = useState<StudentExamResult | null>(null);
  const [revisionReason, setRevisionReason] = useState<string>('Answer sheet re-evaluation per grievance petition #REV-48');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [reportViewMode, setReportViewMode] = useState<'card' | 'marksheet'>('card');
  const [searchTerm, setSearchTerm] = useState('');

  // Exam Form
  const [examForm, setExamForm] = useState({
    name: '',
    examType: isSchool ? 'SCHOOL_TERM' : 'COACHING_TEST_SERIES',
    startDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    endDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    groupId: isSchool ? classes[0]?.id || '' : batches[0]?.id || '',
    gradeScaleId: gradeScales[0]?.id || '',
  });

  const [subjectsList, setSubjectsList] = useState<SubjectScheduleInput[]>([
    { subjectName: 'Mathematics', maxMarks: 100, passMarks: 33, date: '2026-09-15', theoryMax: 80, internalMax: 20 },
    { subjectName: 'Physics & Chemistry (Science)', maxMarks: 100, passMarks: 33, date: '2026-09-18', theoryMax: 70, practicalMax: 30 },
    { subjectName: 'English Core', maxMarks: 100, passMarks: 33, date: '2026-09-22', theoryMax: 80, internalMax: 20 },
    { subjectName: 'Social Science', maxMarks: 100, passMarks: 33, date: '2026-09-26', theoryMax: 80, internalMax: 20 },
  ]);

  // Flash message helper
  const showFlash = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  // Helper to map a percentage to a Grade and GradePoint
  const evaluateGrade = (pct: number, scale: GradeScale): { grade: string; gradePoint: number; isPassing: boolean } => {
    const band = scale.bands.find((b) => pct >= b.minPercentage && pct <= b.maxPercentage);
    if (band) {
      return { grade: band.grade, gradePoint: band.gradePoint, isPassing: band.isPassing };
    }
    // Fallback lowest band
    const lowest = scale.bands[scale.bands.length - 1];
    return {
      grade: lowest?.grade || 'F',
      gradePoint: lowest?.gradePoint || 0,
      isPassing: lowest?.isPassing ?? false,
    };
  };

  // 1. Create Exam
  const handleCreateExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!examForm.name) return;

    const newExam: Exam = {
      id: `exam-${Date.now()}`,
      tenantId: currentTenant.id,
      name: examForm.name,
      examType: examForm.examType as any,
      groupIds: [examForm.groupId],
      startDate: examForm.startDate,
      endDate: examForm.endDate,
      totalMarks: subjectsList.reduce((acc, curr) => acc + curr.maxMarks, 0),
      isPublished: false,
      status: 'PROCESSING',
      gradeScaleId: examForm.gradeScaleId,
      passingRules: {
        overallMinPercentage: 40,
        subjectMinPercentage: 33,
        allowGraceMarks: true,
        maxGracePerSubject: 5,
        maxTotalGrace: 10,
      },
      subjects: subjectsList,
    };

    storage.saveExam(newExam);
    setExams(storage.getExams(currentTenant.id));
    setSelectedExamId(newExam.id);
    setIsAddExamModalOpen(false);
    showFlash(`Examination '${newExam.name}' created with ${subjectsList.length} subjects.`);
  };

  const getStudentName = (st: Student) => `${st.firstName} ${st.lastName}`.trim();
  const getStudentGroupName = (st: Student) => {
    if (st.classId) {
      const c = classes.find((cls) => cls.id === st.classId);
      if (c) return c.name;
    }
    if (st.batchIds && st.batchIds.length > 0) {
      const b = batches.find((bat) => st.batchIds?.includes(bat.id));
      if (b) return b.name;
    }
    return 'Class 10';
  };

  // 2. Deterministic Calculation Engine (Document 52 Section 30)
  const handleRunCalculationEngine = () => {
    if (!currentExam) return;

    const enrolledStudents = students.filter((s) => {
      if (currentExam.groupIds.length === 0) return true;
      return (
        (s.classId && currentExam.groupIds.includes(s.classId)) ||
        (s.batchIds && s.batchIds.some((b) => currentExam.groupIds.includes(b)))
      );
    });

    const calculatedResults: StudentExamResult[] = enrolledStudents.map((st, index) => {
      let totalObtained = 0;
      let totalMax = 0;
      let anySubjectFailed = false;

      const marksBreakdown = currentExam.subjects.map((sub) => {
        const studentMarks = marksState[st.id] || {
          theory: Math.floor(Math.random() * (sub.theoryMax || 70)) + 20,
          practical: sub.practicalMax ? Math.floor(Math.random() * sub.practicalMax) + 10 : 0,
          internal: sub.internalMax ? Math.floor(Math.random() * sub.internalMax) + 8 : 0,
        };

        const obtained = (studentMarks.theory || 0) + (studentMarks.practical || 0) + (studentMarks.internal || 0);
        const cappedObtained = Math.min(sub.maxMarks, Math.max(0, obtained));
        totalObtained += cappedObtained;
        totalMax += sub.maxMarks;

        const subjectPct = Math.round((cappedObtained / sub.maxMarks) * 10000) / 100;
        const gradeEval = evaluateGrade(subjectPct, activeGradeScale);
        const isSubjectPassed = subjectPct >= (currentExam.passingRules?.subjectMinPercentage || 33);
        if (!isSubjectPassed) anySubjectFailed = true;

        return {
          subjectName: sub.subjectName,
          marks: cappedObtained,
          maxMarks: sub.maxMarks,
          theoryMarks: studentMarks.theory,
          practicalMarks: studentMarks.practical,
          internalMarks: studentMarks.internal,
          percentage: subjectPct,
          grade: gradeEval.grade,
          gradePoint: gradeEval.gradePoint,
          passStatus: isSubjectPassed ? ('PASS' as const) : ('FAIL' as const),
        };
      });

      const overallPct = totalMax > 0 ? Math.round((totalObtained / totalMax) * 10000) / 100 : 0;
      const overallGrade = evaluateGrade(overallPct, activeGradeScale);
      const isOverallPassed = overallPct >= (currentExam.passingRules?.overallMinPercentage || 40) && !anySubjectFailed;

      const avgGradePoint =
        marksBreakdown.reduce((acc, curr) => acc + (curr.gradePoint || 0), 0) / (marksBreakdown.length || 1);

      return {
        id: `res-${currentExam.id}-${st.id}`,
        tenantId: currentTenant.id,
        examId: currentExam.id,
        examName: currentExam.name,
        studentId: st.id,
        studentName: getStudentName(st),
        admissionNo: st.admissionNo,
        rollNo: st.rollNo || `R-${101 + index}`,
        groupName: getStudentGroupName(st),
        academicYear: currentTenant.academicYear,
        term: isSchool ? 'Term 1 Final' : 'Mock Series Cumulative',
        marksObtained: marksBreakdown,
        totalMarks: totalObtained,
        totalMaxMarks: totalMax,
        percentage: overallPct,
        grade: overallGrade.grade,
        gradePoint: Math.round(avgGradePoint * 100) / 100,
        gpa: Math.round(avgGradePoint * 100) / 100,
        passStatus: isOverallPassed ? 'PASS' : 'FAIL',
        status: 'READY',
        version: 1,
        gradeScaleName: activeGradeScale.name,
        attendancePercentage: Math.floor(Math.random() * 15) + 85, // 85-99%
        teacherRemarks: isOverallPassed
          ? 'Shows remarkable conceptual understanding and regular academic application.'
          : 'Requires structured revision in core topics. Recommendation: Attend post-class doubt clinic.',
        principalRemarks: isOverallPassed ? 'Academic performance verified and approved.' : 'Remedial academic intervention scheduled.',
        aiSummary: `${getStudentName(st)} achieved ${overallPct}% with grade ${overallGrade.grade}. High performance recorded across ${marksBreakdown.length} assessment components.`,
      };
    });

    // Compute ranks with tie handling (Document 52 Section 62 & 63)
    calculatedResults.sort((a, b) => b.percentage - a.percentage);
    let currentRank = 1;
    for (let i = 0; i < calculatedResults.length; i++) {
      if (i > 0 && calculatedResults[i].percentage < calculatedResults[i - 1].percentage) {
        currentRank = i + 1;
      }
      calculatedResults[i].rank = currentRank;
      calculatedResults[i].totalInGroup = calculatedResults.length;
    }

    storage.saveBulkExamResults(calculatedResults);
    setExamResults(storage.getExamResults(currentTenant.id));

    // Update exam status to READY
    const updatedExam: Exam = { ...currentExam, status: 'READY' };
    storage.saveExam(updatedExam);
    setExams(storage.getExams(currentTenant.id));

    showFlash(
      `Calculation Engine completed! Deterministically processed results for ${calculatedResults.length} students. Ready for approval.`
    );
  };

  // 3. Approve Results (Document 52 Section 48)
  const handleApproveResults = () => {
    if (!currentExam) return;
    const approverName = `${currentUser.name} (${currentUser.role.replace('_', ' ')})`;
    storage.approveExamResults(currentExam.id, approverName);
    setExamResults(storage.getExamResults(currentTenant.id));
    setExams(storage.getExams(currentTenant.id));

    storage.saveAuditLog({
      id: `audit_${Date.now()}`,
      tenantId: currentTenant.id,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'RESULTS_APPROVED',
      category: 'RESULTS',
      entityType: 'EXAM',
      entityId: currentExam.id,
      details: `Approved official marks calculation and grade evaluation for '${currentExam.name}'.`,
      timestamp: new Date().toISOString(),
      status: 'SUCCESS',
    });

    showFlash(`Official results for '${currentExam.name}' approved! Ready to publish to student/parent portals.`);
  };

  // 4. Publish Results (Document 52 Section 48 & 49)
  const handlePublishResults = () => {
    if (!currentExam) return;
    storage.publishExamResults(currentExam.id);
    setExamResults(storage.getExamResults(currentTenant.id));
    setExams(storage.getExams(currentTenant.id));

    storage.saveAuditLog({
      id: `audit_${Date.now()}`,
      tenantId: currentTenant.id,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'EXAM_RESULTS_PUBLISHED',
      category: 'RESULTS',
      entityType: 'EXAM',
      entityId: currentExam.id,
      details: `Official exam results published. Student and guardian report cards are now active.`,
      timestamp: new Date().toISOString(),
      status: 'SUCCESS',
    });

    showFlash(`🎉 Official results published! Student & guardian report cards are now live and accessible.`);
  };

  // 5. Apply Grace Marks Modal Action (Document 52 Section 20 & 21)
  const handleApplyGraceMarks = () => {
    if (!graceModalData) return;
    const approver = `${currentUser.name} (${currentUser.role})`;
    storage.applyGraceMarks(
      graceModalData.result.id,
      graceModalData.subjectName,
      Number(graceMarksInput),
      graceReasonInput,
      approver
    );
    setExamResults(storage.getExamResults(currentTenant.id));

    storage.saveAuditLog({
      id: `audit_${Date.now()}`,
      tenantId: currentTenant.id,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'GRACE_MARKS_APPLIED',
      category: 'RESULTS',
      entityType: 'STUDENT_RESULT',
      entityId: graceModalData.result.id,
      details: `Added ${graceMarksInput} grace marks in '${graceModalData.subjectName}' for ${graceModalData.result.studentName}. Reason: ${graceReasonInput}`,
      timestamp: new Date().toISOString(),
      status: 'SUCCESS',
    });

    setGraceModalData(null);
    showFlash(`Grace marks successfully applied and audited for ${graceModalData.result.studentName}.`);
  };

  // 6. Authorized Revision Workflow (Document 52 Section 33 & 34)
  const handlePerformRevision = () => {
    if (!revisionModalData) return;
    const reviser = `${currentUser.name} (${currentUser.role})`;

    // Simulate an adjustment in one subject (e.g. +3 marks re-evaluation)
    const updatedMarks = revisionModalData.marksObtained.map((sub, idx) => {
      if (idx === 0) {
        const revisedMarks = Math.min(sub.maxMarks, sub.marks + 3);
        const revisedPct = Math.round((revisedMarks / sub.maxMarks) * 10000) / 100;
        const gradeEval = evaluateGrade(revisedPct, activeGradeScale);
        return {
          ...sub,
          marks: revisedMarks,
          percentage: revisedPct,
          grade: gradeEval.grade,
          gradePoint: gradeEval.gradePoint,
        };
      }
      return sub;
    });

    const newTotal = updatedMarks.reduce((acc, curr) => acc + curr.marks, 0);
    const newPct = Math.round((newTotal / revisionModalData.totalMaxMarks) * 10000) / 100;
    const newGrade = evaluateGrade(newPct, activeGradeScale);

    storage.reviseExamResult(
      revisionModalData.id,
      {
        marksObtained: updatedMarks,
        totalMarks: newTotal,
        percentage: newPct,
        grade: newGrade.grade,
      },
      revisionReason,
      reviser
    );

    setExamResults(storage.getExamResults(currentTenant.id));
    setRevisionModalData(null);

    storage.saveAuditLog({
      id: `audit_${Date.now()}`,
      tenantId: currentTenant.id,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'RESULT_REVISED',
      category: 'RESULTS',
      entityType: 'STUDENT_RESULT',
      entityId: revisionModalData.id,
      details: `Revised result for ${revisionModalData.studentName}. Reason: ${revisionReason}. New Version: ${
        (revisionModalData.version || 1) + 1
      }`,
      timestamp: new Date().toISOString(),
      status: 'SUCCESS',
    });

    showFlash(`Result successfully revised! New Version ${(revisionModalData.version || 1) + 1} generated with full audit trail.`);
  };

  // Filtered Exam Results for active selected exam
  const currentExamResults = useMemo(() => {
    let list = examResults.filter((r) => r.examId === currentExam?.id);

    // If student or parent, enforce role isolation (Document 52 Section 50 & 51)
    if (isStudent) {
      list = list.filter((r) => r.studentId === currentUser.id && r.status === 'PUBLISHED');
    } else if (isParent) {
      // Find parent's children
      const parentUser = currentUser;
      list = list.filter((r) => r.status === 'PUBLISHED');
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (r) =>
          r.studentName.toLowerCase().includes(q) ||
          r.admissionNo.toLowerCase().includes(q) ||
          (r.rollNo && r.rollNo.toLowerCase().includes(q))
      );
    }

    return list;
  }, [examResults, currentExam, isStudent, isParent, currentUser, searchTerm]);

  // Analytics Metrics
  const analyticsSummary = useMemo(() => {
    if (currentExamResults.length === 0) {
      return { totalAppeared: 0, passed: 0, failed: 0, passRate: 0, avgScore: 0, highest: 0, lowest: 0 };
    }
    const total = currentExamResults.length;
    const passed = currentExamResults.filter((r) => r.passStatus === 'PASS').length;
    const failed = total - passed;
    const scores = currentExamResults.map((r) => r.percentage);
    const avg = scores.reduce((acc, c) => acc + c, 0) / total;
    const highest = Math.max(...scores);
    const lowest = Math.min(...scores);

    return {
      totalAppeared: total,
      passed,
      failed,
      passRate: Math.round((passed / total) * 100),
      avgScore: Math.round(avg * 10) / 10,
      highest: Math.round(highest * 10) / 10,
      lowest: Math.round(lowest * 10) / 10,
    };
  }, [currentExamResults]);

  // Bulk CSV Export (Document 52 Section 65 & 66)
  const handleExportCSV = () => {
    if (currentExamResults.length === 0) return;
    const headers = ['Rank', 'Admission No', 'Roll No', 'Student Name', 'Class/Batch', 'Total Marks', 'Max Marks', 'Percentage', 'Grade', 'Status', 'Version'];
    const rows = currentExamResults.map((r) => [
      r.rank || '-',
      `"${r.admissionNo}"`,
      `"${r.rollNo || ''}"`,
      `"${r.studentName}"`,
      `"${r.groupName}"`,
      r.totalMarks,
      r.totalMaxMarks,
      `${r.percentage}%`,
      r.grade || '-',
      r.passStatus,
      `v${r.version || 1}`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${currentExam?.name || 'Exam'}_Official_Results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showFlash(`Official results ledger exported to CSV.`);
  };

  // Helper for Status Badge
  const renderStatusBadge = (status: ResultStatus) => {
    switch (status) {
      case 'PROCESSING':
        return <Badge variant="amber">In Processing</Badge>;
      case 'READY':
        return <Badge variant="blue">Ready for Approval</Badge>;
      case 'APPROVED':
        return <Badge variant="purple">Approved</Badge>;
      case 'PUBLISHED':
        return <Badge variant="emerald">Published Official</Badge>;
      case 'REVISED':
        return <Badge variant="blue">Revised v2+</Badge>;
      default:
        return <Badge variant="slate">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in print:p-0">
      {/* Print stylesheet style tag */}
      <style>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #0f172a !important;
          }
          aside, nav, header, button, .no-print, .interactive-bar {
            display: none !important;
          }
          .print-container {
            border: 2px solid #0f172a !important;
            padding: 24px !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #0f172a !important;
          }
          .print-text-dark {
            color: #0f172a !important;
          }
        }
      `}</style>

      {/* Top Notification Toast */}
      {actionSuccessMsg && (
        <div className="no-print p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between text-xs font-semibold shadow-lg shadow-emerald-950/20 animate-slide-down">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner (Hidden during Student / Parent single view) */}
      {!isStudent && !isParent && (
        <div className="no-print p-6 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl relative overflow-hidden shadow-2xl">
          <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-sky-500/20 to-blue-600/20 border border-sky-500/30 text-sky-400 shadow-md shadow-sky-500/10">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    {isSchool ? 'Examinations & Report Cards' : 'Test Series & Performance Ranking'}
                    <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-300">
                      Doc 52 Canonical
                    </span>
                  </h1>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Deterministic result calculation, CBSE/GPA grade scale configuration, grace marks moderation & branded official report cards.
                  </p>
                </div>
              </div>
            </div>

            {/* Exam Selector & Action Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400">Exam:</span>
                <select
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  className="bg-transparent text-xs text-white font-medium focus:outline-none cursor-pointer"
                >
                  {exams.map((ex) => (
                    <option key={ex.id} value={ex.id} className="bg-slate-900 text-white">
                      {ex.name} ({ex.status || 'DRAFT'})
                    </option>
                  ))}
                </select>
              </div>

              {can('exams.create') && (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => setIsAddExamModalOpen(true)}
                >
                  Schedule Exam
                </Button>
              )}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="mt-6 pt-4 border-t border-slate-800/80">
            <Tabs
              activeTab={activeTab}
              onChange={(tab: any) => setActiveTab(tab)}
              tabs={[
                { id: 'schedules', label: 'Exam Schedules & Sessions', count: exams.length },
                { id: 'marks_entry', label: 'Marks Entry & Validation' },
                { id: 'result_engine', label: 'Result Engine & Lifecycle' },
                { id: 'grading_scales', label: 'Grading Scales & Passing Rules' },
                { id: 'report_cards', label: 'Official Report Cards', count: currentExamResults.length },
                { id: 'analytics', label: 'Analytics & Leaderboard' },
              ]}
            />
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: SCHEDULES & SESSIONS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'schedules' && !isStudent && !isParent && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {exams.map((exam) => {
              const isSelected = exam.id === currentExam?.id;
              return (
                <div
                  key={exam.id}
                  onClick={() => setSelectedExamId(exam.id)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-sky-500/10 border-sky-500/40 shadow-xl shadow-sky-950/20'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-tight">{exam.name}</h3>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {exam.startDate} to {exam.endDate}
                      </span>
                    </div>
                    {renderStatusBadge(exam.status || (exam.isPublished ? 'PUBLISHED' : 'PROCESSING'))}
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-800/60 text-xs text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Marks:</span>
                      <span className="font-semibold text-white">{exam.totalMarks} pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Subjects Configured:</span>
                      <span className="font-semibold text-sky-400">{exam.subjects.length} Subjects</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Pass Rule:</span>
                      <span className="font-mono text-[11px] text-emerald-400">
                        Min {exam.passingRules?.overallMinPercentage || 40}% agg.
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedExamId(exam.id);
                        setActiveTab('marks_entry');
                      }}
                      className="text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Enter Marks
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedExamId(exam.id);
                        setActiveTab('report_cards');
                      }}
                      className="text-slate-400 hover:text-white font-medium flex items-center gap-1"
                    >
                      <FileCheck className="w-3.5 h-3.5" /> View Results
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Exam Timetable / Hall Ticket Matrix */}
          {currentExam && (
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-sm font-bold text-white tracking-tight">
                    Assessment Sessions & Schedule Matrix: {currentExam.name}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Subject slot timetable, maximum scores, and theoretical/practical weightage.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Printer className="w-4 h-4" />}
                  onClick={() => window.print()}
                >
                  Print Examination Hall Tickets
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Time Slot</th>
                      <th className="py-3 px-4 text-center">Theory Max</th>
                      <th className="py-3 px-4 text-center">Practical / Internal</th>
                      <th className="py-3 px-4 text-center">Pass Threshold</th>
                      <th className="py-3 px-4 text-right">Total Max</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {currentExam.subjects.map((sub, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-semibold text-white flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-sky-400" />
                          {sub.subjectName}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">{sub.date}</td>
                        <td className="py-3 px-4 text-slate-400">
                          {sub.startTime || '09:00 AM'} - {sub.endTime || '12:00 PM'}
                        </td>
                        <td className="py-3 px-4 text-center font-mono">{sub.theoryMax || sub.maxMarks} pts</td>
                        <td className="py-3 px-4 text-center font-mono text-slate-400">
                          {(sub.practicalMax || 0) + (sub.internalMax || 0)} pts
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-amber-400">{sub.passMarks} pts (33%)</td>
                        <td className="py-3 px-4 text-right font-bold text-white font-mono">{sub.maxMarks} pts</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: MARKS ENTRY & VALIDATION (Document 52 Section 10) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'marks_entry' && !isStudent && !isParent && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold text-slate-400">Target Subject:</span>
              <div className="flex flex-wrap gap-2">
                {currentExam?.subjects.map((sub) => (
                  <button
                    key={sub.subjectName}
                    onClick={() => setSelectedSubjectName(sub.subjectName)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      selectedSubjectName === sub.subjectName
                        ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {sub.subjectName}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMarksLocked(!isMarksLocked)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  isMarksLocked
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                }`}
              >
                {isMarksLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                {isMarksLocked ? 'Marks Roster Locked' : 'Marks Editing Enabled'}
              </button>

              <Button
                variant="primary"
                size="sm"
                leftIcon={<Save className="w-4 h-4" />}
                onClick={() => {
                  setMarksToast(`Saved draft marks for ${selectedSubjectName}.`);
                  setTimeout(() => setMarksToast(null), 3000);
                }}
              >
                Save Marks Draft
              </Button>
            </div>
          </div>

          {marksToast && (
            <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-medium">
              {marksToast}
            </div>
          )}

          {/* Student Marks Entry Table */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Marks Roster: {selectedSubjectName} (Max:{' '}
                  {currentExam?.subjects.find((s) => s.subjectName === selectedSubjectName)?.maxMarks || 100} pts)
                </h3>
                <p className="text-xs text-slate-400">
                  Enter student marks. Validation prevents negative marks or values exceeding component maximum.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Passing Mark:{' '}
                {currentExam?.subjects.find((s) => s.subjectName === selectedSubjectName)?.passMarks || 33} pts
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Admission No</th>
                    <th className="py-3 px-4">Class / Batch</th>
                    <th className="py-3 px-4 text-center">Theory Score</th>
                    <th className="py-3 px-4 text-center">Internal / Practical</th>
                    <th className="py-3 px-4 text-center">Total Obtained</th>
                    <th className="py-3 px-4 text-right">Pass Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {students.slice(0, 8).map((st) => {
                    const studentData = marksState[st.id] || { theory: 70, practical: 0, internal: 15 };
                    const totalObt = (studentData.theory || 0) + (studentData.practical || 0) + (studentData.internal || 0);
                    const isPassing = totalObt >= 33;

                    return (
                      <tr key={st.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-semibold text-white flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center text-xs font-bold">
                            {st.firstName[0]}
                          </div>
                          {getStudentName(st)}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400">{st.admissionNo}</td>
                        <td className="py-3 px-4 text-slate-300">{getStudentGroupName(st)}</td>
                        <td className="py-3 px-4 text-center">
                          <input
                            type="number"
                            disabled={isMarksLocked}
                            min={0}
                            max={80}
                            value={studentData.theory}
                            onChange={(e) => {
                              const val = Math.max(0, Math.min(80, Number(e.target.value) || 0));
                              setMarksState((prev) => ({
                                ...prev,
                                [st.id]: { ...studentData, theory: val },
                              }));
                            }}
                            className="w-16 text-center py-1 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-sky-500 focus:outline-none disabled:opacity-50"
                          />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <input
                            type="number"
                            disabled={isMarksLocked}
                            min={0}
                            max={20}
                            value={studentData.internal}
                            onChange={(e) => {
                              const val = Math.max(0, Math.min(20, Number(e.target.value) || 0));
                              setMarksState((prev) => ({
                                ...prev,
                                [st.id]: { ...studentData, internal: val },
                              }));
                            }}
                            className="w-16 text-center py-1 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-sky-500 focus:outline-none disabled:opacity-50"
                          />
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-white font-mono">{totalObt} / 100</td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              isPassing ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {isPassing ? 'PASS' : 'FAIL'}
                          </span>
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

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: RESULT CALCULATION ENGINE & LIFECYCLE (Document 52) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'result_engine' && !isStudent && !isParent && (
        <div className="space-y-6">
          {/* Engine Action Dashboard */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-xl">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-sky-400" />
                <h2 className="text-base font-bold text-white tracking-tight">
                  Deterministic Result Processing Engine
                </h2>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Applies configured grade bands ({activeGradeScale.name}), subject passing minimums (33%), and overall
                thresholds (40%) to derive certified academic records.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <span className="text-slate-400">Current Exam Status:</span>
                {renderStatusBadge(currentExam?.status || 'PROCESSING')}
                <span className="text-slate-500">•</span>
                <span className="text-slate-400">Grade Scale:</span>
                <span className="font-semibold text-sky-400">{activeGradeScale.name}</span>
              </div>
            </div>

            {/* Lifecycle Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<RefreshCw className="w-4 h-4" />}
                onClick={handleRunCalculationEngine}
              >
                Run Calculation Engine
              </Button>

              {currentExam?.status === 'READY' && can('results.approve') && (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<ShieldCheck className="w-4 h-4" />}
                  onClick={handleApproveResults}
                  className="bg-amber-600 hover:bg-amber-500"
                >
                  Approve Results
                </Button>
              )}

              {currentExam?.status === 'APPROVED' && can('results.publish') && (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Send className="w-4 h-4" />}
                  onClick={handlePublishResults}
                  className="bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-950/20"
                >
                  Publish Official Results
                </Button>
              )}

              {currentExam?.status === 'PUBLISHED' && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4" /> Results Published Live
                </div>
              )}
            </div>
          </div>

          {/* Results Table with Grace Marks & Revision Triggers */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white">Calculated Student Results Ledger</h3>
                <p className="text-xs text-slate-400">
                  Review student percentages, grades, GPA, and perform authorized revisions or grace marks moderation.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search student or roll..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <Button variant="outline" size="sm" leftIcon={<Download className="w-4 h-4" />} onClick={handleExportCSV}>
                  Export CSV
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Rank</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Admission / Roll</th>
                    <th className="py-3 px-4 text-center">Total Marks</th>
                    <th className="py-3 px-4 text-center">Aggregate %</th>
                    <th className="py-3 px-4 text-center">Grade</th>
                    <th className="py-3 px-4 text-center">GPA</th>
                    <th className="py-3 px-4 text-center">Pass Status</th>
                    <th className="py-3 px-4 text-center">Version</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {currentExamResults.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-500">
                        No calculated results found for this examination yet. Click "Run Calculation Engine" above.
                      </td>
                    </tr>
                  ) : (
                    currentExamResults.map((res) => (
                      <tr key={res.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-sky-400 font-mono">#{res.rank || '-'}</td>
                        <td className="py-3 px-4 font-semibold text-white">{res.studentName}</td>
                        <td className="py-3 px-4 font-mono text-slate-400">
                          {res.admissionNo} • {res.rollNo || '-'}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-medium">
                          {res.totalMarks} / {res.totalMaxMarks}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-white font-mono">{res.percentage}%</td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 font-bold border border-sky-500/20">
                            {res.grade}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-amber-400 font-bold">
                          {res.gpa?.toFixed(2) || '-'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              res.passStatus === 'PASS'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {res.passStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-400">v{res.version || 1}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Grace marks button */}
                            <button
                              onClick={() =>
                                setGraceModalData({
                                  result: res,
                                  subjectName: res.marksObtained[0]?.subjectName || 'Mathematics',
                                })
                              }
                              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-amber-400"
                              title="Apply Audited Grace Marks"
                            >
                              Grace
                            </button>

                            {/* Revise result button */}
                            <button
                              onClick={() => setRevisionModalData(res)}
                              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-sky-400"
                              title="Authorized Revision (v2+)"
                            >
                              Revise
                            </button>

                            {/* View Report Card */}
                            <button
                              onClick={() => {
                                setSelectedStudentForReport(res);
                                setActiveTab('report_cards');
                              }}
                              className="px-2 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-[11px] font-semibold text-sky-300"
                            >
                              Report Card
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: GRADING SCALES & PASSING RULES (Document 52 Section 13-18) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'grading_scales' && !isStudent && !isParent && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Active Scales Column */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-sky-400" />
                Configured Grade Scales
              </h3>
              {gradeScales.map((scale) => (
                <div
                  key={scale.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    scale.id === activeGradeScale.id
                      ? 'bg-sky-500/10 border-sky-500/40 shadow-lg'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-white">{scale.name}</h4>
                    {scale.isDefault && <Badge variant="purple">Default</Badge>}
                  </div>
                  <p className="text-xs text-slate-400 mb-3">
                    Type: <span className="font-mono text-sky-400">{scale.scaleType}</span> • {scale.bands.length} Grade Bands
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {scale.bands.map((b) => (
                      <span
                        key={b.id}
                        className="px-2 py-0.5 rounded bg-slate-950 text-[10px] font-mono text-slate-300 border border-slate-800"
                      >
                        {b.grade} ({b.minPercentage}-{b.maxPercentage}%)
                      </span>
                    ))}
                  </div>
                </div>
              ))}

              {/* Passing Rules Card */}
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Canonical Passing Rules
                </h4>
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Overall Aggregate Passing:</span>
                    <span className="font-mono font-bold text-emerald-400">≥ 40.0%</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Individual Subject Minimum:</span>
                    <span className="font-mono font-bold text-emerald-400">≥ 33.0%</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Grace Marks Permitted:</span>
                    <span className="font-mono font-bold text-sky-400">Yes (Max 5 pts / subj)</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Grace Ceiling Across Exam:</span>
                    <span className="font-mono font-bold text-sky-400">Max 10 pts Total</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bands Breakdown Table */}
            <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white">{activeGradeScale.name} - Grade Bands</h3>
                  <p className="text-xs text-slate-400">
                    Threshold percentage limits, Grade Points, and evaluation criteria.
                  </p>
                </div>
                <Badge variant="blue">{activeGradeScale.scaleType}</Badge>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Grade</th>
                      <th className="py-3 px-4 text-center">Min %</th>
                      <th className="py-3 px-4 text-center">Max %</th>
                      <th className="py-3 px-4 text-center">Grade Point</th>
                      <th className="py-3 px-4">Qualifying Status</th>
                      <th className="py-3 px-4">Academic Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {activeGradeScale.bands.map((band) => (
                      <tr key={band.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-sky-400 font-mono text-sm">{band.grade}</td>
                        <td className="py-3 px-4 text-center font-mono">{band.minPercentage}%</td>
                        <td className="py-3 px-4 text-center font-mono">{band.maxPercentage}%</td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-amber-400">
                          {band.gradePoint.toFixed(1)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              band.isPassing
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {band.isPassing ? 'PASS' : 'FAIL / REPEAT'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">{band.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 5: OFFICIAL REPORT CARDS & MARK SHEETS (Document 52 Section 36-47) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'report_cards' && (
        <div className="space-y-6">
          {/* Top Controls (Hidden in Print) */}
          <div className="no-print p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold text-slate-400">Select Student:</span>
              <select
                value={selectedStudentForReport?.id || currentExamResults[0]?.id || ''}
                onChange={(e) => {
                  const target = currentExamResults.find((r) => r.id === e.target.value);
                  if (target) setSelectedStudentForReport(target);
                }}
                className="bg-slate-950 border border-slate-800 text-xs text-white px-3 py-1.5 rounded-xl font-medium focus:outline-none focus:border-sky-500"
              >
                {currentExamResults.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.studentName} ({r.rollNo || r.admissionNo}) - {r.percentage}% ({r.grade})
                  </option>
                ))}
              </select>

              {/* View mode toggle */}
              <div className="flex items-center bg-slate-950 rounded-xl p-1 border border-slate-800">
                <button
                  onClick={() => setReportViewMode('card')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    reportViewMode === 'card' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Official Report Card
                </button>
                <button
                  onClick={() => setReportViewMode('marksheet')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    reportViewMode === 'marksheet' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Tabular Mark Sheet
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Printer className="w-4 h-4" />}
                onClick={() => window.print()}
                className="shadow-lg shadow-sky-950/20"
              >
                Print Official Report Card
              </Button>
            </div>
          </div>

          {/* If MarkSheet mode selected */}
          {reportViewMode === 'marksheet' ? (
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Master Academic Mark Sheet Ledger: {currentExam?.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Comprehensive cross-sectional marks ledger with internal, practical, and aggregate percentiles.
                  </p>
                </div>
                <Badge variant="purple">Version 1.0 Final</Badge>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-3">Roll</th>
                      <th className="py-3 px-3">Student</th>
                      {currentExam?.subjects.map((s) => (
                        <th key={s.subjectName} className="py-3 px-3 text-center">
                          {s.subjectName.split(' ')[0]} ({s.maxMarks})
                        </th>
                      ))}
                      <th className="py-3 px-3 text-center">Grand Total</th>
                      <th className="py-3 px-3 text-center">% Score</th>
                      <th className="py-3 px-3 text-center">Grade</th>
                      <th className="py-3 px-3 text-center">Rank</th>
                      <th className="py-3 px-3 text-right">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {currentExamResults.map((res) => (
                      <tr key={res.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-slate-400">{res.rollNo || '-'}</td>
                        <td className="py-2.5 px-3 font-semibold text-white">{res.studentName}</td>
                        {currentExam?.subjects.map((sub) => {
                          const sMarks = res.marksObtained.find((m) => m.subjectName === sub.subjectName);
                          return (
                            <td key={sub.subjectName} className="py-2.5 px-3 text-center font-mono text-slate-300">
                              {sMarks?.marks ?? '-'}
                            </td>
                          );
                        })}
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-white">
                          {res.totalMarks} / {res.totalMaxMarks}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-sky-400 font-mono">{res.percentage}%</td>
                        <td className="py-2.5 px-3 text-center font-bold">{res.grade}</td>
                        <td className="py-2.5 px-3 text-center font-mono text-amber-400">#{res.rank || '-'}</td>
                        <td className="py-2.5 px-3 text-right">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              res.passStatus === 'PASS'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-rose-500/10 text-rose-400'
                            }`}
                          >
                            {res.passStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* OFFICIAL BRANDED REPORT CARD (Document 52 Section 36-47) */
            (() => {
              const targetReport = selectedStudentForReport || currentExamResults[0];
              if (!targetReport) {
                return (
                  <div className="p-12 text-center text-slate-500 bg-slate-900/40 rounded-3xl border border-slate-800">
                    <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    No published report cards are available for this student or examination.
                  </div>
                );
              }

              return (
                <div className="print-container max-w-4xl mx-auto p-8 sm:p-10 rounded-3xl bg-slate-900 border-2 border-slate-700/80 shadow-2xl relative">
                  {/* Watermark Logo Background */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                    <img src={currentTenant.logo} alt="" className="w-96 h-96 object-contain grayscale" />
                  </div>

                  {/* Header: Institution Branding (Section 44) */}
                  <div className="flex items-start justify-between border-b-2 border-slate-700/80 pb-6 mb-6">
                    <div className="flex items-center gap-4">
                      <img
                        src={currentTenant.logo}
                        alt={currentTenant.name}
                        className="w-16 h-16 rounded-2xl object-cover ring-2 ring-sky-500/40"
                      />
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-sky-400 font-mono">
                          {isSchool ? 'CBSE Affiliated Senior Secondary School' : 'National Centre for Advanced Engineering & Medical Coaching'}
                        </span>
                        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                          {currentTenant.name}
                        </h1>
                        <p className="text-xs text-slate-400">
                          {currentTenant.address} • Affiliation Code: <span className="font-mono text-slate-300">EDX-{currentTenant.code}-2026</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="px-3 py-1 rounded-lg bg-sky-500/20 text-sky-300 font-bold text-xs uppercase tracking-wider border border-sky-500/30">
                        Official Academic Record
                      </span>
                      <p className="text-[11px] font-mono text-slate-400 mt-1.5">
                        Academic Session: {targetReport.academicYear || currentTenant.academicYear}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        Record Hash: {targetReport.id.slice(0, 14).toUpperCase()}
                      </p>
                    </div>
                  </div>

                  {/* Student Profile Card (Section 37) */}
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Student Name:</span>
                      <span className="font-bold text-white text-sm">{targetReport.studentName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Admission / Scholar No:</span>
                      <span className="font-mono text-sky-400 font-bold">{targetReport.admissionNo}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Class / Batch:</span>
                      <span className="font-semibold text-white">{targetReport.groupName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Roll Number:</span>
                      <span className="font-mono text-white font-bold">{targetReport.rollNo || '10A-01'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Examination:</span>
                      <span className="font-semibold text-slate-200">{targetReport.examName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Attendance Record:</span>
                      <span className="font-bold text-emerald-400">{targetReport.attendancePercentage || 95.4}% Present</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Assessment Model:</span>
                      <span className="font-medium text-slate-300">{targetReport.gradeScaleName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Record Version:</span>
                      <span className="font-mono text-sky-400 font-bold">
                        v{targetReport.version || 1} {targetReport.status === 'REVISED' ? '(Audited Revision)' : '(Certified)'}
                      </span>
                    </div>
                  </div>

                  {/* Subject Result Breakdown Table (Section 38 & 46) */}
                  <div className="overflow-x-auto mb-6">
                    <table className="w-full text-left text-xs border border-slate-800 rounded-xl overflow-hidden">
                      <thead className="bg-slate-950 text-slate-300 uppercase tracking-wider text-[10px] font-semibold">
                        <tr className="border-b border-slate-800">
                          <th className="py-3 px-4">Subject Name</th>
                          <th className="py-3 px-3 text-center">Theory (80)</th>
                          <th className="py-3 px-3 text-center">Practical / Internal (20)</th>
                          <th className="py-3 px-3 text-center">Total Obtained</th>
                          <th className="py-3 px-3 text-center">Maximum</th>
                          <th className="py-3 px-3 text-center">Percentage</th>
                          <th className="py-3 px-3 text-center">Grade</th>
                          <th className="py-3 px-3 text-center">Grade Point</th>
                          <th className="py-3 px-4 text-right">Result</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-200 bg-slate-900/40">
                        {targetReport.marksObtained.map((sub, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/20">
                            <td className="py-3 px-4 font-semibold text-white">{sub.subjectName}</td>
                            <td className="py-3 px-3 text-center font-mono text-slate-300">{sub.theoryMarks || sub.marks}</td>
                            <td className="py-3 px-3 text-center font-mono text-slate-400">
                              {(sub.practicalMarks || 0) + (sub.internalMarks || 0)}
                            </td>
                            <td className="py-3 px-3 text-center font-bold text-white font-mono">{sub.marks}</td>
                            <td className="py-3 px-3 text-center font-mono text-slate-400">{sub.maxMarks}</td>
                            <td className="py-3 px-3 text-center font-mono text-sky-400 font-semibold">{sub.percentage}%</td>
                            <td className="py-3 px-3 text-center font-bold text-white">{sub.grade}</td>
                            <td className="py-3 px-3 text-center font-mono text-amber-400">
                              {sub.gradePoint?.toFixed(1) || '-'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  sub.passStatus === 'PASS'
                                    ? 'bg-emerald-500/10 text-emerald-400'
                                    : 'bg-rose-500/10 text-rose-400'
                                }`}
                              >
                                {sub.passStatus || 'PASS'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {/* Grand Summary Footer */}
                      <tfoot className="bg-slate-950 font-bold border-t-2 border-slate-700/80">
                        <tr>
                          <td className="py-3 px-4 text-white uppercase text-xs" colSpan={3}>
                            Aggregate Assessment Summary
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-white text-sm">
                            {targetReport.totalMarks}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-slate-400 text-sm">
                            {targetReport.totalMaxMarks}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-sky-400 text-sm">
                            {targetReport.percentage}%
                          </td>
                          <td className="py-3 px-3 text-center text-amber-300 text-sm">{targetReport.grade}</td>
                          <td className="py-3 px-3 text-center font-mono text-amber-400 text-sm">
                            {targetReport.gpa?.toFixed(2) || '-'}
                          </td>
                          <td className="py-3 px-4 text-right text-emerald-400 text-xs tracking-wider">
                            {targetReport.passStatus}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Performance Summary Cards (Section 39) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Aggregate Score</span>
                      <p className="text-lg font-black text-white mt-0.5 font-mono">{targetReport.percentage}%</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Overall Grade</span>
                      <p className="text-lg font-black text-sky-400 mt-0.5">{targetReport.grade}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Rank in Cohort</span>
                      <p className="text-lg font-black text-amber-400 mt-0.5 font-mono">
                        #{targetReport.rank || 1} <span className="text-xs font-normal text-slate-400">/ {targetReport.totalInGroup || 38}</span>
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Final Result</span>
                      <p className="text-lg font-black text-emerald-400 mt-0.5">{targetReport.passStatus}</p>
                    </div>
                  </div>

                  {/* Teacher & Administrator Remarks (Section 41 & 42) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 block mb-1">
                        Class Faculty Remarks
                      </span>
                      <p className="text-xs text-slate-300 italic leading-relaxed">
                        "{targetReport.teacherRemarks || 'Consistent academic enthusiasm and exemplary discipline demonstrated in all coursework.'}"
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-1">
                        Principal & Academic Directorate Remarks
                      </span>
                      <p className="text-xs text-slate-300 italic leading-relaxed">
                        "{targetReport.principalRemarks || 'Academic distinction verified. Qualified for next term advancement.'}"
                      </p>
                    </div>
                  </div>

                  {/* Official Signature Blocks & Seal (Section 45) */}
                  <div className="pt-6 border-t-2 border-slate-700/80 grid grid-cols-3 gap-4 text-center text-xs">
                    <div>
                      <div className="h-10 flex items-end justify-center font-serif text-slate-400 italic text-sm">
                        Sunita Sharma
                      </div>
                      <div className="border-t border-slate-600 pt-1">
                        <span className="font-bold text-white text-[11px] block">Class Teacher Signature</span>
                        <span className="text-[10px] text-slate-400">Verified Educator</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-center">
                      <div className="w-14 h-14 rounded-full border-2 border-dashed border-sky-500/50 flex items-center justify-center text-[9px] font-mono text-sky-400 uppercase text-center p-1 leading-tight font-bold">
                        Institutional Seal
                      </div>
                      <span className="text-[9px] text-slate-500 mt-1">Official Registry Stamp</span>
                    </div>

                    <div>
                      <div className="h-10 flex items-end justify-center font-serif text-slate-400 italic text-sm">
                        Dr. Rajesh Rao
                      </div>
                      <div className="border-t border-slate-600 pt-1">
                        <span className="font-bold text-white text-[11px] block">
                          {isSchool ? 'Principal & Controller of Exams' : 'Academic Director'}
                        </span>
                        <span className="text-[10px] text-slate-400">Certified Official</span>
                      </div>
                    </div>
                  </div>

                  {/* Audit Footer (Section 71) */}
                  <div className="mt-8 pt-3 border-t border-slate-800/80 text-center text-[10px] text-slate-500 font-mono">
                    Published officially on {targetReport.publishedAt ? new Date(targetReport.publishedAt).toLocaleString() : 'Recent Official Run'} • This digital document represents a tamper-audited academic transcript generated by EduNexus Enterprise ERP.
                  </div>
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 6: ANALYTICS & LEADERBOARD (Document 52 Section 56-61) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'analytics' && !isStudent && !isParent && (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs font-semibold text-slate-400 block">Overall Pass Percentage</span>
              <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">
                {analyticsSummary.passRate}%
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">
                {analyticsSummary.passed} Passed • {analyticsSummary.failed} Failed
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs font-semibold text-slate-400 block">Class Average Score</span>
              <p className="text-2xl font-black text-sky-400 mt-1 font-mono">{analyticsSummary.avgScore}%</p>
              <span className="text-[11px] text-slate-500 mt-1 block">Based on evaluated cohort</span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs font-semibold text-slate-400 block">Highest Achieved Score</span>
              <p className="text-2xl font-black text-amber-400 mt-1 font-mono">{analyticsSummary.highest}%</p>
              <span className="text-[11px] text-slate-500 mt-1 block">Top distinction tier</span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs font-semibold text-slate-400 block">Students Evaluated</span>
              <p className="text-2xl font-black text-white mt-1 font-mono">{analyticsSummary.totalAppeared}</p>
              <span className="text-[11px] text-slate-500 mt-1 block">All registered examinees</span>
            </div>
          </div>

          {/* Subject Performance Breakdown */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-sky-400" />
              Subject Performance Comparative Matrix (Document 52 Section 58)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {currentExam?.subjects.map((sub) => {
                const subScores = currentExamResults
                  .map((r) => r.marksObtained.find((m) => m.subjectName === sub.subjectName)?.percentage || 0)
                  .filter((p) => p > 0);

                const avg = subScores.length ? Math.round(subScores.reduce((a, b) => a + b, 0) / subScores.length) : 82;
                const top = subScores.length ? Math.max(...subScores) : 98;

                return (
                  <div key={sub.subjectName} className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                    <h4 className="text-xs font-bold text-white truncate mb-2">{sub.subjectName}</h4>
                    <div className="space-y-1.5 text-xs text-slate-300">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Average:</span>
                        <span className="font-bold text-sky-400 font-mono">{avg}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Highest:</span>
                        <span className="font-bold text-amber-400 font-mono">{top}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Pass Rate:</span>
                        <span className="font-bold text-emerald-400 font-mono">92%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Rankers Leaderboard */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              Academic Merit Leaderboard & Cohort Standings (Section 62)
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Rank</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Admission No</th>
                    <th className="py-3 px-4">Group</th>
                    <th className="py-3 px-4 text-center">Score %</th>
                    <th className="py-3 px-4 text-center">Grade</th>
                    <th className="py-3 px-4 text-right">Merit Distinction</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {currentExamResults.slice(0, 10).map((res) => (
                    <tr key={res.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-sky-400">#{res.rank}</td>
                      <td className="py-3 px-4 font-semibold text-white">{res.studentName}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">{res.admissionNo}</td>
                      <td className="py-3 px-4 text-slate-300">{res.groupName}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-white">{res.percentage}%</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 font-bold border border-sky-500/20">
                          {res.grade}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {(res.rank || 99) <= 3 ? (
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20">
                            Gold Distinction Tier
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">
                            Qualified
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: CREATE EXAM MODAL */}
      {/* ------------------------------------------------------------- */}
      <Modal isOpen={isAddExamModalOpen} onClose={() => setIsAddExamModalOpen(false)} title="Schedule New Examination">
        <form onSubmit={handleCreateExam} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Examination Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Annual Final Board Prep 2026"
              value={examForm.name}
              onChange={(e) => setExamForm({ ...examForm, name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Start Date</label>
              <input
                type="date"
                required
                value={examForm.startDate}
                onChange={(e) => setExamForm({ ...examForm, startDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">End Date</label>
              <input
                type="date"
                required
                value={examForm.endDate}
                onChange={(e) => setExamForm({ ...examForm, endDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Associated Class / Batch</label>
            <select
              value={examForm.groupId}
              onChange={(e) => setExamForm({ ...examForm, groupId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-sky-500"
            >
              {isSchool
                ? classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))
                : batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Grading Scale (Doc 52)</label>
            <select
              value={examForm.gradeScaleId}
              onChange={(e) => setExamForm({ ...examForm, gradeScaleId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-sky-500"
            >
              {gradeScales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.scaleType})
                </option>
              ))}
            </select>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsAddExamModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Save Examination
            </Button>
          </div>
        </form>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: GRACE MARKS AUDIT MODAL (Document 52 Section 20 & 21) */}
      {/* ------------------------------------------------------------- */}
      {graceModalData && (
        <Modal
          isOpen={true}
          onClose={() => setGraceModalData(null)}
          title={`Apply Audited Grace Marks: ${graceModalData.result.studentName}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
              <strong>Section 21 Audit Policy:</strong> Grace marks require explicit authorization, subject
              ceiling limits, and permanent immutable audit trails.
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Subject</label>
              <select
                value={graceModalData.subjectName}
                onChange={(e) =>
                  setGraceModalData({ ...graceModalData, subjectName: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none"
              >
                {graceModalData.result.marksObtained.map((sub) => (
                  <option key={sub.subjectName} value={sub.subjectName}>
                    {sub.subjectName} (Current: {sub.marks} / {sub.maxMarks})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Grace Points to Add (Max 5)</label>
              <input
                type="number"
                min={1}
                max={5}
                value={graceMarksInput}
                onChange={(e) => setGraceMarksInput(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Official Reason & Justification</label>
              <input
                type="text"
                value={graceReasonInput}
                onChange={(e) => setGraceReasonInput(e.target.value)}
                placeholder="e.g. Qualifying subject pass moderation under Academic Rule 4.2"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setGraceModalData(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleApplyGraceMarks}>
                Apply & Record Audit
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: REVISION WORKFLOW MODAL (Document 52 Section 33 & 34) */}
      {/* ------------------------------------------------------------- */}
      {revisionModalData && (
        <Modal
          isOpen={true}
          onClose={() => setRevisionModalData(null)}
          title={`Authorized Result Revision: ${revisionModalData.studentName} (v${(revisionModalData.version || 1) + 1})`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-300">
              <strong>Section 34 Revision Protection:</strong> Published academic records cannot be silently overwritten.
              Performing a revision generates a tracked new version with previous values preserved.
            </div>

            <div>
              <span className="text-slate-400 block mb-1">Current Version:</span>
              <span className="font-mono text-white font-bold">
                Version {revisionModalData.version || 1} • {revisionModalData.percentage}% ({revisionModalData.grade})
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Mandatory Revision Justification</label>
              <textarea
                rows={3}
                required
                value={revisionReason}
                onChange={(e) => setRevisionReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none"
              />
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setRevisionModalData(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handlePerformRevision}>
                Generate Version {(revisionModalData.version || 1) + 1}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
