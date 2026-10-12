import React, { useEffect, useState } from 'react';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { examinationService as api } from '../../services/examinationService';
import { Award, Printer, ArrowLeft, RefreshCw, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

const date = (v: any) => (v ? String(v).slice(0, 10) : '—');

export const StudentParentResultsModule: React.FC = () => {
  const { currentTenant } = useTenant();
  const { currentUser } = useAuth();
  const t = currentTenant.id;
  const isParent = currentUser.role === 'PARENT';

  // Parent State
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');

  // Results & Report Card State
  const [results, setResults] = useState<any[]>([]);
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [isLinked, setIsLinked] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [activeReportCard, setActiveReportCard] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState<boolean>(false);

  // 1. Initial Load: Children (Parent) or Self Results (Student)
  useEffect(() => {
    let active = true;
    setError('');
    setActiveReportCard(null);
    setResults([]);

    if (isParent) {
      setLoading(true);
      api
        .parentChildren(t)
        .then((res: any) => {
          if (!active) return;
          const list = res.data || [];
          setChildren(list);
          if (list.length > 0) {
            setSelectedChildId(list[0].id);
          } else {
            setLoading(false);
          }
        })
        .catch((err: any) => {
          if (!active) return;
          setError(err.message || 'Failed to load linked children.');
          setLoading(false);
        });
    } else {
      loadStudentResults();
    }

    return () => {
      active = false;
    };
  }, [t, currentUser.id, currentUser.role]);

  // 2. Load Results when Child Selection Changes (Parent)
  useEffect(() => {
    if (!isParent || !selectedChildId) return;
    loadParentChildResults(selectedChildId);
  }, [selectedChildId]);

  const loadStudentResults = async () => {
    setLoading(true);
    setError('');
    setActiveReportCard(null);
    try {
      const res = await api.studentResults(t);
      if (res.data.linked === false) {
        setIsLinked(false);
        setStudentInfo(null);
        setResults([]);
      } else {
        setIsLinked(true);
        setStudentInfo(res.data.student);
        setResults(res.data.results || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load examination results.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const loadParentChildResults = async (childId: string) => {
    setLoading(true);
    setError('');
    setActiveReportCard(null);
    setResults([]);
    try {
      const res = await api.parentChildResults(t, childId);
      setStudentInfo(res.data.child);
      setResults(res.data.results || []);
      setIsLinked(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load results for selected child.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReportCard = async (examId: string) => {
    setLoadingReport(true);
    setError('');
    try {
      if (isParent) {
        const res = await api.parentChildReportCard(t, selectedChildId, examId);
        setActiveReportCard(res.data);
      } else {
        const res = await api.studentReportCard(t, examId);
        setActiveReportCard(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load report card details.');
    } finally {
      setLoadingReport(false);
    }
  };

  const currentChild = isParent ? children.find((c) => c.id === selectedChildId) || children[0] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-white p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Award className="h-6 w-6 text-indigo-600" />
            <h2 className="text-2xl font-bold text-slate-900">
              {isParent ? "Children's Academic Results" : 'My Examination Results'}
            </h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {isParent
              ? 'View official published examination outcomes and individual report cards for your children.'
              : 'View your official published examination outcomes, grades, and report cards.'}
          </p>
        </div>

        {/* Child Selector for Parents */}
        {isParent && children.length > 1 && (
          <div className="flex items-center gap-2">
            <label htmlFor="child-selector" className="text-xs font-semibold text-slate-600">
              Select Child:
            </label>
            <select
              id="child-selector"
              value={selectedChildId}
              onChange={(e) => setSelectedChildId(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none"
            >
              {children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name} ({c.class_name ? `${c.class_name} ${c.section_name || ''}` : c.admission_no})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Error Banner with Retry */}
      {error && (
        <div role="alert" className="flex items-start justify-between rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => (isParent ? loadParentChildResults(selectedChildId) : loadStudentResults())}
            className="flex items-center gap-1 rounded border border-amber-300 bg-white px-3 py-1 text-xs font-semibold hover:bg-amber-100"
          >
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div role="status" className="rounded-xl border bg-white p-8 text-center text-sm text-slate-500">
          Loading examination results…
        </div>
      )}

      {/* Individual Report Card Detail View */}
      {activeReportCard && !loading && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveReportCard(null)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" /> Back to All Results
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 shadow-sm print:hidden"
            >
              <Printer className="h-4 w-4" /> Print Report Card
            </button>
          </div>

          {/* Printable Report Card Card */}
          <div className="rounded-xl border bg-white p-6 shadow-sm print:border-0 print:shadow-none print:p-0">
            {/* Institute & Exam Header */}
            <div className="border-b pb-4 text-center">
              <h3 className="text-xl font-bold text-slate-900 uppercase tracking-wide">{currentTenant.name}</h3>
              <p className="text-lg font-semibold text-indigo-700 mt-1">{activeReportCard.exam.name} — Student Report Card</p>
              <p className="text-xs text-slate-500">
                Term: {activeReportCard.exam.term} · Dates: {date(activeReportCard.exam.startDate)} to {date(activeReportCard.exam.endDate)}
              </p>
            </div>

            {/* Student Profile Block */}
            <div className="my-5 grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-4">
              <div>
                <span className="text-xs text-slate-500">Student Name</span>
                <p className="font-semibold text-slate-900">{activeReportCard.studentName}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Admission No</span>
                <p className="font-semibold text-slate-900">{activeReportCard.admissionNo}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Class & Section</span>
                <p className="font-semibold text-slate-900">
                  {activeReportCard.exam.className} {activeReportCard.exam.sectionName !== 'All' ? `(${activeReportCard.exam.sectionName})` : ''}
                </p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Roll No</span>
                <p className="font-semibold text-slate-900">{activeReportCard.rollNo || '—'}</p>
              </div>
            </div>

            {/* Subject Marks Table */}
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-xs font-semibold text-slate-700 uppercase">
                  <tr>
                    <th className="p-3">Subject</th>
                    <th className="p-3 text-center">Max Marks</th>
                    <th className="p-3 text-center">Pass Marks</th>
                    <th className="p-3 text-center">Marks Obtained</th>
                    <th className="p-3 text-center">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {activeReportCard.subjects.map((sub: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-3 font-medium text-slate-900">{sub.subjectName}</td>
                      <td className="p-3 text-center text-slate-600">{sub.maxMarks}</td>
                      <td className="p-3 text-center text-slate-600">{sub.passMarks}</td>
                      <td className="p-3 text-center font-semibold">
                        {sub.absent ? <span className="text-amber-600">Absent</span> : sub.marks ?? '—'}
                      </td>
                      <td className="p-3 text-center">
                        {sub.absent ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                            <AlertCircle className="h-3 w-3" /> Absent
                          </span>
                        ) : sub.passed ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" /> Pass
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700">
                            <XCircle className="h-3 w-3" /> Fail
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary Banner */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-lg bg-indigo-50/60 border border-indigo-100 p-4">
              <div className="flex flex-wrap items-center gap-6 text-sm font-medium text-slate-700">
                <div>
                  <span className="text-xs text-slate-500 block">Total Marks</span>
                  <span className="text-lg font-bold text-slate-900">
                    {activeReportCard.obtainedMarks} / {activeReportCard.totalMarks}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Percentage</span>
                  <span className="text-lg font-bold text-indigo-700">{activeReportCard.percentage}%</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Grade</span>
                  <span className="text-lg font-bold text-slate-900">{activeReportCard.grade || '—'}</span>
                </div>
              </div>

              <div>
                <span
                  className={`inline-block rounded-full px-4 py-1.5 text-sm font-bold uppercase tracking-wider ${
                    activeReportCard.resultStatus === 'PASS'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                  }`}
                >
                  {activeReportCard.resultStatus}
                </span>
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-400 text-right">
              Generated: {new Date(activeReportCard.generatedAt).toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Published Results List View */}
      {!activeReportCard && !loading && (
        <div className="space-y-4">
          {/* Unlinked Student State */}
          {!isParent && !isLinked && (
            <div role="status" className="rounded-xl border bg-white p-6 text-center text-slate-600">
              <AlertCircle className="mx-auto h-8 w-8 text-amber-500 mb-2" />
              <h3 className="font-semibold text-slate-900">Student Record Not Linked</h3>
              <p className="mt-1 text-sm text-slate-500">
                Your account is not linked to a student record. Please contact your institution administrator.
              </p>
            </div>
          )}

          {/* Unlinked Parent State (No Children) */}
          {isParent && children.length === 0 && (
            <div role="status" className="rounded-xl border bg-white p-6 text-center text-slate-600">
              <AlertCircle className="mx-auto h-8 w-8 text-amber-500 mb-2" />
              <h3 className="font-semibold text-slate-900">No Linked Children Found</h3>
              <p className="mt-1 text-sm text-slate-500">
                No student records are linked to your parent account. Please contact your institution administrator.
              </p>
            </div>
          )}

          {/* Student Banner Info */}
          {studentInfo && (
            <div className="flex flex-wrap items-center justify-between rounded-xl border bg-white p-4 shadow-sm text-sm">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Viewing Student:</span>
                <p className="font-bold text-slate-900 text-base">
                  {studentInfo.first_name} {studentInfo.last_name}
                </p>
                <p className="text-xs text-slate-500">
                  Admission No: <span className="font-medium text-slate-700">{studentInfo.admission_no}</span>
                  {currentChild?.class_name && (
                    <>
                      {' '}
                      · Current Class: <span className="font-medium text-slate-700">{currentChild.class_name} {currentChild.section_name || ''}</span>
                    </>
                  )}
                </p>
              </div>
              <div className="text-xs text-slate-500">
                Total Published Exams: <span className="font-bold text-slate-800">{results.length}</span>
              </div>
            </div>
          )}

          {/* Published Results Table */}
          {results.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                  <tr>
                    <th className="p-3.5">Exam Name</th>
                    <th className="p-3.5">Academic Year</th>
                    <th className="p-3.5">Class</th>
                    <th className="p-3.5">Term</th>
                    <th className="p-3.5 text-center">Score</th>
                    <th className="p-3.5 text-center">Percentage</th>
                    <th className="p-3.5 text-center">Grade</th>
                    <th className="p-3.5 text-center">Result</th>
                    <th className="p-3.5 text-right">Report Card</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {results.map((r: any) => (
                    <tr key={r.examId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3.5 font-semibold text-slate-900">{r.examName}</td>
                      <td className="p-3.5 text-slate-600">{r.academicYearName}</td>
                      <td className="p-3.5 text-slate-600">
                        {r.className} {r.sectionName !== 'All' ? `(${r.sectionName})` : ''}
                      </td>
                      <td className="p-3.5 text-slate-600">{r.term}</td>
                      <td className="p-3.5 text-center font-medium text-slate-900">
                        {r.obtainedMarks} / {r.totalMarks}
                      </td>
                      <td className="p-3.5 text-center font-bold text-indigo-700">{r.percentage}%</td>
                      <td className="p-3.5 text-center font-semibold text-slate-800">{r.grade || '—'}</td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-xs font-bold ${
                            r.resultStatus === 'PASS'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {r.resultStatus}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          type="button"
                          disabled={loadingReport}
                          onClick={() => handleOpenReportCard(r.examId)}
                          className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                        >
                          View Report Card
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            (isLinked || isParent) && (
              <div role="status" className="rounded-xl border bg-white p-8 text-center text-slate-500">
                <Award className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                <h3 className="font-semibold text-slate-800">No Published Examination Results</h3>
                <p className="mt-1 text-sm">
                  There are no published exam results available for this student at this time.
                </p>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};
export default StudentParentResultsModule;
