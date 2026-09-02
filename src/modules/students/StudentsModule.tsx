import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Filter,
  QrCode,
  CreditCard,
  CalendarCheck,
  Award,
  Download,
  Printer,
  Trash2,
  Edit,
  Eye,
  CheckCircle,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  Upload,
  FileSpreadsheet,
  CheckSquare,
  Square,
  AlertCircle,
  AlertTriangle,
  HeartHandshake,
  Clock,
  FileText,
  Building,
  GraduationCap,
  ArrowRight,
  UserCheck,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Calendar,
  MessageSquare,
  Share2,
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { storage } from '../../services/storageService';
import {
  Student,
  Guardian,
  StudentGuardian,
  Enrollment,
  DocumentMeta,
  AcademicClass,
  CoachingBatch,
} from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Tabs } from '../../components/ui/Tabs';

export const StudentsModule: React.FC = () => {
  const { currentTenant, getLabel, isSchool, isCoaching } = useTenant();

  // Primary State
  const [activeSubTab, setActiveSubTab] = useState<'students' | 'guardians' | 'enrollments'>('students');
  const [students, setStudents] = useState<Student[]>(() => storage.getStudents(currentTenant.id));
  const [guardians, setGuardians] = useState<Guardian[]>(() => storage.getGuardians(currentTenant.id));
  const [studentGuardians, setStudentGuardians] = useState<StudentGuardian[]>(() => storage.getStudentGuardians());
  const [enrollments, setEnrollments] = useState<Enrollment[]>(() => storage.getEnrollments());
  const [documents, setDocuments] = useState<DocumentMeta[]>(() => storage.getDocuments());

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [classFilter, setClassFilter] = useState<string>('ALL');

  // Drawer / Workspace State
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [profileTab, setProfileTab] = useState<
    'overview' | 'academic' | 'attendance' | 'fees' | 'exams' | 'guardians' | 'documents' | 'timeline' | 'idcard'
  >('overview');

  // Modals
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [isAddGuardianModalOpen, setIsAddGuardianModalOpen] = useState(false);
  const [isUploadDocModalOpen, setIsUploadDocModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [importDuplicateMode, setImportDuplicateMode] = useState<'SKIP' | 'UPDATE'>('SKIP');
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

  // Auxiliary entities
  const classes = storage.getClasses(currentTenant.id);
  const batches = storage.getBatches(currentTenant.id);
  const feeLedgers = storage.getFeeLedgers(currentTenant.id);
  const examResults = storage.getExamResults(currentTenant.id);
  const attendanceLogs = storage.getAttendance(currentTenant.id);

  // Form State for Add Student
  const [studentForm, setStudentForm] = useState<Partial<Student>>({
    firstName: '',
    lastName: '',
    gender: 'MALE',
    dob: '2010-04-15',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    parentRelationship: 'FATHER',
    address: 'New Delhi',
    classId: classes[0]?.id || '',
    batchIds: batches.slice(0, 1).map((b) => b.id),
    status: 'ACTIVE',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  });

  // Form State for Add Guardian
  const [guardianForm, setGuardianForm] = useState<Partial<Guardian>>({
    name: '',
    phone: '',
    email: '',
    occupation: '',
    address: 'New Delhi',
  });
  const [guardianRelType, setGuardianRelType] = useState<'FATHER' | 'MOTHER' | 'GUARDIAN'>('FATHER');
  const [guardianIsPrimary, setGuardianIsPrimary] = useState(true);

  // Form State for Upload Document
  const [docForm, setDocForm] = useState<{ fileName: string; entityType: string }>({
    fileName: 'Transfer_Certificate.pdf',
    entityType: 'STUDENT',
  });

  // Real-Time Duplicate Student Detection
  const duplicateCandidate = students.find((s) => {
    if (!studentForm.firstName) return false;
    const sameName =
      s.firstName.toLowerCase() === (studentForm.firstName || '').toLowerCase() &&
      s.lastName.toLowerCase() === (studentForm.lastName || '').toLowerCase();
    const samePhone = studentForm.parentPhone && s.parentPhone === studentForm.parentPhone;
    return sameName || samePhone;
  });

  // Handle Add Student
  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.firstName || !studentForm.parentPhone) return;

    const newId = `student-${Date.now()}`;
    const code = isSchool
      ? `DIPS/2026/${Math.floor(1000 + Math.random() * 9000)}`
      : `APX-2026-${Math.floor(100 + Math.random() * 900)}`;

    const newStudent: Student = {
      id: newId,
      tenantId: currentTenant.id,
      admissionNo: code,
      firstName: studentForm.firstName || '',
      lastName: studentForm.lastName || '',
      gender: studentForm.gender as 'MALE' | 'FEMALE',
      dob: studentForm.dob || '2010-04-15',
      parentName: studentForm.parentName || '',
      parentPhone: studentForm.parentPhone || '',
      parentEmail: studentForm.parentEmail || '',
      parentRelationship: studentForm.parentRelationship as 'FATHER' | 'MOTHER',
      address: studentForm.address || '',
      status: 'ACTIVE',
      classId: studentForm.classId,
      batchIds: studentForm.batchIds,
      enrollmentDate: new Date().toISOString().split('T')[0],
      photoUrl:
        studentForm.photoUrl ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      qrCode: `${currentTenant.code}-STU-${newId}-${studentForm.firstName?.toUpperCase()}`,
    };

    // 1. Save Student
    storage.saveStudent(newStudent);

    // 2. Automatically Create & Link Guardian if provided
    if (studentForm.parentName && studentForm.parentPhone) {
      const guaId = `gua-${Date.now()}`;
      const newGua: Guardian = {
        id: guaId,
        tenantId: currentTenant.id,
        name: studentForm.parentName,
        phone: studentForm.parentPhone,
        email: studentForm.parentEmail,
        address: studentForm.address,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      storage.saveGuardian(newGua);

      storage.saveStudentGuardian({
        id: `sg-${Date.now()}`,
        tenantId: currentTenant.id,
        studentId: newId,
        guardianId: guaId,
        relationshipType: (studentForm.parentRelationship as any) || 'FATHER',
        isPrimary: true,
        canPickup: true,
        receivesFeeAlerts: true,
        receivesAttendanceAlerts: true,
        createdAt: new Date().toISOString(),
      });
    }

    // 3. Create Initial Academic Enrollment Snapshot
    storage.saveEnrollment({
      id: `enr-${Date.now()}`,
      tenantId: currentTenant.id,
      studentId: newId,
      academicYearId: currentTenant.academicYear,
      classId: studentForm.classId,
      batchId: studentForm.batchIds?.[0],
      status: 'ACTIVE',
      startDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Refresh state
    setStudents(storage.getStudents(currentTenant.id));
    setGuardians(storage.getGuardians(currentTenant.id));
    setStudentGuardians(storage.getStudentGuardians());
    setEnrollments(storage.getEnrollments());
    setIsAddStudentModalOpen(false);
  };

  // Handle Add Guardian directly to selected student
  const handleAddGuardianToStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardianForm.name || !guardianForm.phone || !selectedStudent) return;

    const guaId = `gua-${Date.now()}`;
    const newGua: Guardian = {
      id: guaId,
      tenantId: currentTenant.id,
      name: guardianForm.name,
      phone: guardianForm.phone,
      email: guardianForm.email,
      occupation: guardianForm.occupation,
      address: guardianForm.address || selectedStudent.address,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    storage.saveGuardian(newGua);

    storage.saveStudentGuardian({
      id: `sg-${Date.now()}`,
      tenantId: currentTenant.id,
      studentId: selectedStudent.id,
      guardianId: guaId,
      relationshipType: guardianRelType,
      isPrimary: guardianIsPrimary,
      canPickup: true,
      receivesFeeAlerts: true,
      receivesAttendanceAlerts: true,
      createdAt: new Date().toISOString(),
    });

    setGuardians(storage.getGuardians(currentTenant.id));
    setStudentGuardians(storage.getStudentGuardians());
    setIsAddGuardianModalOpen(false);
  };

  // Handle Document Upload
  const handleUploadDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !docForm.fileName) return;

    const newDoc: DocumentMeta = {
      id: `doc-${Date.now()}`,
      tenantId: currentTenant.id,
      entityType: 'STUDENT',
      entityId: selectedStudent.id,
      fileName: docForm.fileName,
      storageKey: `docs/students/${selectedStudent.id}/${docForm.fileName}`,
      mimeType: 'application/pdf',
      sizeBytes: Math.floor(400000 + Math.random() * 800000),
      uploadedBy: 'Admin Desk',
      uploadedAt: new Date().toISOString(),
    };

    storage.saveDocument(newDoc);
    setDocuments(storage.getDocuments());
    setIsUploadDocModalOpen(false);
  };

  const handleDeleteStudent = (id: string) => {
    if (confirm(`Are you sure you want to remove this ${getLabel('student').toLowerCase()}?`)) {
      storage.deleteStudent(id);
      setStudents(storage.getStudents(currentTenant.id));
      if (selectedStudent?.id === id) setSelectedStudent(null);
    }
  };

  // Filter students
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.admissionNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.parentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.parentPhone.includes(searchQuery);

    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    const matchesClass =
      classFilter === 'ALL' || s.classId === classFilter || s.batchIds?.includes(classFilter);

    return matchesSearch && matchesStatus && matchesClass;
  });

  // Filter guardians
  const filteredGuardians = guardians.filter((g) => {
    const matchesSearch =
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.phone.includes(searchQuery) ||
      (g.email && g.email.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-sky-400" />
              {getLabel('studentPlural')} & Family Management
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-[10px] font-mono text-sky-400">
              Canonical Workspace v1.0
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Full student lifecycle, multi-guardian family relationships, historical academic snapshots, and document vault.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsBulkImportOpen(true)}
            leftIcon={<Upload className="w-3.5 h-3.5" />}
          >
            Bulk Import CSV
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddStudentModalOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            New {getLabel('admission')}
          </Button>
        </div>
      </div>

      {/* Sub-Tabs */}
      <Tabs
        tabs={[
          { id: 'students', label: `🎓 ${getLabel('studentPlural')} Directory (${students.length})` },
          { id: 'guardians', label: `👨‍👩‍👧‍👦 Guardians & Family Directory (${guardians.length})` },
          { id: 'enrollments', label: `📜 Academic Placement & History (${enrollments.length})` },
        ]}
        activeTab={activeSubTab}
        onChange={(t) => setActiveSubTab(t as any)}
      />

      {/* SUB-TAB 1: STUDENTS DIRECTORY */}
      {activeSubTab === 'students' && (
        <div className="space-y-4">
          
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search by name, ${getLabel('admission').toLowerCase()} no, parent, or phone...`}
                className="w-full pl-10 pr-4 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
              >
                <option value="ALL">All {getLabel('groupPlural')}</option>
                {isSchool && classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                {isCoaching && batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="ON_LEAVE">On Leave</option>
              </select>
            </div>
          </div>

          {/* Students Table */}
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/90 text-slate-400 uppercase text-[10px] border-b border-slate-800 font-mono">
                  <tr>
                    <th className="p-3.5">{getLabel('student')} Name</th>
                    <th className="p-3.5">{getLabel('admission')} No</th>
                    <th className="p-3.5">{getLabel('group')}</th>
                    <th className="p-3.5">Primary Guardian</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredStudents.map((s) => {
                    const studentClass = classes.find((c) => c.id === s.classId);
                    const studentBatch = batches.find((b) => s.batchIds?.includes(b.id));
                    const groupLabel = isSchool ? studentClass?.name : studentBatch?.name;

                    return (
                      <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            <img
                              src={s.photoUrl}
                              alt={s.firstName}
                              className="w-8 h-8 rounded-full object-cover border border-slate-700"
                            />
                            <div>
                              <p className="font-bold text-white text-xs">
                                {s.firstName} {s.lastName}
                              </p>
                              <p className="text-[10px] text-slate-400">{s.gender} • DOB: {s.dob}</p>
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5 font-mono text-sky-400 font-semibold">{s.admissionNo}</td>
                        <td className="p-3.5 text-slate-200">{groupLabel || 'Unassigned'}</td>

                        <td className="p-3.5">
                          <p className="font-semibold text-white">{s.parentName}</p>
                          <p className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                            <Phone className="w-3 h-3 text-slate-500" /> {s.parentPhone}
                          </p>
                        </td>

                        <td className="p-3.5">
                          <Badge variant={s.status === 'ACTIVE' ? 'emerald' : 'rose'} size="sm">
                            {s.status}
                          </Badge>
                        </td>

                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedStudent(s);
                                setProfileTab('overview');
                              }}
                              leftIcon={<Eye className="w-3.5 h-3.5" />}
                            >
                              Workspace
                            </Button>
                            <button
                              onClick={() => handleDeleteStudent(s.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
        </div>
      )}

      {/* SUB-TAB 2: GUARDIANS & FAMILY DIRECTORY */}
      {activeSubTab === 'guardians' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search guardians by name, phone, or email..."
                className="w-full pl-10 pr-4 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGuardians.map((g) => {
              const linkedJunctions = studentGuardians.filter((sg) => sg.guardianId === g.id);
              const linkedStudentList = students.filter((s) => linkedJunctions.some((j) => j.studentId === s.id));

              return (
                <div key={g.id} className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-white text-sm">{g.name}</h4>
                      {g.occupation && <p className="text-[11px] text-sky-400 font-medium">{g.occupation}</p>}
                    </div>
                    <Badge variant="blue" size="sm">
                      {linkedStudentList.length} {linkedStudentList.length === 1 ? 'Child' : 'Children'}
                    </Badge>
                  </div>

                  <div className="space-y-1.5 font-mono text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <span>{g.phone}</span>
                    </div>
                    {g.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        <span className="truncate">{g.email}</span>
                      </div>
                    )}
                    {g.address && (
                      <div className="flex items-center gap-2 font-sans text-[11px] text-slate-400">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{g.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Linked Siblings / Students */}
                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Linked Dependents & Siblings
                    </span>
                    <div className="space-y-1.5">
                      {linkedStudentList.map((stu) => {
                        const junc = linkedJunctions.find((j) => j.studentId === stu.id);
                        return (
                          <div
                            key={stu.id}
                            onClick={() => {
                              setSelectedStudent(stu);
                              setActiveSubTab('students');
                              setProfileTab('overview');
                            }}
                            className="p-2 bg-slate-950 rounded-xl border border-slate-800 hover:border-sky-500/40 cursor-pointer transition-all flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <img src={stu.photoUrl} alt={stu.firstName} className="w-6 h-6 rounded-full object-cover" />
                              <span className="text-xs font-semibold text-white">
                                {stu.firstName} {stu.lastName}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-sky-400">{junc?.relationshipType || 'Child'}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="pt-2 flex items-center gap-2">
                    <a
                      href={`https://wa.me/${g.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-center text-xs font-semibold border border-emerald-500/20 transition-colors flex items-center justify-center gap-1"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      WhatsApp
                    </a>
                    <a
                      href={`tel:${g.phone}`}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold border border-slate-800 transition-colors flex items-center justify-center gap-1"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      Call
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: ACADEMIC PLACEMENT & ENROLLMENTS */}
      {activeSubTab === 'enrollments' && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-sky-400" />
                Historical Academic Placements
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Year-by-year historical snapshot ledger preserving student progress across grades and batches.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800 font-mono">
                <tr>
                  <th className="p-3">Student</th>
                  <th className="p-3">Academic Session</th>
                  <th className="p-3">Grade / Batch</th>
                  <th className="p-3">Start Date</th>
                  <th className="p-3">End Date</th>
                  <th className="p-3">Placement Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {enrollments.map((enr) => {
                  const stu = students.find((s) => s.id === enr.studentId);
                  const cls = classes.find((c) => c.id === enr.classId);
                  const bat = batches.find((b) => b.id === enr.batchId);

                  return (
                    <tr key={enr.id} className="hover:bg-slate-800/30">
                      <td className="p-3 font-sans font-bold text-white">
                        {stu ? `${stu.firstName} ${stu.lastName}` : enr.studentId}
                      </td>
                      <td className="p-3 text-sky-400">{enr.academicYearId}</td>
                      <td className="p-3 text-slate-200">{cls?.name || bat?.name || 'Class 10-A'}</td>
                      <td className="p-3 text-slate-400">{enr.startDate}</td>
                      <td className="p-3 text-slate-400">{enr.endDate || 'Current'}</td>
                      <td className="p-3">
                        <Badge variant={enr.status === 'ACTIVE' ? 'emerald' : 'blue'} size="sm">
                          {enr.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ADD STUDENT (WITH REAL-TIME DUPLICATE DETECTION) */}
      <Modal
        isOpen={isAddStudentModalOpen}
        onClose={() => setIsAddStudentModalOpen(false)}
        title={`New Student ${getLabel('admission')}`}
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateStudent} className="space-y-4">
          
          {/* Duplicate Detection Warning Banner */}
          {duplicateCandidate && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-1.5 text-xs text-amber-200 animate-fade-in">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Possible Duplicate Record Detected!</span>
              </div>
              <p>
                An existing student <strong>{duplicateCandidate.firstName} {duplicateCandidate.lastName}</strong> ({duplicateCandidate.admissionNo}) matches this name or parent phone.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <label className="text-slate-400 font-semibold">First Name *</label>
              <input
                type="text"
                required
                value={studentForm.firstName}
                onChange={(e) => setStudentForm({ ...studentForm, firstName: e.target.value })}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-sky-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-semibold">Last Name</label>
              <input
                type="text"
                value={studentForm.lastName}
                onChange={(e) => setStudentForm({ ...studentForm, lastName: e.target.value })}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-sky-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-semibold">Gender</label>
              <select
                value={studentForm.gender}
                onChange={(e) => setStudentForm({ ...studentForm, gender: e.target.value as any })}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-semibold">Date of Birth</label>
              <input
                type="date"
                value={studentForm.dob}
                onChange={(e) => setStudentForm({ ...studentForm, dob: e.target.value })}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
              />
            </div>

            {/* Academic Placement */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-slate-400 font-semibold">{getLabel('group')} Placement</label>
              <select
                value={isSchool ? studentForm.classId : studentForm.batchIds?.[0]}
                onChange={(e) =>
                  isSchool
                    ? setStudentForm({ ...studentForm, classId: e.target.value })
                    : setStudentForm({ ...studentForm, batchIds: [e.target.value] })
                }
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
              >
                {isSchool && classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                {isCoaching && batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            {/* Guardian Info */}
            <div className="space-y-1">
              <label className="text-slate-400 font-semibold">Primary Guardian Name *</label>
              <input
                type="text"
                required
                value={studentForm.parentName}
                onChange={(e) => setStudentForm({ ...studentForm, parentName: e.target.value })}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-semibold">Guardian Phone Number *</label>
              <input
                type="tel"
                required
                value={studentForm.parentPhone}
                onChange={(e) => setStudentForm({ ...studentForm, parentPhone: e.target.value })}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsAddStudentModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Complete Admission
            </Button>
          </div>
        </form>
      </Modal>

      {/* STUDENT WORKSPACE DETAIL DRAWER (8-TAB COMPLETE CONSOLE) */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex justify-end animate-fade-in">
          <div className="w-full max-w-4xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl overflow-hidden animate-slide-left">
            
            {/* Header */}
            <div className="p-6 bg-slate-950 border-b border-slate-800 flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <img
                  src={selectedStudent.photoUrl}
                  alt={selectedStudent.firstName}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-sky-500/30 shadow-lg"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-white">
                      {selectedStudent.firstName} {selectedStudent.lastName}
                    </h3>
                    <Badge variant={selectedStudent.status === 'ACTIVE' ? 'emerald' : 'rose'} size="sm">
                      {selectedStudent.status}
                    </Badge>
                  </div>
                  <p className="text-xs font-mono text-sky-400 mt-0.5">{selectedStudent.admissionNo}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isSchool
                      ? classes.find((c) => c.id === selectedStudent.classId)?.name
                      : batches.find((b) => selectedStudent.batchIds?.includes(b.id))?.name}{' '}
                    • Enrolled: {selectedStudent.enrollmentDate}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedStudent(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Workspace Navigation Tabs */}
            <div className="px-6 bg-slate-950/50 border-b border-slate-800">
              <Tabs
                tabs={[
                  { id: 'overview', label: 'Overview' },
                  { id: 'academic', label: 'Academic & History' },
                  { id: 'attendance', label: 'Attendance' },
                  { id: 'fees', label: 'Fees & Ledger' },
                  { id: 'exams', label: 'Exams & Results' },
                  { id: 'guardians', label: 'Family & Guardians' },
                  { id: 'documents', label: 'Document Vault' },
                  { id: 'idcard', label: 'Digital ID Card' },
                ]}
                activeTab={profileTab}
                onChange={(t) => setProfileTab(t as any)}
              />
            </div>

            {/* Body Content */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              
              {/* TAB 1: OVERVIEW */}
              {profileTab === 'overview' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800">
                      <p className="text-[10px] text-slate-400 uppercase font-mono">Attendance Rate</p>
                      <p className="text-lg font-bold text-emerald-400 mt-1">94.2%</p>
                      <span className="text-[10px] text-slate-500 font-mono">132 / 140 days</span>
                    </div>

                    <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800">
                      <p className="text-[10px] text-slate-400 uppercase font-mono">Fee Dues</p>
                      <p className="text-lg font-bold text-amber-400 mt-1">₹4,500</p>
                      <span className="text-[10px] text-slate-500 font-mono">Next: 15 Oct</span>
                    </div>

                    <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800">
                      <p className="text-[10px] text-slate-400 uppercase font-mono">Latest Exam %</p>
                      <p className="text-lg font-bold text-purple-400 mt-1">88.5%</p>
                      <span className="text-[10px] text-slate-500 font-mono">Rank #3 in Class</span>
                    </div>

                    <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800">
                      <p className="text-[10px] text-slate-400 uppercase font-mono">Documents</p>
                      <p className="text-lg font-bold text-sky-400 mt-1">
                        {documents.filter((d) => d.entityId === selectedStudent.id).length} Verified
                      </p>
                      <span className="text-[10px] text-slate-500 font-mono">TC & Aadhaar on file</span>
                    </div>
                  </div>

                  {/* Primary Guardian Card */}
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <HeartHandshake className="w-4 h-4 text-rose-400" />
                        Primary Guardian Contact
                      </span>
                      <Badge variant="blue" size="sm">Primary Emergency Contact</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                      <div>Name: <span className="font-semibold text-white">{selectedStudent.parentName}</span></div>
                      <div>Phone: <span className="font-mono text-sky-400">{selectedStudent.parentPhone}</span></div>
                      <div>Relationship: <span className="text-slate-200">{selectedStudent.parentRelationship}</span></div>
                      <div>Address: <span className="text-slate-200">{selectedStudent.address}</span></div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ACADEMIC & PLACEMENT */}
              {profileTab === 'academic' && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                    <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                      Current Placement Snapshot ({currentTenant.academicYear})
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="text-slate-400">Class / Batch: <span className="text-white font-bold">{isSchool ? classes.find((c) => c.id === selectedStudent.classId)?.name : batches.find((b) => selectedStudent.batchIds?.includes(b.id))?.name}</span></div>
                      <div className="text-slate-400">Academic Year: <span className="text-sky-400 font-mono">{currentTenant.academicYear}</span></div>
                      <div className="text-slate-400">Enrolled On: <span className="text-slate-200 font-mono">{selectedStudent.enrollmentDate}</span></div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                    <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                      Historical Placements
                    </h4>
                    <div className="space-y-2">
                      {enrollments
                        .filter((e) => e.studentId === selectedStudent.id)
                        .map((enr) => (
                          <div key={enr.id} className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                            <div>
                              <p className="font-bold text-white">{enr.academicYearId} Placement</p>
                              <p className="text-[10px] text-slate-400 font-mono">Started: {enr.startDate} • Status: {enr.status}</p>
                            </div>
                            <Badge variant={enr.status === 'ACTIVE' ? 'emerald' : 'blue'} size="sm">
                              {enr.status}
                            </Badge>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: FAMILY & GUARDIANS */}
              {profileTab === 'guardians' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                      Linked Guardians & Emergency Contacts
                    </h4>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setIsAddGuardianModalOpen(true)}
                      leftIcon={<Plus className="w-3.5 h-3.5" />}
                    >
                      Add Guardian
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {studentGuardians
                      .filter((sg) => sg.studentId === selectedStudent.id)
                      .map((sg) => {
                        const gua = guardians.find((g) => g.id === sg.guardianId);
                        if (!gua) return null;

                        return (
                          <div key={sg.id} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h5 className="font-bold text-white text-sm">{gua.name}</h5>
                                <Badge variant="purple" size="sm">{sg.relationshipType}</Badge>
                                {sg.isPrimary && <Badge variant="emerald" size="sm">PRIMARY</Badge>}
                              </div>
                              <p className="text-xs text-sky-400 font-mono flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {gua.phone}
                              </p>
                              {gua.email && (
                                <p className="text-xs text-slate-400 font-mono flex items-center gap-1">
                                  <Mail className="w-3 h-3" /> {gua.email}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <a
                                href={`https://wa.me/${gua.phone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-xl text-xs font-semibold border border-emerald-500/20"
                              >
                                WhatsApp
                              </a>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* TAB 7: DOCUMENTS VAULT */}
              {profileTab === 'documents' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                      Verified Identity & Academic Documents
                    </h4>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setIsUploadDocModalOpen(true)}
                      leftIcon={<Upload className="w-3.5 h-3.5" />}
                    >
                      Upload Document
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {documents
                      .filter((d) => d.entityId === selectedStudent.id)
                      .map((doc) => (
                        <div key={doc.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2.5">
                            <FileText className="w-4 h-4 text-sky-400" />
                            <div>
                              <p className="font-bold text-white">{doc.fileName}</p>
                              <p className="text-[10px] text-slate-400 font-mono">
                                {(doc.sizeBytes / 1024).toFixed(1)} KB • Uploaded {doc.uploadedAt.slice(0, 10)}
                              </p>
                            </div>
                          </div>
                          <Badge variant="emerald" size="sm">VERIFIED</Badge>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* TAB 8: DIGITAL ID CARD */}
              {profileTab === 'idcard' && (
                <div className="flex flex-col items-center justify-center p-6 bg-slate-950 rounded-2xl border border-slate-800 space-y-4">
                  <div className="w-72 bg-gradient-to-br from-slate-900 to-slate-950 p-6 rounded-3xl border border-sky-500/40 shadow-2xl text-center space-y-4">
                    <div>
                      <p className="text-[10px] font-bold tracking-widest text-sky-400 uppercase font-mono">
                        {currentTenant.name}
                      </p>
                      <p className="text-[9px] text-slate-400">STUDENT IDENTITY CARD</p>
                    </div>

                    <img
                      src={selectedStudent.photoUrl}
                      alt={selectedStudent.firstName}
                      className="w-20 h-20 rounded-2xl mx-auto object-cover border-2 border-sky-400"
                    />

                    <div>
                      <h4 className="font-bold text-white text-base">
                        {selectedStudent.firstName} {selectedStudent.lastName}
                      </h4>
                      <p className="text-xs font-mono text-sky-300 font-semibold">{selectedStudent.admissionNo}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {isSchool
                          ? classes.find((c) => c.id === selectedStudent.classId)?.name
                          : batches.find((b) => selectedStudent.batchIds?.includes(b.id))?.name}
                      </p>
                    </div>

                    <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-[10px] text-slate-400 font-mono">
                      <span>Emergency: {selectedStudent.parentPhone}</span>
                    </div>
                  </div>

                  <Button variant="outline" size="sm" onClick={() => window.print()} leftIcon={<Printer className="w-3.5 h-3.5" />}>
                    Print ID Badge
                  </Button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD GUARDIAN */}
      <Modal
        isOpen={isAddGuardianModalOpen}
        onClose={() => setIsAddGuardianModalOpen(false)}
        title="Add Guardian / Family Contact"
        maxWidth="md"
      >
        <form onSubmit={handleAddGuardianToStudent} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="text-slate-400 font-semibold">Guardian Full Name *</label>
            <input
              type="text"
              required
              value={guardianForm.name}
              onChange={(e) => setGuardianForm({ ...guardianForm, name: e.target.value })}
              className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-400 font-semibold">Phone Number *</label>
            <input
              type="tel"
              required
              value={guardianForm.phone}
              onChange={(e) => setGuardianForm({ ...guardianForm, phone: e.target.value })}
              className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-400 font-semibold">Relationship</label>
            <select
              value={guardianRelType}
              onChange={(e) => setGuardianRelType(e.target.value as any)}
              className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
            >
              <option value="FATHER">Father</option>
              <option value="MOTHER">Mother</option>
              <option value="GUARDIAN">Legal Guardian</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsAddGuardianModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save & Link Guardian
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: UPLOAD DOCUMENT */}
      <Modal
        isOpen={isUploadDocModalOpen}
        onClose={() => setIsUploadDocModalOpen(false)}
        title="Upload Student Document"
        maxWidth="md"
      >
        <form onSubmit={handleUploadDocument} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="text-slate-400 font-semibold">Document Title / File Name *</label>
            <input
              type="text"
              required
              value={docForm.fileName}
              onChange={(e) => setDocForm({ ...docForm, fileName: e.target.value })}
              className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
            />
          </div>

          <div className="p-4 border-2 border-dashed border-slate-700 rounded-2xl text-center space-y-2">
            <Upload className="w-8 h-8 text-sky-400 mx-auto" />
            <p className="text-xs text-slate-300">Drag & drop document PDF/JPG or browse</p>
            <p className="text-[10px] text-slate-500">Max size: 5MB (Aadhaar, Birth Certificate, TC)</p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsUploadDocModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Document
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
