import React, { useState } from 'react';
import { BookOpen, Plus, Calendar, Clock, CheckCircle2, FileText, User, Award, ArrowUpRight, Search } from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storageService';
import { Homework } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Tabs } from '../../components/ui/Tabs';

export const HomeworkModule: React.FC = () => {
  const { currentTenant, getLabel, isSchool, isCoaching } = useTenant();
  const { can } = useAuth();
  const classes = storage.getClasses(currentTenant.id);
  const batches = storage.getBatches(currentTenant.id);
  const staff = storage.getStaff(currentTenant.id);

  const [homeworkList, setHomeworkList] = useState<Homework[]>(() =>
    storage.getHomework(currentTenant.id)
  );

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [filterTab, setFilterTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    subject: 'Mathematics',
    title: '',
    description: '',
    groupId: isSchool ? classes[0]?.id || 'class-10-a' : batches[0]?.id || 'batch-jee-alpha',
    groupName: isSchool ? 'Class 10 - Section A' : 'JEE Alpha 2027',
    dueDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    maxMarks: '25',
  });

  const handleCreateHomework = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;

    const newHw: Homework = {
      id: `hw-${Date.now()}`,
      tenantId: currentTenant.id,
      groupId: formData.groupId,
      groupName: formData.groupName,
      subject: formData.subject,
      title: formData.title,
      description: formData.description,
      assignedDate: new Date().toISOString().split('T')[0],
      dueDate: formData.dueDate,
      teacherName: staff[0]?.name || 'Senior Faculty',
      submissionsCount: 0,
      totalStudents: isSchool ? 40 : 45,
    };

    storage.saveHomework(newHw);
    setHomeworkList(storage.getHomework(currentTenant.id));
    setIsAddModalOpen(false);
    setFormData({
      subject: 'Mathematics',
      title: '',
      description: '',
      groupId: isSchool ? classes[0]?.id || 'class-10-a' : batches[0]?.id || 'batch-jee-alpha',
      groupName: isSchool ? 'Class 10 - Section A' : 'JEE Alpha 2027',
      dueDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      maxMarks: '25',
    });
  };

  const filteredList = homeworkList.filter((hw) => {
    const matchesSearch =
      hw.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hw.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hw.groupName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {getLabel('homework')} & Assignments
            </h2>
            <Badge variant="blue" size="sm">
              {isSchool ? 'CBSE Standard' : 'IIT-JEE / NEET DPP'}
            </Badge>
          </div>
          <p className="text-xs text-slate-400">
            {isSchool
              ? 'Assign daily homework, chapter worksheets, and monitor class submission rates.'
              : 'Distribute Daily Practice Problem (DPP) sheets, numerical sets, and track student submissions.'}
          </p>
        </div>

        {can('homework.create') && (
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsAddModalOpen(true)}
          >
            Create {getLabel('homework')}
          </Button>
        )}
      </div>

      {/* Search & Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${getLabel('homework').toLowerCase()} by title, subject...`}
            className="w-full pl-10 pr-4 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
          />
        </div>

        <Tabs
          tabs={[
            { id: 'all', label: 'All Tasks' },
            { id: 'active', label: 'Active Due' },
            { id: 'completed', label: 'Evaluated' },
          ]}
          activeTab={filterTab}
          onChange={(t) => setFilterTab(t)}
        />
      </div>

      {/* Homework Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredList.length === 0 ? (
          <div className="col-span-full p-12 glass-panel rounded-2xl border border-slate-800 text-center text-slate-400 text-xs space-y-2">
            <BookOpen className="w-8 h-8 mx-auto text-slate-500" />
            <p className="text-white font-semibold">No {getLabel('homework').toLowerCase()} records found.</p>
            <p className="text-slate-500 text-[11px]">Create a new task to assign problems to students.</p>
          </div>
        ) : (
          filteredList.map((hw) => {
            const submissionPercent = Math.min(
              100,
              Math.round((hw.submissionsCount / hw.totalStudents) * 100)
            );

            return (
              <div
                key={hw.id}
                className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 hover:border-sky-500/40 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="purple" size="sm">{hw.subject}</Badge>
                    <span className="text-xs font-semibold text-slate-300">{hw.groupName}</span>
                  </div>
                  <span className="text-xs text-rose-400 font-medium">Due: {hw.dueDate}</span>
                </div>

                <div>
                  <h3 className="font-bold text-white text-base group-hover:text-sky-400 transition-colors">
                    {hw.title}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed line-clamp-2">
                    {hw.description}
                  </p>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Submission Status</span>
                    <span className="text-emerald-400 font-semibold">
                      {hw.submissionsCount} / {hw.totalStudents} ({submissionPercent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all"
                      style={{ width: `${submissionPercent}%` }}
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>{hw.teacherName}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sky-400 font-medium cursor-pointer hover:underline">
                    <span>View Submissions</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Create Homework */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={`Create New ${getLabel('homework')}`}
        subtitle={`Publish assignment tasks, problem sheets, and due dates for ${getLabel('groupPlural').toLowerCase()}.`}
        maxWidth="lg"
      >
        <form onSubmit={handleCreateHomework} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">{getLabel('group')} *</label>
              <select
                value={formData.groupName}
                onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-sky-500"
              >
                {isSchool
                  ? classes.map((c) => (
                      <option key={c.id} value={`${c.name} - Section A`}>
                        {c.name} - Section A
                      </option>
                    ))
                  : batches.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Subject *</label>
              <input
                type="text"
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="e.g. Physics / Calculus"
                className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Assignment Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={isSchool ? 'e.g. Chapter 4 - Light Reflection & Refraction Exercises' : 'e.g. DPP-08: Rotational Dynamics Advanced Problem Set'}
              className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Task Instructions & Questions</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Write detailed student instructions or problem numbers..."
              className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-sky-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Submission Due Date *</label>
              <input
                type="date"
                required
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Maximum Marks (Optional)</label>
              <input
                type="number"
                value={formData.maxMarks}
                onChange={(e) => setFormData({ ...formData, maxMarks: e.target.value })}
                placeholder="25"
                className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Publish {getLabel('homework')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
