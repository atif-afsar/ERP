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
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { storage } from '../../services/storageService';
import { Student } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Tabs } from '../../components/ui/Tabs';

export const StudentsModule: React.FC = () => {
  const { currentTenant, getLabel, isSchool, isCoaching } = useTenant();
  const [students, setStudents] = useState<Student[]>(() => storage.getStudents(currentTenant.id));
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals & Drawers
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [profileTab, setProfileTab] = useState<'overview' | 'idcard' | 'attendance' | 'fees' | 'exams'>('overview');

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [importDuplicateMode, setImportDuplicateMode] = useState<'SKIP' | 'UPDATE'>('SKIP');
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

  // Classes & Batches for selection
  const classes = storage.getClasses(currentTenant.id);
  const batches = storage.getBatches(currentTenant.id);
  const feeLedgers = storage.getFeeLedgers(currentTenant.id);
  const examResults = storage.getExamResults(currentTenant.id);

  // Form State for Add Student
  const [formData, setFormData] = useState<Partial<Student>>({
    firstName: '',
    lastName: '',
    gender: 'MALE',
    dob: '2010-01-01',
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

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.parentPhone) return;

    const newId = `student-${Date.now()}`;
    const code = isSchool ? `DIPS/2026/${Math.floor(1000 + Math.random() * 9000)}` : `APX-2026-${Math.floor(100 + Math.random() * 900)}`;
    const student: Student = {
      id: newId,
      tenantId: currentTenant.id,
      admissionNo: code,
      firstName: formData.firstName || '',
      lastName: formData.lastName || '',
      gender: formData.gender as 'MALE' | 'FEMALE',
      dob: formData.dob || '2010-01-01',
      parentName: formData.parentName || '',
      parentPhone: formData.parentPhone || '',
      parentEmail: formData.parentEmail || '',
      parentRelationship: formData.parentRelationship as 'FATHER' | 'MOTHER',
      address: formData.address || '',
      status: 'ACTIVE',
      classId: formData.classId,
      batchIds: formData.batchIds,
      enrollmentDate: new Date().toISOString().split('T')[0],
      photoUrl: formData.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      qrCode: `${currentTenant.code}-STU-${newId}-${formData.firstName?.toUpperCase()}`,
    };

    storage.saveStudent(student);
    setStudents(storage.getStudents(currentTenant.id));
    setIsAddModalOpen(false);
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
      s.parentName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredStudents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredStudents.map((s) => s.id));
    }
  };

  const handleBulkArchive = () => {
    if (!confirm(`Archive ${selectedIds.length} selected students?`)) return;
    const updated = students.map((s) =>
      selectedIds.includes(s.id) ? { ...s, status: 'ARCHIVED' as const } : s
    );
    updated.forEach((s) => storage.saveStudent(s));
    storage.saveAuditLog({
      id: `audit-${Date.now()}`,
      tenantId: currentTenant.id,
      actorId: 'user-admin',
      actorName: 'Institution Admin',
      actorRole: 'TENANT_ADMIN',
      action: 'students.bulk_archived',
      category: 'STUDENT',
      entityType: 'Student',
      entityId: `bulk-${selectedIds.length}`,
      details: `Bulk archived ${selectedIds.length} students`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      status: 'SUCCESS',
    });
    setStudents(storage.getStudents(currentTenant.id));
    setSelectedIds([]);
  };

  const handleBulkActivate = () => {
    const updated = students.map((s) =>
      selectedIds.includes(s.id) ? { ...s, status: 'ACTIVE' as const } : s
    );
    updated.forEach((s) => storage.saveStudent(s));
    storage.saveAuditLog({
      id: `audit-${Date.now()}`,
      tenantId: currentTenant.id,
      actorId: 'user-admin',
      actorName: 'Institution Admin',
      actorRole: 'TENANT_ADMIN',
      action: 'students.bulk_activated',
      category: 'STUDENT',
      entityType: 'Student',
      entityId: `bulk-${selectedIds.length}`,
      details: `Bulk activated ${selectedIds.length} students`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      status: 'SUCCESS',
    });
    setStudents(storage.getStudents(currentTenant.id));
    setSelectedIds([]);
  };

  const handleExecuteBulkImport = () => {
    const mockBatch: Student[] = [
      {
        id: `stu-imp-1-${Date.now()}`,
        tenantId: currentTenant.id,
        admissionNo: `${currentTenant.code}/IMP/${Math.floor(1000 + Math.random() * 9000)}`,
        firstName: 'Divya',
        lastName: 'Agarwal',
        gender: 'FEMALE',
        dob: '2010-06-15',
        parentName: 'Sanjay Agarwal',
        parentPhone: '+919811223344',
        parentEmail: 'sanjay@example.com',
        parentRelationship: 'FATHER',
        address: 'Sector 21, Dwarka',
        status: 'ACTIVE',
        classId: classes[0]?.id,
        enrollmentDate: new Date().toISOString().split('T')[0],
        photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
        qrCode: `${currentTenant.code}-STU-IMP1`,
      },
      {
        id: `stu-imp-2-${Date.now()}`,
        tenantId: currentTenant.id,
        admissionNo: `${currentTenant.code}/IMP/${Math.floor(1000 + Math.random() * 9000)}`,
        firstName: 'Karan',
        lastName: 'Singhania',
        gender: 'MALE',
        dob: '2010-09-20',
        parentName: 'Ramesh Singhania',
        parentPhone: '+919877665544',
        parentEmail: 'ramesh@example.com',
        parentRelationship: 'FATHER',
        address: 'Vasant Kunj, New Delhi',
        status: 'ACTIVE',
        classId: classes[0]?.id,
        enrollmentDate: new Date().toISOString().split('T')[0],
        photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
        qrCode: `${currentTenant.code}-STU-IMP2`,
      },
    ];

    mockBatch.forEach((s) => storage.saveStudent(s));

    storage.saveAuditLog({
      id: `audit-${Date.now()}`,
      tenantId: currentTenant.id,
      actorId: 'user-admin',
      actorName: 'Institution Admin',
      actorRole: 'TENANT_ADMIN',
      action: 'students.imported',
      category: 'STUDENT',
      entityType: 'Student',
      entityId: `batch-import-${mockBatch.length}`,
      details: `Imported ${mockBatch.length} students via CSV / Excel batch upload (Duplicate Policy: ${importDuplicateMode})`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      status: 'SUCCESS',
    });

    setStudents(storage.getStudents(currentTenant.id));
    setIsBulkImportOpen(false);
    setImportSuccessMsg(`Successfully imported ${mockBatch.length} students into the directory.`);
    setTimeout(() => setImportSuccessMsg(null), 4000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {getLabel('studentPlural')} Directory
          </h2>
          <p className="text-xs text-slate-400">
            Total {students.length} enrolled {getLabel('studentPlural').toLowerCase()} in {currentTenant.name}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            leftIcon={<Upload className="w-4 h-4" />}
            onClick={() => setIsBulkImportOpen(true)}
          >
            Bulk CSV / Excel Import
          </Button>

          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsAddModalOpen(true)}
          >
            Add {getLabel('student')}
          </Button>
        </div>
      </div>

      {importSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-scale-up">
          <CheckCircle className="w-4 h-4" />
          <span>{importSuccessMsg}</span>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search by name, ${getLabel('admission').toLowerCase()} no, parent...`}
            className="w-full pl-9 pr-4 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-sky-500/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-sky-500/50 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="GRADUATED">Graduated</option>
          </select>
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="p-3 bg-slate-900 border border-sky-500/50 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xl animate-scale-up">
          <div className="flex items-center gap-2">
            <Badge variant="blue" size="sm">
              {selectedIds.length} {getLabel('studentPlural')} Selected
            </Badge>
            <span className="text-xs text-slate-300">Choose a bulk operation:</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleBulkActivate}
            >
              Bulk Activate
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={handleBulkArchive}
            >
              Bulk Archive
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds([])}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Students Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase font-semibold">
              <tr>
                <th className="px-4 py-4 w-10">
                  <button
                    onClick={handleSelectAll}
                    className="p-1 rounded text-slate-400 hover:text-white"
                  >
                    {selectedIds.length === filteredStudents.length && filteredStudents.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-sky-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-4">{getLabel('student')}</th>
                <th className="px-6 py-4">{getLabel('admission')} No</th>
                <th className="px-6 py-4">{isSchool ? 'Class & Section' : 'Assigned Batches'}</th>
                <th className="px-6 py-4">Parent Details</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    No {getLabel('studentPlural').toLowerCase()} found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((stu) => {
                  const assignedBatchNames = isCoaching && stu.batchIds
                    ? batches.filter((b) => stu.batchIds?.includes(b.id)).map((b) => b.name)
                    : [];
                  const isSelected = selectedIds.includes(stu.id);

                  return (
                    <tr
                      key={stu.id}
                      className={`transition-colors group cursor-pointer ${
                        isSelected ? 'bg-sky-950/30' : 'hover:bg-slate-850/50'
                      }`}
                      onClick={() => {
                        setSelectedStudent(stu);
                        setProfileTab('overview');
                      }}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-4" onClick={(e) => handleToggleSelect(stu.id, e)}>
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-sky-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
                        )}
                      </td>

                      {/* Photo & Name */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={stu.photoUrl}
                            alt={stu.firstName}
                            className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-700"
                          />
                          <div>
                            <p className="font-bold text-white group-hover:text-sky-400 transition-colors">
                              {stu.firstName} {stu.lastName}
                            </p>
                            <p className="text-[11px] text-slate-400">{stu.gender} • {stu.bloodGroup || 'O+'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Admission No */}
                      <td className="px-6 py-4 font-mono font-medium text-slate-300">
                        {stu.admissionNo}
                      </td>

                      {/* Group Assignment */}
                      <td className="px-6 py-4">
                        {isSchool ? (
                          <span className="font-semibold text-slate-200">
                            Class 10 - Section A
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {assignedBatchNames.map((name, i) => (
                              <Badge key={i} variant="purple" size="sm">
                                {name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Parent */}
                      <td className="px-6 py-4">
                        <p className="text-slate-200 font-medium">{stu.parentName}</p>
                        <p className="text-[11px] text-slate-400">{stu.parentPhone}</p>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <Badge variant={stu.status === 'ACTIVE' ? 'emerald' : 'slate'} size="sm" dot>
                          {stu.status}
                        </Badge>
                      </td>

                      {/* Action Buttons */}
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedStudent(stu);
                              setProfileTab('idcard');
                            }}
                            className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-lg transition-colors"
                            title="Generate QR ID Card"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedStudent(stu);
                              setProfileTab('overview');
                            }}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                            title="View 360 Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(stu.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                            title="Delete Student"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Student */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={`New ${getLabel('student')} ${getLabel('admission')}`}
        subtitle={`Fill basic student and parent details to allocate to ${getLabel('groupPlural').toLowerCase()}.`}
        maxWidth="2xl"
      >
        <form onSubmit={handleAddStudent} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">First Name *</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="e.g. Aarav"
                className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Last Name</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="e.g. Kapoor"
                className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-sky-500"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Date of Birth</label>
              <input
                type="date"
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Parent info */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Parent / Guardian Name *</label>
              <input
                type="text"
                required
                value={formData.parentName}
                onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                placeholder="e.g. Amit Kapoor"
                className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Parent Phone (WhatsApp) *</label>
              <input
                type="tel"
                required
                value={formData.parentPhone}
                onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                placeholder="+91 98333 44556"
                className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Enroll {getLabel('student')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal / Drawer: 360-Degree Student Profile */}
      {selectedStudent && (
        <Modal
          isOpen={!!selectedStudent}
          onClose={() => setSelectedStudent(null)}
          title={`${selectedStudent.firstName} ${selectedStudent.lastName}`}
          subtitle={`${getLabel('admission')} No: ${selectedStudent.admissionNo} • ${currentTenant.name}`}
          maxWidth="4xl"
        >
          <div className="space-y-6">
            {/* Tab Bar */}
            <Tabs
              tabs={[
                { id: 'overview', label: '360 Overview' },
                { id: 'idcard', label: '🪪 Smart QR ID Card' },
                { id: 'attendance', label: 'Attendance Log' },
                { id: 'fees', label: 'Fee Ledger' },
                { id: 'exams', label: 'Academic Scores' },
              ]}
              activeTab={profileTab}
              onChange={(tab) => setProfileTab(tab as any)}
            />

            {/* Tab: Overview */}
            {profileTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col items-center p-6 bg-slate-950/60 rounded-2xl border border-slate-800 text-center">
                  <img
                    src={selectedStudent.photoUrl}
                    alt={selectedStudent.firstName}
                    className="w-24 h-24 rounded-2xl object-cover ring-4 ring-sky-500/30 shadow-xl mb-3"
                  />
                  <h4 className="font-bold text-white text-base">
                    {selectedStudent.firstName} {selectedStudent.lastName}
                  </h4>
                  <Badge variant="blue" size="sm" className="mt-1">
                    {selectedStudent.admissionNo}
                  </Badge>
                  <p className="text-xs text-slate-400 mt-2">
                    Enrolled: {selectedStudent.enrollmentDate}
                  </p>
                </div>

                <div className="md:col-span-2 space-y-4">
                  <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3">
                    <h5 className="font-bold text-white text-xs uppercase tracking-wider text-sky-400">
                      Demographics & Guardian Contact
                    </h5>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400">Gender:</span>
                        <p className="font-semibold text-white">{selectedStudent.gender}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Date of Birth:</span>
                        <p className="font-semibold text-white">{selectedStudent.dob}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Parent / Guardian:</span>
                        <p className="font-semibold text-white">{selectedStudent.parentName} ({selectedStudent.parentRelationship || 'Father'})</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Parent Phone / WhatsApp:</span>
                        <p className="font-semibold text-emerald-400 flex items-center gap-1">
                          <Phone className="w-3 h-3 inline" /> {selectedStudent.parentPhone}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400">Residential Address:</span>
                        <p className="font-semibold text-white">{selectedStudent.address}</p>
                      </div>
                    </div>

                    {/* Student Lifecycle Status Controls */}
                    <div className="pt-3 border-t border-slate-800">
                      <span className="text-slate-400 text-xs block mb-2 font-medium">Lifecycle Status & Progression:</span>
                      <div className="flex flex-wrap gap-2">
                        {(['ACTIVE', 'INACTIVE', 'GRADUATED', 'TRANSFERRED', 'ARCHIVED'] as const).map((status) => (
                          <button
                            key={status}
                            onClick={() => {
                              const updated = { ...selectedStudent, status };
                              storage.saveStudent(updated);
                              setSelectedStudent(updated);
                              setStudents(storage.getStudents(currentTenant.id));
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                              selectedStudent.status === status
                                ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20 ring-1 ring-sky-400'
                                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                            }`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Smart QR ID Card Generator */}
            {profileTab === 'idcard' && (
              <div className="flex flex-col items-center space-y-4">
                <div className="p-6 bg-gradient-to-br from-slate-900 via-sky-950/40 to-slate-900 border-2 border-sky-500/40 rounded-3xl w-80 shadow-2xl space-y-4 printable-area">
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <img src={currentTenant.logo} alt="Logo" className="w-8 h-8 rounded-lg object-cover" />
                      <div>
                        <h5 className="font-bold text-white text-xs leading-tight">{currentTenant.name}</h5>
                        <p className="text-[9px] text-sky-400 font-medium">STUDENT IDENTITY CARD</p>
                      </div>
                    </div>
                  </div>

                  {/* Photo & Name */}
                  <div className="flex items-center gap-3">
                    <img
                      src={selectedStudent.photoUrl}
                      alt={selectedStudent.firstName}
                      className="w-16 h-16 rounded-xl object-cover ring-2 ring-sky-400"
                    />
                    <div>
                      <h4 className="font-extrabold text-white text-sm">
                        {selectedStudent.firstName} {selectedStudent.lastName}
                      </h4>
                      <p className="text-[10px] text-slate-300 font-mono">ID: {selectedStudent.admissionNo}</p>
                      <p className="text-[10px] text-sky-400">
                        {isSchool ? 'Class 10 - Sec A' : 'JEE Alpha 2027'}
                      </p>
                    </div>
                  </div>

                  {/* QR Code Container */}
                  <div className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl shadow-inner">
                    <QrCode className="w-24 h-24 text-slate-950" />
                    <p className="text-[9px] font-mono text-slate-800 mt-1 font-bold">
                      {selectedStudent.qrCode}
                    </p>
                  </div>

                  {/* Footer Emergency */}
                  <div className="text-center text-[9px] text-slate-400 border-t border-slate-800/80 pt-2">
                    Emergency: {selectedStudent.parentPhone} • Session {currentTenant.academicYear}
                  </div>
                </div>

                <div className="flex items-center gap-3 no-print">
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Printer className="w-4 h-4" />}
                    onClick={() => window.print()}
                  >
                    Print ID Card
                  </Button>
                </div>
              </div>
            )}

            {/* Tab: Attendance */}
            {profileTab === 'attendance' && (
              <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-sm">Attendance Summary</h4>
                  <Badge variant="emerald" size="sm">94.2% Attendance</Badge>
                </div>
                <p className="text-xs text-slate-400">
                  Student attended 49 out of 52 academic days this semester.
                </p>
              </div>
            )}

            {/* Tab: Fees */}
            {profileTab === 'fees' && (
              <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3">
                <h4 className="font-bold text-white text-sm">Fee Ledger Status</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-900 rounded-xl">
                    <p className="text-[10px] text-slate-400">Invoiced</p>
                    <p className="text-sm font-bold text-white">₹1,00,000</p>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl">
                    <p className="text-[10px] text-emerald-400">Paid</p>
                    <p className="text-sm font-bold text-emerald-400">₹50,000</p>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl">
                    <p className="text-[10px] text-rose-400">Due</p>
                    <p className="text-sm font-bold text-rose-400">₹50,000</p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Exams */}
            {profileTab === 'exams' && (
              <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3">
                <h4 className="font-bold text-white text-sm">Latest Academic Standing</h4>
                <div className="p-3 bg-slate-900 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-white">Half-Yearly Examination 2026</p>
                    <p className="text-[11px] text-slate-400">Score: 359 / 400 (89.75%)</p>
                  </div>
                  <Badge variant="purple">Rank #3</Badge>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* MODAL: BULK CSV / EXCEL IMPORT */}
      {isBulkImportOpen && (
        <Modal
          isOpen={isBulkImportOpen}
          onClose={() => setIsBulkImportOpen(false)}
          title="📥 Bulk Student Data Import (CSV / XLSX)"
        >
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-sky-950/40 border border-sky-500/40 text-xs text-sky-200 space-y-1">
              <p className="font-bold text-white">Importing into: {currentTenant.name}</p>
              <p className="text-slate-300">
                Upload CSV or Excel file containing columns: <span className="font-mono text-sky-400">firstName, lastName, gender, parentName, parentPhone, parentRelationship, address</span>.
              </p>
            </div>

            {/* Simulated Upload Dropzone */}
            <div className="border-2 border-dashed border-slate-700 rounded-2xl p-6 text-center space-y-2 bg-slate-950/50">
              <FileSpreadsheet className="w-10 h-10 text-sky-400 mx-auto" />
              <p className="text-sm font-bold text-white">students_enrollment_batch_aug2026.csv</p>
              <p className="text-xs text-slate-400">File size: 24.8 KB • 2 Rows Parsed</p>
            </div>

            {/* Validation Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">Batch Validation Summary</span>
                <Badge variant="emerald" size="sm">✓ 2 Valid Records</Badge>
              </div>

              <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                  <span className="text-slate-300 font-medium">1. Divya Agarwal (Sector 21, Dwarka)</span>
                  <span className="text-emerald-400 font-mono font-bold">READY</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-300 font-medium">2. Karan Singhania (Vasant Kunj)</span>
                  <span className="text-emerald-400 font-mono font-bold">READY</span>
                </div>
              </div>
            </div>

            {/* Duplicate Strategy Policy */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-medium block">
                Duplicate Record Resolution Policy:
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setImportDuplicateMode('SKIP')}
                  className={`p-2.5 rounded-xl border text-left font-medium transition-all ${
                    importDuplicateMode === 'SKIP'
                      ? 'bg-sky-950/60 border-sky-500 text-sky-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <p className="font-bold">Skip Duplicates</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Keep existing records untouched</p>
                </button>

                <button
                  type="button"
                  onClick={() => setImportDuplicateMode('UPDATE')}
                  className={`p-2.5 rounded-xl border text-left font-medium transition-all ${
                    importDuplicateMode === 'UPDATE'
                      ? 'bg-sky-950/60 border-sky-500 text-sky-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <p className="font-bold">Update Existing</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Overwrite non-system fields</p>
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setIsBulkImportOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                leftIcon={<Upload className="w-4 h-4" />}
                onClick={handleExecuteBulkImport}
              >
                Confirm & Import Records
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
