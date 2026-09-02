import React, { useState } from 'react';
import { Calendar, Clock, MapPin, User, BookOpen, Plus, AlertTriangle, CheckCircle, Video } from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storageService';
import { TimetableSlot } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';

export const TimetableModule: React.FC = () => {
  const { currentTenant, getLabel, isSchool, isCoaching } = useTenant();
  const { can } = useAuth();
  const [timetable, setTimetable] = useState<TimetableSlot[]>(() => storage.getTimetable(currentTenant.id));
  const classes = storage.getClasses(currentTenant.id);
  const batches = storage.getBatches(currentTenant.id);
  const staff = storage.getStaff(currentTenant.id);

  const days: ('MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY')[] = [
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
  ];

  const [selectedDay, setSelectedDay] = useState<string>('MONDAY');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    subject: 'Mathematics',
    teacherId: staff[0]?.id || '',
    teacherName: staff[0]?.name || 'Mr. Rajesh Sharma',
    roomNo: 'Room 201',
    startTime: '09:00 AM',
    endTime: '10:00 AM',
    groupId: isSchool ? classes[0]?.id || 'class-10-a' : batches[0]?.id || 'batch-jee-alpha',
    groupName: isSchool ? 'Class 10 - Section A' : 'JEE Alpha 2027',
  });

  const handleTeacherChange = (teacherId: string) => {
    const teacher = staff.find((s) => s.id === teacherId);
    setFormData({
      ...formData,
      teacherId,
      teacherName: teacher?.name || 'Faculty Member',
    });
  };

  const handleAddSlot = (e: React.FormEvent) => {
    e.preventDefault();
    setConflictError(null);

    // Conflict Detection: Check if teacher or room is already booked for this day and time slot
    const teacherConflict = timetable.find(
      (s) =>
        s.dayOfWeek === selectedDay &&
        s.teacherName === formData.teacherName &&
        s.startTime === formData.startTime
    );

    if (teacherConflict) {
      setConflictError(
        `Teacher Conflict: ${formData.teacherName} is already assigned to ${teacherConflict.groupName} (${teacherConflict.subject}) at ${formData.startTime}.`
      );
      return;
    }

    const roomConflict = timetable.find(
      (s) =>
        s.dayOfWeek === selectedDay &&
        s.roomNo === formData.roomNo &&
        s.startTime === formData.startTime
    );

    if (roomConflict) {
      setConflictError(
        `Room Conflict: ${formData.roomNo} is already booked for ${roomConflict.groupName} (${roomConflict.subject}) at ${formData.startTime}.`
      );
      return;
    }

    const newSlot: TimetableSlot = {
      id: `slot-${Date.now()}`,
      tenantId: currentTenant.id,
      dayOfWeek: selectedDay as any,
      startTime: formData.startTime,
      endTime: formData.endTime,
      subject: formData.subject,
      teacherId: formData.teacherId,
      teacherName: formData.teacherName,
      roomNo: formData.roomNo,
      groupId: formData.groupId,
      groupName: formData.groupName,
      color: 'sky',
    };

    storage.saveTimetable(newSlot);
    const updated = storage.getTimetable(currentTenant.id);
    setTimetable(updated);
    setIsAddModalOpen(false);
  };

  const filteredSlots = timetable.filter((s) => s.dayOfWeek === selectedDay);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Academic Timetable & Lecture Schedule
            </h2>
            <Badge variant="blue" size="sm">
              {currentTenant.academicYear || '2026-2027'} Active
            </Badge>
          </div>
          <p className="text-xs text-slate-400">
            Weekly class routines, conflict-free faculty allocations, and lecture hall bookings.
          </p>
        </div>

        {can('timetable.manage') && (
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setConflictError(null);
              setIsAddModalOpen(true);
            }}
          >
            Add Lecture Slot
          </Button>
        )}
      </div>

      {/* Day Selector */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {days.map((day) => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              selectedDay === day
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Slots Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSlots.length === 0 ? (
          <div className="col-span-full p-12 glass-panel rounded-2xl border border-slate-800 text-center text-slate-400 text-xs space-y-2">
            <Calendar className="w-8 h-8 mx-auto text-slate-500" />
            <p className="text-white font-semibold">No scheduled lectures on {selectedDay}.</p>
            <p className="text-slate-500 text-[11px]">Click "Add Lecture Slot" to configure new periods.</p>
          </div>
        ) : (
          filteredSlots.map((slot, index) => (
            <div
              key={slot.id}
              className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3 hover:border-sky-500/40 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse" />
                  <span className="font-bold text-white text-sm">{slot.subject}</span>
                </div>
                <Badge variant="blue" size="sm">
                  {slot.startTime} - {slot.endTime}
                </Badge>
              </div>

              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>{slot.teacherName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>{slot.roomNo}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-medium">{slot.groupName}</span>
                <Badge variant={index === 0 ? 'emerald' : 'slate'} size="sm" dot>
                  {index === 0 ? 'Live / Next' : 'Scheduled'}
                </Badge>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Add Lecture Slot */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={`Schedule Lecture Slot (${selectedDay})`}
        subtitle="Specify academic group, subject, faculty member, time slot, and assigned room."
        maxWidth="md"
      >
        <form onSubmit={handleAddSlot} className="space-y-4 text-xs">
          {conflictError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2 text-rose-400">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <p className="leading-tight">{conflictError}</p>
            </div>
          )}

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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Subject *</label>
              <input
                type="text"
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Assigned Teacher *</label>
              <select
                value={formData.teacherId}
                onChange={(e) => handleTeacherChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-sky-500"
              >
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Start Time *</label>
              <input
                type="text"
                required
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                placeholder="09:00 AM"
                className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">End Time *</label>
              <input
                type="text"
                required
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                placeholder="10:00 AM"
                className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Room / Hall *</label>
              <input
                type="text"
                required
                value={formData.roomNo}
                onChange={(e) => setFormData({ ...formData, roomNo: e.target.value })}
                placeholder="Room 201"
                className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Confirm & Save Slot
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
