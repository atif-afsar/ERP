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
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { storage } from '../../services/storageService';
import { AcademicClass, CoachingCourse, CoachingBatch, Staff } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';

export const AcademicsModule: React.FC = () => {
  const { currentTenant, getLabel, isSchool, isCoaching } = useTenant();
  const [classes, setClasses] = useState<AcademicClass[]>(() => storage.getClasses(currentTenant.id));
  const [courses, setCourses] = useState<CoachingCourse[]>(() => storage.getCourses(currentTenant.id));
  const [batches, setBatches] = useState<CoachingBatch[]>(() => storage.getBatches(currentTenant.id));
  const staff = storage.getStaff(currentTenant.id);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newCapacity, setNewCapacity] = useState('40');
  const [newSchedule, setNewSchedule] = useState('Mon-Fri 08:00 AM - 02:00 PM');
  const [newRoom, setNewRoom] = useState('Room 101');

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
    }

    setNewGroupName('');
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Academic Year Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {isSchool ? 'Academic Classes & Sections' : 'Courses & Batches Management'}
            </h2>
            <Badge variant="emerald" size="sm" dot>
              {currentTenant.academicYear || '2026-2027'} (Active)
            </Badge>
          </div>
          <p className="text-xs text-slate-400">
            {isSchool
              ? 'Organize grade levels, section capacities, and assigned class teachers.'
              : 'Manage competitive exam courses, multi-batch schedules, and faculty allocations.'}
          </p>
        </div>

        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsAddModalOpen(true)}
        >
          Add {getLabel('group')}
        </Button>
      </div>

      {/* SCHOOL MODE: CLASSES & SECTIONS */}
      {isSchool && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((cls) => (
            <div
              key={cls.id}
              className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 hover:border-slate-700 transition-all"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-base">{cls.name}</h3>
                <Badge variant="blue" size="sm">{cls.sections.length} Sections</Badge>
              </div>

              <div className="space-y-2.5">
                {cls.sections.map((sec) => (
                  <div
                    key={sec.id}
                    className="p-3.5 bg-slate-900/70 border border-slate-800 rounded-xl space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-white text-sm">{sec.name}</p>
                      <Badge variant="emerald" size="sm">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between text-slate-400 text-[11px]">
                      <span>Max Capacity: {sec.capacity} Students</span>
                      <span className="text-sky-400">Class Teacher Assigned</span>
                    </div>
                    {/* Capacity utilization indicator */}
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-sky-500 h-full rounded-full" style={{ width: '75%' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* COACHING MODE: COURSES & BATCHES */}
      {isCoaching && (
        <div className="space-y-6">
          {/* Courses */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Offered Competitive Courses</h3>
              <Badge variant="purple" size="sm">{courses.length} Programs</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 hover:border-purple-500/40 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="purple" size="sm">{course.code}</Badge>
                    <span className="font-bold text-emerald-400 text-xs">₹{course.feeAmount.toLocaleString()}</span>
                  </div>
                  <h4 className="font-bold text-white text-sm">{course.name}</h4>
                  <p className="text-xs text-slate-400 line-clamp-2">{course.description}</p>
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Target: {course.targetExam}</span>
                    <span>{course.durationMonths} Months</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Batches Grid */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Active Running Batches</h3>
              <Badge variant="blue" size="sm">{batches.length} Batches</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {batches.map((batch) => {
                const percent = Math.min(100, Math.round((batch.enrolledCount / batch.capacity) * 100));
                const isNearCapacity = percent >= 90;

                return (
                  <div
                    key={batch.id}
                    className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 hover:border-sky-500/40 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-white text-sm">{batch.name}</h4>
                      <Badge variant={isNearCapacity ? 'amber' : 'blue'} size="sm">
                        {batch.enrolledCount}/{batch.capacity} Enrolled
                      </Badge>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-300">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-sky-400" />
                        <span>{batch.schedule}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-amber-400" />
                        <span>{batch.roomNo}</span>
                      </div>
                    </div>

                    {/* Capacity progress */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Capacity Utilization</span>
                        <span>{percent}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isNearCapacity ? 'bg-amber-400' : 'bg-sky-500'}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                      <span>Term: {batch.startDate} to {batch.endDate}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Group */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={`Add New ${getLabel('group')}`}
        subtitle={`Provision a new ${getLabel('group').toLowerCase()} with assigned schedule and student capacity.`}
        maxWidth="md"
      >
        <form onSubmit={handleCreateGroup} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">{getLabel('group')} Name *</label>
            <input
              type="text"
              required
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder={isSchool ? 'e.g. Class 11 - Science' : 'e.g. JEE Advanced Fast-Track 2027'}
              className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Max Capacity *</label>
              <input
                type="number"
                required
                value={newCapacity}
                onChange={(e) => setNewCapacity(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Room / Hall</label>
              <input
                type="text"
                value={newRoom}
                onChange={(e) => setNewRoom(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {isCoaching && (
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Schedule Matrix</label>
              <input
                type="text"
                value={newSchedule}
                onChange={(e) => setNewSchedule(e.target.value)}
                placeholder="e.g. Mon, Wed, Fri 05:00 PM - 08:00 PM"
                className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save {getLabel('group')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
