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
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storageService';
import { Exam, StudentExamResult } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Tabs } from '../../components/ui/Tabs';

export const ExamsModule: React.FC = () => {
  const { currentTenant, getLabel, isSchool, isCoaching } = useTenant();
  const { can } = useAuth();
  const [exams, setExams] = useState<Exam[]>(() => storage.getExams(currentTenant.id));
  const results = storage.getExamResults(currentTenant.id);
  const classes = storage.getClasses(currentTenant.id);
  const batches = storage.getBatches(currentTenant.id);

  const [selectedResult, setSelectedResult] = useState<StudentExamResult | null>(null);
  const [activeTab, setActiveTab] = useState<'assessments' | 'results'>('assessments');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    type: 'MID_TERM',
    startDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    endDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    totalMarks: '100',
    groupName: isSchool ? 'Class 10 - Section A' : 'JEE Alpha 2027',
  });

  const handleCreateExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    const newExam: Exam = {
      id: `exam-${Date.now()}`,
      tenantId: currentTenant.id,
      name: formData.name,
      examType: isSchool ? 'SCHOOL_TERM' : 'COACHING_TEST_SERIES',
      groupIds: [isSchool ? 'class-10-a' : 'batch-jee-alpha'],
      startDate: formData.startDate,
      endDate: formData.endDate,
      totalMarks: parseInt(formData.totalMarks, 10) || 100,
      isPublished: true,
      subjects: [
        {
          subjectName: 'Mathematics',
          maxMarks: 100,
          passMarks: 33,
          date: formData.startDate,
        },
        {
          subjectName: 'Physics',
          maxMarks: 100,
          passMarks: 33,
          date: formData.endDate,
        },
      ],
    };

    storage.saveExam(newExam);
    setExams(storage.getExams(currentTenant.id));
    setIsAddModalOpen(false);
    setFormData({
      name: '',
      type: 'MID_TERM',
      startDate: '',
      endDate: '',
      totalMarks: '100',
      groupName: isSchool ? 'Class 10 - Section A' : 'JEE Alpha 2027',
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {getLabel('examPlural')} & Assessments
            </h2>
            <Badge variant="emerald" size="sm" dot>
              Academic Year {currentTenant.academicYear || '2026-2027'}
            </Badge>
          </div>
          <p className="text-xs text-slate-400">
            {isSchool
              ? 'Organize term examinations, subject schedules, and CBSE official Report Cards.'
              : 'Conduct All-India Test Series, mock test evaluations, percentiles, and rank leaderboards.'}
          </p>
        </div>

        {can('exams.create') && (
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsAddModalOpen(true)}
          >
            Create {getLabel('exam')}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'assessments', label: `📅 ${getLabel('examPlural')} & Schedules (${exams.length})` },
          { id: 'results', label: `🏆 ${getLabel('reportCard')} & Leaderboards (${results.length})` },
        ]}
        activeTab={activeTab}
        onChange={(t) => setActiveTab(t as any)}
      />

      {/* TAB 1: ASSESSMENTS & SCHEDULES */}
      {activeTab === 'assessments' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 hover:border-sky-500/40 transition-all"
            >
              <div className="flex items-center justify-between">
                <Badge variant="purple" size="sm">
                  {isSchool ? 'CBSE Term Exam' : 'Mock Test Series'}
                </Badge>
                <Badge variant={exam.isPublished ? 'emerald' : 'slate'} size="sm" dot>
                  {exam.isPublished ? 'Published Schedule' : 'Draft'}
                </Badge>
              </div>

              <div>
                <h3 className="font-bold text-white text-base">{exam.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Schedule: {exam.startDate} to {exam.endDate}
                </p>
              </div>

              {/* Scheduled Subjects */}
              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                <p className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                  Assessment Schedule ({exam.subjects.length} Subjects):
                </p>
                {exam.subjects.map((sub, i) => (
                  <div
                    key={i}
                    className="p-3 bg-slate-900/70 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-white">{sub.subjectName}</span>
                      <p className="text-[10px] text-slate-400">Date: {sub.date} • Pass: {sub.passMarks}</p>
                    </div>
                    <span className="font-mono font-semibold text-sky-400">Max: {sub.maxMarks}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>Total Marks: {exam.totalMarks}</span>
                <span className="text-emerald-400 font-medium">Evaluation Active</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: PUBLISHED RESULTS & REPORT CARDS */}
      {activeTab === 'results' && (
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">
              {isSchool ? 'Published Term Examination Results' : 'Mock Test Series Leaderboard'}
            </h3>
            <Badge variant="purple" size="sm">Session {currentTenant.academicYear}</Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4">Rank</th>
                  <th className="px-6 py-4">{getLabel('student')}</th>
                  <th className="px-6 py-4">{getLabel('exam')}</th>
                  <th className="px-6 py-4">Total Score</th>
                  <th className="px-6 py-4">{isSchool ? 'Percentage / Grade' : 'Percentile'}</th>
                  <th className="px-6 py-4 text-right">Report Card</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {results.map((res) => (
                  <tr key={res.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="w-7 h-7 rounded-full bg-amber-500/10 text-amber-400 font-extrabold flex items-center justify-center border border-amber-500/20">
                        #{res.rank}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <p className="font-bold text-white">{res.studentName}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{res.admissionNo}</p>
                    </td>

                    <td className="px-6 py-4 font-medium text-slate-300">
                      {res.examName}
                    </td>

                    <td className="px-6 py-4 font-bold text-white">
                      {res.totalMarks} / {res.totalMaxMarks}
                    </td>

                    <td className="px-6 py-4">
                      <Badge variant="emerald" size="sm">
                        {res.percentage}% {res.grade ? `(${res.grade})` : ''}
                      </Badge>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<FileText className="w-3.5 h-3.5" />}
                        onClick={() => setSelectedResult(res)}
                      >
                        Generate {getLabel('reportCard')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Create Exam */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={`New ${getLabel('exam')} Assessment`}
        subtitle={`Schedule a new ${getLabel('exam').toLowerCase()} with subject breakdown and maximum marks.`}
        maxWidth="md"
      >
        <form onSubmit={handleCreateExam} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">{getLabel('exam')} Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={isSchool ? 'e.g. Mid-Term Examination 2026' : 'e.g. All-India JEE Advanced Mock Test 02'}
              className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Start Date *</label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">End Date *</label>
              <input
                type="date"
                required
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Total Maximum Score *</label>
            <input
              type="number"
              required
              value={formData.totalMarks}
              onChange={(e) => setFormData({ ...formData, totalMarks: e.target.value })}
              placeholder={isSchool ? '500' : '300'}
              className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Publish {getLabel('exam')} Schedule
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Official Report Card */}
      {selectedResult && (
        <Modal
          isOpen={!!selectedResult}
          onClose={() => setSelectedResult(null)}
          title={`Official ${getLabel('reportCard')}`}
          subtitle={`${selectedResult.studentName} (${selectedResult.admissionNo})`}
          maxWidth="2xl"
        >
          <div className="space-y-6 text-xs printable-area">
            {/* Header Report */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <img src={currentTenant.logo} alt="Logo" className="w-12 h-12 rounded-xl object-cover" />
                <div>
                  <h3 className="font-bold text-white text-base">{currentTenant.name}</h3>
                  <p className="text-slate-400 text-xs">{currentTenant.tagline}</p>
                </div>
              </div>
              <div className="text-right">
                <Badge variant="purple" size="sm">{selectedResult.examName}</Badge>
                <p className="text-slate-400 text-[11px] mt-1">Session: 2026-2027</p>
              </div>
            </div>

            {/* Student Info Card */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-950/60 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-400 text-[10px]">Student Name</span>
                <p className="font-bold text-white">{selectedResult.studentName}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[10px]">Admission No</span>
                <p className="font-mono text-white">{selectedResult.admissionNo}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[10px]">{getLabel('group')}</span>
                <p className="font-semibold text-white">{selectedResult.groupName}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[10px]">Academic Rank</span>
                <p className="font-bold text-amber-400">#{selectedResult.rank} of {selectedResult.totalInGroup}</p>
              </div>
            </div>

            {/* Marks Table */}
            <div className="rounded-xl border border-slate-800 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3">Max Marks</th>
                    <th className="px-4 py-3">Marks Scored</th>
                    <th className="px-4 py-3 text-right">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {selectedResult.marksObtained.map((sub, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2.5 font-medium text-white">{sub.subjectName}</td>
                      <td className="px-4 py-2.5 text-slate-400">{sub.maxMarks}</td>
                      <td className="px-4 py-2.5 font-bold text-sky-400">{sub.marks}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-emerald-400">{sub.grade}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-900/80 font-bold">
                    <td className="px-4 py-3 text-white">Grand Total</td>
                    <td className="px-4 py-3 text-slate-300">{selectedResult.totalMaxMarks}</td>
                    <td className="px-4 py-3 text-sky-400">{selectedResult.totalMarks}</td>
                    <td className="px-4 py-3 text-right text-emerald-400">{selectedResult.percentage}% ({selectedResult.grade})</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* AI Academic Performance Summary */}
            {selectedResult.aiSummary && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-sky-950/40 via-purple-950/30 to-slate-950 border border-sky-500/30 space-y-1.5">
                <div className="flex items-center gap-1.5 text-sky-400 font-bold">
                  <Sparkles className="w-4 h-4" />
                  <span>AI Performance Analysis & Teacher Recommendation</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  {selectedResult.aiSummary}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <Button
                variant="primary"
                leftIcon={<Printer className="w-4 h-4" />}
                onClick={() => window.print()}
              >
                Print Official {getLabel('reportCard')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
