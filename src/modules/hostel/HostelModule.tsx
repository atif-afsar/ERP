import React, { useState, useMemo } from 'react';
import {
  Home,
  Building,
  Bed,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  Search,
  Filter,
  ShieldCheck,
  Phone,
  FileText,
  Calendar,
  X,
  Printer,
  ChevronRight,
  LogOut,
  Wrench,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storageService';
import {
  Hostel,
  HostelRoom,
  HostelBed,
  HostelAllocation,
  HostelAttendanceRecord,
  GatePass,
  HostelComplaint,
  RoomType,
} from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Tabs } from '../../components/ui/Tabs';

export const HostelModule: React.FC = () => {
  const { currentTenant, isSchool, isCoaching } = useTenant();
  const { currentUser } = useAuth();

  // Primary State
  const [hostels, setHostels] = useState<Hostel[]>(() =>
    storage.getHostels(currentTenant.id)
  );
  const [rooms, setRooms] = useState<HostelRoom[]>(() =>
    storage.getHostelRooms(currentTenant.id)
  );
  const [beds, setBeds] = useState<HostelBed[]>(() =>
    storage.getHostelBeds(currentTenant.id)
  );
  const [allocations, setAllocations] = useState<HostelAllocation[]>(() =>
    storage.getHostelAllocations(currentTenant.id)
  );
  const [attendance, setAttendance] = useState<HostelAttendanceRecord[]>(() =>
    storage.getHostelAttendance(currentTenant.id)
  );
  const [passes, setPasses] = useState<GatePass[]>(() =>
    storage.getGatePasses(currentTenant.id)
  );
  const [complaints, setComplaints] = useState<HostelComplaint[]>(() =>
    storage.getHostelComplaints(currentTenant.id)
  );

  // Aux data
  const students = storage.getStudents(currentTenant.id);

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    'rooms' | 'allocations' | 'attendance' | 'passes' | 'complaints'
  >('rooms');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [hostelFilter, setHostelFilter] = useState('ALL');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Modals
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState(false);
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);

  // Form State
  const [allocateForm, setAllocateForm] = useState({
    studentId: students[0]?.id || '',
    hostelId: hostels[0]?.id || '',
    bedId: beds.find((b) => b.status === 'VACANT')?.id || '',
    securityDeposit: 15000,
  });

  const [roomForm, setRoomForm] = useState({
    hostelId: hostels[0]?.id || '',
    block: 'Block A',
    floor: 1,
    roomNumber: `10${Math.floor(3 + Math.random() * 6)}`,
    roomType: 'DOUBLE' as RoomType,
    capacity: 2,
    hasAttachedBath: true,
    isAirConditioned: true,
    monthlyRent: 8500,
  });

  const [passForm, setPassForm] = useState({
    studentId: students[0]?.id || '',
    passType: 'DAY_OUT' as const,
    departureTime: `${new Date().toISOString().split('T')[0]} 09:00 AM`,
    expectedReturn: `${new Date().toISOString().split('T')[0]} 06:00 PM`,
    reason: 'Family visit / medical appointment',
  });

  const [complaintForm, setComplaintForm] = useState({
    studentId: students[0]?.id || '',
    category: 'ELECTRICAL' as const,
    description: '',
    priority: 'MEDIUM' as const,
  });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // KPIs
  const totalBedsCount = useMemo(() => beds.length, [beds]);
  const occupiedBedsCount = useMemo(
    () => beds.filter((b) => b.status === 'OCCUPIED').length,
    [beds]
  );
  const vacantBedsCount = useMemo(
    () => beds.filter((b) => b.status === 'VACANT').length,
    [beds]
  );
  const openComplaintsCount = useMemo(
    () => complaints.filter((c) => c.status !== 'RESOLVED').length,
    [complaints]
  );

  // Filtered Rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      const matchHostel = hostelFilter === 'ALL' || r.hostelId === hostelFilter;
      const matchSearch =
        r.roomNumber.includes(searchQuery) ||
        r.block.toLowerCase().includes(searchQuery.toLowerCase());
      return matchHostel && matchSearch;
    });
  }, [rooms, hostelFilter, searchQuery]);

  // 1. Allocate Bed to Student (Strict Gender Policy & Bed Vacancy Check)
  const handleAllocateBed = (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find((s) => s.id === allocateForm.studentId);
    const hostel = hostels.find((h) => h.id === allocateForm.hostelId);
    const bed = beds.find((b) => b.id === allocateForm.bedId);
    if (!student || !hostel || !bed) return;

    // Check gender policy
    if (hostel.genderPolicy !== 'MIXED' && student.gender !== hostel.genderPolicy) {
      alert(
        `GENDER POLICY VIOLATION! Student gender (${student.gender}) does not match the configured residence policy for ${hostel.name} (${hostel.genderPolicy} only).`
      );
      return;
    }

    // Check bed status
    if (bed.status !== 'VACANT') {
      alert(`Bed ${bed.bedCode} is already occupied or under maintenance!`);
      return;
    }

    const room = rooms.find((r) => r.id === bed.roomId) || rooms[0];

    const studentFullName = `${student.firstName} ${student.lastName}`;

    const allocation: HostelAllocation = {
      id: `alloc-${Date.now()}`,
      tenantId: currentTenant.id,
      studentId: student.id,
      studentName: studentFullName,
      admissionNo: student.admissionNo,
      gender: student.gender,
      hostelId: hostel.id,
      hostelName: hostel.name,
      roomId: room.id,
      roomNumber: room.roomNumber,
      bedId: bed.id,
      bedCode: bed.bedCode,
      allocationDate: new Date().toISOString().split('T')[0],
      securityDeposit: Number(allocateForm.securityDeposit),
      monthlyFee: room.monthlyRent,
      status: 'ACTIVE',
    };

    storage.allocateHostelBed(allocation);
    setAllocations(storage.getHostelAllocations(currentTenant.id));
    setBeds(storage.getHostelBeds(currentTenant.id));
    setRooms(storage.getHostelRooms(currentTenant.id));
    setIsAllocateModalOpen(false);

    storage.saveAuditLog({
      id: `audit_${Date.now()}`,
      tenantId: currentTenant.id,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'HOSTEL_ALLOCATION',
      category: 'HOSTEL',
      entityType: 'HOSTEL_BED',
      entityId: bed.id,
      details: `Allocated bed ${bed.bedCode} in ${hostel.name} (Room ${room.roomNumber}) to ${studentFullName} (${student.admissionNo}). Rent: ₹${room.monthlyRent}/mo.`,
      timestamp: new Date().toISOString(),
      status: 'SUCCESS',
    });

    showToast(`Allocated bed ${bed.bedCode} to ${studentFullName}.`);
  };

  // 2. Check-out Student
  const handleCheckOut = (allocationId: string, bedCode: string, studentName: string) => {
    if (!confirm(`Confirm check-out for ${studentName} from Bed ${bedCode}? The bed will be marked VACANT.`)) return;

    storage.checkOutHostelBed(allocationId);
    setAllocations(storage.getHostelAllocations(currentTenant.id));
    setBeds(storage.getHostelBeds(currentTenant.id));
    setRooms(storage.getHostelRooms(currentTenant.id));
    showToast(`Checked out ${studentName}. Bed ${bedCode} is now vacant.`);
  };

  // 3. Add Room
  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const hostel = hostels.find((h) => h.id === roomForm.hostelId) || hostels[0];
    const roomId = `room-${Date.now()}`;
    const cap = Number(roomForm.capacity);

    const newRoom: HostelRoom = {
      id: roomId,
      tenantId: currentTenant.id,
      hostelId: hostel.id,
      hostelCode: hostel.code,
      block: roomForm.block,
      floor: Number(roomForm.floor),
      roomNumber: roomForm.roomNumber,
      roomType: roomForm.roomType,
      capacity: cap,
      occupiedBeds: 0,
      hasAttachedBath: roomForm.hasAttachedBath,
      isAirConditioned: roomForm.isAirConditioned,
      monthlyRent: Number(roomForm.monthlyRent),
    };

    storage.saveHostelRoom(newRoom);

    // Create physical beds for room
    for (let i = 1; i <= cap; i++) {
      const newBed: HostelBed = {
        id: `bed-${Date.now()}-${i}`,
        tenantId: currentTenant.id,
        roomId: roomId,
        roomNumber: roomForm.roomNumber,
        hostelId: hostel.id,
        bedCode: `${hostel.code}-${roomForm.block.slice(-1)}-${roomForm.roomNumber}-B${i}`,
        bedNumber: i,
        status: 'VACANT',
      };
      storage.saveHostelBed(newBed);
    }

    setRooms(storage.getHostelRooms(currentTenant.id));
    setBeds(storage.getHostelBeds(currentTenant.id));
    setIsAddRoomModalOpen(false);
    showToast(`Room ${newRoom.roomNumber} created with ${cap} vacant beds.`);
  };

  // 4. Request Gate Pass
  const handleCreateGatePass = (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find((s) => s.id === passForm.studentId);
    if (!student) return;

    const studentFullName = `${student.firstName} ${student.lastName}`;
    const alloc = allocations.find((a) => a.studentId === student.id && a.status === 'ACTIVE');

    const newPass: GatePass = {
      id: `gp-${Date.now()}`,
      tenantId: currentTenant.id,
      studentId: student.id,
      studentName: studentFullName,
      roomNumber: alloc ? alloc.roomNumber : 'Hostel Resident',
      passType: passForm.passType,
      departureTime: passForm.departureTime,
      expectedReturn: passForm.expectedReturn,
      reason: passForm.reason,
      approvedBy: currentUser.name,
      status: 'APPROVED',
    };

    storage.saveGatePass(newPass);
    setPasses(storage.getGatePasses(currentTenant.id));
    setIsPassModalOpen(false);
    showToast(`Gate pass issued for ${studentFullName}.`);
  };

  // 5. Log Complaint
  const handleCreateComplaint = (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find((s) => s.id === complaintForm.studentId);
    if (!student) return;

    const studentFullName = `${student.firstName} ${student.lastName}`;
    const alloc = allocations.find((a) => a.studentId === student.id && a.status === 'ACTIVE');

    const complaint: HostelComplaint = {
      id: `comp-${Date.now()}`,
      tenantId: currentTenant.id,
      studentId: student.id,
      studentName: studentFullName,
      roomNumber: alloc ? alloc.roomNumber : '101',
      category: complaintForm.category,
      description: complaintForm.description,
      priority: complaintForm.priority,
      status: 'OPEN',
      loggedAt: new Date().toISOString(),
    };

    storage.saveHostelComplaint(complaint);
    setComplaints(storage.getHostelComplaints(currentTenant.id));
    setIsComplaintModalOpen(false);
    showToast(`Maintenance complaint logged for Room ${complaint.roomNumber}.`);
  };

  return (
    <div className="space-y-6 animate-fade-in print:p-0">
      {/* Toast */}
      {toastMsg && (
        <div className="no-print p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between text-xs font-semibold shadow-lg shadow-emerald-950/20 animate-slide-down">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="no-print p-6 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl relative overflow-hidden shadow-2xl">
        <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-rose-500/20 to-pink-600/20 border border-rose-500/30 text-rose-400 shadow-md shadow-rose-500/10">
                <Home className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  Hostel & Residence Management
                  <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300">
                    Doc 59 Canonical
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Hostel buildings, blocks, floors, room types, bed vacancy allocation, night roll-call attendance, and gate passes.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Building className="w-4 h-4" />}
              onClick={() => setIsAddRoomModalOpen(true)}
            >
              Add Room
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsAllocateModalOpen(true)}
              className="bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-950/20"
            >
              Allocate Bed
            </Button>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="mt-6 pt-4 border-t border-slate-800/80">
          <Tabs
            activeTab={activeTab}
            onChange={(tab: any) => setActiveTab(tab)}
            tabs={[
              { id: 'rooms', label: 'Rooms & Bed Vacancy', count: rooms.length },
              { id: 'allocations', label: 'Resident Students', count: allocations.filter((a) => a.status === 'ACTIVE').length },
              { id: 'attendance', label: 'Night Roll-Call Attendance', count: attendance.length },
              { id: 'passes', label: 'Gate Passes & Outpasses', count: passes.length },
              { id: 'complaints', label: 'Maintenance Tickets', count: openComplaintsCount },
            ]}
          />
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total Hostels</span>
          <h3 className="text-2xl font-black text-white font-mono">{hostels.length} Hostels</h3>
          <p className="text-[11px] text-slate-400">{rooms.length} Rooms across blocks</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider block">Total Beds</span>
          <h3 className="text-2xl font-black text-rose-400 font-mono">{totalBedsCount} Beds</h3>
          <p className="text-[11px] text-slate-400">
            Occupancy: {Math.round((occupiedBedsCount / (totalBedsCount || 1)) * 100)}%
          </p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block">Vacant Beds</span>
          <h3 className="text-2xl font-black text-emerald-400 font-mono">{vacantBedsCount} Vacant</h3>
          <p className="text-[11px] text-slate-400">Available for new admissions</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider block">Maintenance Tickets</span>
          <h3 className="text-2xl font-black text-amber-400 font-mono">{openComplaintsCount} Open</h3>
          <p className="text-[11px] text-slate-400">Plumbing & electrical issues</p>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: ROOMS & BED VACANCY */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'rooms' && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by room number or block..."
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">Hostel:</span>
              <select
                value={hostelFilter}
                onChange={(e) => setHostelFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              >
                <option value="ALL">All Hostels</option>
                {hostels.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.genderPolicy})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {filteredRooms.map((r) => {
              const roomBeds = beds.filter((b) => b.roomId === r.id);

              return (
                <div key={r.id} className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-mono text-rose-400 font-bold uppercase block">
                        {r.hostelCode} • {r.block} • Floor {r.floor}
                      </span>
                      <h4 className="font-bold text-white text-lg">Room {r.roomNumber}</h4>
                      <p className="text-xs text-slate-400">
                        {r.roomType} Room • ₹{r.monthlyRent.toLocaleString('en-IN')}/mo
                      </p>
                    </div>
                    <Badge variant={r.isAirConditioned ? 'purple' : 'slate'}>
                      {r.isAirConditioned ? 'AC' : 'NON-AC'}
                    </Badge>
                  </div>

                  {/* Bed Chips Matrix */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Assigned Beds ({r.occupiedBeds}/{r.capacity})
                    </span>
                    <div className="space-y-1.5">
                      {roomBeds.map((b) => (
                        <div
                          key={b.id}
                          className="p-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <Bed className="w-3.5 h-3.5 text-rose-400" />
                            <span className="font-mono font-bold text-white">{b.bedCode}</span>
                          </div>
                          {b.status === 'OCCUPIED' ? (
                            <span className="text-[11px] font-medium text-emerald-400 truncate max-w-[120px]">
                              {b.studentName}
                            </span>
                          ) : (
                            <Badge variant="emerald" size="sm">
                              VACANT
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: RESIDENT STUDENTS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'allocations' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white">Active Resident Student Roster</h3>
              <p className="text-xs text-slate-400">
                Bed allocations with security deposit records and room check-out desk.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsAllocateModalOpen(true)}
              className="bg-rose-600 hover:bg-rose-500"
            >
              Allocate Bed
            </Button>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Resident Student</th>
                    <th className="py-3 px-4">Hostel Facility</th>
                    <th className="py-3 px-4 text-center">Room & Bed</th>
                    <th className="py-3 px-4 font-mono">Allocated On</th>
                    <th className="py-3 px-4 text-center">Monthly Fee</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {allocations.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold text-white block">{a.studentName}</span>
                        <span className="font-mono text-slate-400 text-[11px]">{a.admissionNo} ({a.gender})</span>
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-medium">{a.hostelName}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-bold text-white block">Room {a.roomNumber}</span>
                        <span className="font-mono text-rose-400 text-[11px] font-bold">{a.bedCode}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">{a.allocationDate}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-emerald-400">
                        ₹{a.monthlyFee.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={a.status === 'ACTIVE' ? 'emerald' : 'slate'}>{a.status}</Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {a.status === 'ACTIVE' && (
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<LogOut className="w-3.5 h-3.5" />}
                            onClick={() => handleCheckOut(a.id, a.bedCode, a.studentName)}
                            className="text-xs py-1"
                          >
                            Check-Out
                          </Button>
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
      {/* TAB 3: NIGHT ATTENDANCE */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white">Night Curfew Roll-Call Attendance</h3>
              <p className="text-xs text-slate-400">
                Evening residential attendance verification conducted by wardens (10:00 PM Curfew).
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => showToast('Hostel night roll-call saved.')}
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              Save Roll-Call
            </Button>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Room</th>
                    <th className="py-3 px-4 text-center">Curfew Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {attendance.map((att) => (
                    <tr key={att.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-400">{att.date}</td>
                      <td className="py-3 px-4 font-bold text-white">{att.studentName}</td>
                      <td className="py-3 px-4 text-slate-300">Room {att.roomNumber}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={att.status === 'PRESENT' ? 'emerald' : 'rose'}>
                          {att.status}
                        </Badge>
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
      {/* TAB 4: GATE PASSES */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'passes' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white">Gate Passes & Student Outpasses</h3>
              <p className="text-xs text-slate-400">
                Authorized campus exits, parent permissions, and expected return times.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsPassModalOpen(true)}
              className="bg-rose-600 hover:bg-rose-500"
            >
              Issue Gate Pass
            </Button>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Pass Type</th>
                    <th className="py-3 px-4">Departure Time</th>
                    <th className="py-3 px-4">Expected Return</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {passes.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold text-white block">{p.studentName}</span>
                        <span className="text-[11px] text-slate-400">Room {p.roomNumber}</span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="purple">{p.passType.replace('_', ' ')}</Badge>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">{p.departureTime}</td>
                      <td className="py-3 px-4 font-mono text-amber-400 font-bold">{p.expectedReturn}</td>
                      <td className="py-3 px-4 text-slate-300 max-w-xs truncate">{p.reason}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={p.status === 'APPROVED' ? 'emerald' : 'amber'}>
                          {p.status}
                        </Badge>
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
      {/* TAB 5: COMPLAINTS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'complaints' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white">Hostel Maintenance & Repair Tickets</h3>
              <p className="text-xs text-slate-400">
                Electrical, plumbing, and furniture complaints logged by student residents.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Wrench className="w-3.5 h-3.5" />}
              onClick={() => setIsComplaintModalOpen(true)}
            >
              Log Ticket
            </Button>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Student & Room</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4 text-center">Priority</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {complaints.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold text-white block">{c.studentName}</span>
                        <span className="text-[11px] text-slate-400">Room {c.roomNumber}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{c.category}</td>
                      <td className="py-3 px-4 text-slate-200">{c.description}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={c.priority === 'HIGH' ? 'rose' : 'amber'}>{c.priority}</Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={c.status === 'RESOLVED' ? 'emerald' : 'blue'}>
                          {c.status}
                        </Badge>
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
      {/* MODAL: ALLOCATE BED */}
      {/* ------------------------------------------------------------- */}
      <Modal isOpen={isAllocateModalOpen} onClose={() => setIsAllocateModalOpen(false)} title="Allocate Bed to Student">
        <form onSubmit={handleAllocateBed} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Select Student</label>
            <select
              value={allocateForm.studentId}
              onChange={(e) => setAllocateForm({ ...allocateForm, studentId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName} ({s.gender}) - {s.admissionNo}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Hostel Residence Facility</label>
            <select
              value={allocateForm.hostelId}
              onChange={(e) => setAllocateForm({ ...allocateForm, hostelId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
            >
              {hostels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.genderPolicy} only)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Select Vacant Bed</label>
            <select
              value={allocateForm.bedId}
              onChange={(e) => setAllocateForm({ ...allocateForm, bedId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
            >
              {beds
                .filter((b) => b.status === 'VACANT' && b.hostelId === allocateForm.hostelId)
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bedCode} (Room {b.roomNumber})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Security Deposit (₹)</label>
            <input
              type="number"
              required
              value={allocateForm.securityDeposit}
              onChange={(e) => setAllocateForm({ ...allocateForm, securityDeposit: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsAllocateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" className="bg-rose-600 hover:bg-rose-500">
              Confirm Bed Allocation
            </Button>
          </div>
        </form>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADD ROOM */}
      {/* ------------------------------------------------------------- */}
      <Modal isOpen={isAddRoomModalOpen} onClose={() => setIsAddRoomModalOpen(false)} title="Register Hostel Room">
        <form onSubmit={handleCreateRoom} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Hostel</label>
              <select
                value={roomForm.hostelId}
                onChange={(e) => setRoomForm({ ...roomForm, hostelId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              >
                {hostels.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Room Number</label>
              <input
                type="text"
                required
                value={roomForm.roomNumber}
                onChange={(e) => setRoomForm({ ...roomForm, roomNumber: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Block</label>
              <input
                type="text"
                required
                value={roomForm.block}
                onChange={(e) => setRoomForm({ ...roomForm, block: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Floor</label>
              <input
                type="number"
                required
                min={0}
                value={roomForm.floor}
                onChange={(e) => setRoomForm({ ...roomForm, floor: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Bed Capacity</label>
              <input
                type="number"
                required
                min={1}
                value={roomForm.capacity}
                onChange={(e) => setRoomForm({ ...roomForm, capacity: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Monthly Rent (₹)</label>
              <input
                type="number"
                required
                value={roomForm.monthlyRent}
                onChange={(e) => setRoomForm({ ...roomForm, monthlyRent: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              />
            </div>
            <div className="flex items-center gap-4 pt-6">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={roomForm.isAirConditioned}
                  onChange={(e) => setRoomForm({ ...roomForm, isAirConditioned: e.target.checked })}
                  className="rounded border-slate-800 text-rose-500"
                />
                AC Room
              </label>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsAddRoomModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" className="bg-rose-600 hover:bg-rose-500">
              Save Room & Create Beds
            </Button>
          </div>
        </form>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ISSUE GATE PASS */}
      {/* ------------------------------------------------------------- */}
      <Modal isOpen={isPassModalOpen} onClose={() => setIsPassModalOpen(false)} title="Issue Student Gate Pass">
        <form onSubmit={handleCreateGatePass} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Select Student</label>
            <select
              value={passForm.studentId}
              onChange={(e) => setPassForm({ ...passForm, studentId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName} ({s.admissionNo})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Departure Time</label>
              <input
                type="text"
                required
                value={passForm.departureTime}
                onChange={(e) => setPassForm({ ...passForm, departureTime: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Expected Return</label>
              <input
                type="text"
                required
                value={passForm.expectedReturn}
                onChange={(e) => setPassForm({ ...passForm, expectedReturn: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Purpose / Reason</label>
            <textarea
              required
              rows={2}
              value={passForm.reason}
              onChange={(e) => setPassForm({ ...passForm, reason: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsPassModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" className="bg-rose-600 hover:bg-rose-500">
              Issue Gate Pass
            </Button>
          </div>
        </form>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: LOG COMPLAINT */}
      {/* ------------------------------------------------------------- */}
      <Modal isOpen={isComplaintModalOpen} onClose={() => setIsComplaintModalOpen(false)} title="Log Room Maintenance Ticket">
        <form onSubmit={handleCreateComplaint} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Select Student</label>
            <select
              value={complaintForm.studentId}
              onChange={(e) => setComplaintForm({ ...complaintForm, studentId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName} ({s.admissionNo})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Category</label>
              <select
                value={complaintForm.category}
                onChange={(e: any) => setComplaintForm({ ...complaintForm, category: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              >
                <option value="ELECTRICAL">Electrical Issue</option>
                <option value="PLUMBING">Plumbing / Washroom</option>
                <option value="FURNITURE">Bed / Study Desk Furniture</option>
                <option value="CLEANLINESS">Housekeeping & Cleanliness</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Priority</label>
              <select
                value={complaintForm.priority}
                onChange={(e: any) => setComplaintForm({ ...complaintForm, priority: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High Priority</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Problem Description</label>
            <textarea
              required
              rows={2}
              value={complaintForm.description}
              onChange={(e) => setComplaintForm({ ...complaintForm, description: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsComplaintModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Submit Ticket
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
