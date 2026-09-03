import React, { useState, useMemo } from 'react';
import {
  Bus,
  MapPin,
  Users,
  Calendar,
  Fuel,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Phone,
  ShieldCheck,
  Clock,
  Navigation,
  FileText,
  DollarSign,
  X,
  Printer,
  ChevronRight,
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storageService';
import {
  TransportVehicle,
  TransportDriver,
  TransportRoute,
  StudentTransportEnrollment,
  TransportTrip,
  FuelLog,
  VehicleType,
} from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Tabs } from '../../components/ui/Tabs';

export const TransportModule: React.FC = () => {
  const { currentTenant, isSchool, isCoaching } = useTenant();
  const { currentUser } = useAuth();

  // Primary State
  const [vehicles, setVehicles] = useState<TransportVehicle[]>(() =>
    storage.getVehicles(currentTenant.id)
  );
  const [drivers, setDrivers] = useState<TransportDriver[]>(() =>
    storage.getDrivers(currentTenant.id)
  );
  const [routes, setRoutes] = useState<TransportRoute[]>(() =>
    storage.getRoutes(currentTenant.id)
  );
  const [enrollments, setEnrollments] = useState<StudentTransportEnrollment[]>(() =>
    storage.getTransportEnrollments(currentTenant.id)
  );
  const [trips, setTrips] = useState<TransportTrip[]>(() =>
    storage.getTransportTrips(currentTenant.id)
  );
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>(() =>
    storage.getFuelLogs(currentTenant.id)
  );

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    'vehicles' | 'drivers' | 'routes' | 'enrollments' | 'trips'
  >('vehicles');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Modals
  const [isAddVehicleModalOpen, setIsAddVehicleModalOpen] = useState(false);
  const [isAddDriverModalOpen, setIsAddDriverModalOpen] = useState(false);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isAddFuelModalOpen, setIsAddFuelModalOpen] = useState(false);

  // Aux data
  const students = storage.getStudents(currentTenant.id);

  // Forms
  const [enrollForm, setEnrollForm] = useState({
    studentId: students[0]?.id || '',
    routeId: routes[0]?.id || '',
    stopId: routes[0]?.stops[0]?.id || '',
  });

  const [vehicleForm, setVehicleForm] = useState({
    vehicleCode: `BUS-${Math.floor(10 + Math.random() * 90)}`,
    registrationNumber: `DL-1VB-${Math.floor(1000 + Math.random() * 9000)}`,
    vehicleType: 'SCHOOL_BUS' as VehicleType,
    capacity: 40,
    ownership: 'OWNED' as const,
    assignedDriverName: drivers[0]?.name || 'Balwant Singh',
    insuranceExpiry: '2027-06-30',
    fitnessExpiry: '2027-03-15',
    pucExpiry: '2026-12-31',
  });

  const [driverForm, setDriverForm] = useState({
    name: '',
    phone: '+91 98110 00000',
    licenseNumber: `DL-04201800${Math.floor(1000 + Math.random() * 9000)}`,
    licenseExpiry: '2029-12-31',
    assignedVehicleCode: vehicles[0]?.vehicleCode || 'BUS-01',
    policeVerified: true,
  });

  const [fuelForm, setFuelForm] = useState({
    vehicleId: vehicles[0]?.id || '',
    odometerReading: 54000,
    quantityLitres: 50,
    ratePerLitre: 89.5,
    fuelStation: 'Indian Oil Corporation - Campus Depot',
    invoiceRef: `IOC-${Date.now().toString().slice(-4)}`,
  });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // KPIs
  const totalFleetCapacity = useMemo(
    () => vehicles.reduce((acc, v) => acc + v.capacity, 0),
    [vehicles]
  );
  const totalAllocated = useMemo(
    () => enrollments.filter((e) => e.status === 'ACTIVE').length,
    [enrollments]
  );
  const totalFuelCost = useMemo(
    () => fuelLogs.reduce((acc, f) => acc + f.totalCost, 0),
    [fuelLogs]
  );

  // 1. Enroll Student (Strict Capacity Check, Document 58 Section 7 & 27)
  const handleEnrollStudent = (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find((s) => s.id === enrollForm.studentId);
    const route = routes.find((r) => r.id === enrollForm.routeId);
    if (!student || !route) return;

    const vehicle = vehicles.find((v) => v.id === route.vehicleId) || vehicles[0];
    const currentAllocations = enrollments.filter(
      (e) => e.vehicleId === vehicle.id && e.status === 'ACTIVE'
    ).length;

    if (currentAllocations >= vehicle.capacity) {
      alert(
        `CAPACITY EXCEEDED! Vehicle ${vehicle.vehicleCode} has reached its configured limit (${vehicle.capacity} seats). Overbooking is blocked by safety policy.`
      );
      return;
    }

    const stop = route.stops.find((s) => s.id === enrollForm.stopId) || route.stops[0];

    const studentFullName = `${student.firstName} ${student.lastName}`;

    const enrollment: StudentTransportEnrollment = {
      id: `te-${Date.now()}`,
      tenantId: currentTenant.id,
      studentId: student.id,
      studentName: studentFullName,
      admissionNo: student.admissionNo,
      classOrBatch: student.classId || 'Class 10',
      routeId: route.id,
      routeName: route.name,
      stopId: stop.id,
      stopName: stop.stopName,
      vehicleId: vehicle.id,
      vehicleCode: vehicle.vehicleCode,
      monthlyFee: stop.fareAmount,
      status: 'ACTIVE',
    };

    storage.saveTransportEnrollment(enrollment);
    setEnrollments(storage.getTransportEnrollments(currentTenant.id));
    setVehicles(storage.getVehicles(currentTenant.id));
    setIsEnrollModalOpen(false);

    storage.saveAuditLog({
      id: `audit_${Date.now()}`,
      tenantId: currentTenant.id,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'TRANSPORT_ENROLLMENT',
      category: 'TRANSPORT',
      entityType: 'TRANSPORT_ENROLLMENT',
      entityId: enrollment.id,
      details: `Enrolled student ${studentFullName} (${student.admissionNo}) on Route ${route.routeCode} (Stop: ${stop.stopName}, Bus: ${vehicle.vehicleCode}).`,
      timestamp: new Date().toISOString(),
      status: 'SUCCESS',
    });

    showToast(`Student ${studentFullName} allocated to ${vehicle.vehicleCode} (${stop.stopName}).`);
  };

  // 2. Add Vehicle
  const handleCreateVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    const newVehicle: TransportVehicle = {
      id: `veh-${Date.now()}`,
      tenantId: currentTenant.id,
      vehicleCode: vehicleForm.vehicleCode,
      registrationNumber: vehicleForm.registrationNumber,
      vehicleType: vehicleForm.vehicleType,
      capacity: Number(vehicleForm.capacity),
      allocatedStudents: 0,
      ownership: vehicleForm.ownership,
      status: 'ACTIVE',
      assignedDriverName: vehicleForm.assignedDriverName,
      insuranceExpiry: vehicleForm.insuranceExpiry,
      fitnessExpiry: vehicleForm.fitnessExpiry,
      pucExpiry: vehicleForm.pucExpiry,
      gpsDeviceId: `GPS-TRK-${Math.floor(1000 + Math.random() * 9000)}`,
    };

    storage.saveVehicle(newVehicle);
    setVehicles(storage.getVehicles(currentTenant.id));
    setIsAddVehicleModalOpen(false);
    showToast(`Vehicle ${newVehicle.vehicleCode} added to fleet register.`);
  };

  // 3. Add Driver
  const handleCreateDriver = (e: React.FormEvent) => {
    e.preventDefault();
    const newDriver: TransportDriver = {
      id: `drv-${Date.now()}`,
      tenantId: currentTenant.id,
      name: driverForm.name,
      phone: driverForm.phone,
      licenseNumber: driverForm.licenseNumber,
      licenseExpiry: driverForm.licenseExpiry,
      assignedVehicleCode: driverForm.assignedVehicleCode,
      policeVerified: driverForm.policeVerified,
      status: 'ACTIVE',
    };

    storage.saveDriver(newDriver);
    setDrivers(storage.getDrivers(currentTenant.id));
    setIsAddDriverModalOpen(false);
    showToast(`Driver profile created for ${newDriver.name}.`);
  };

  // 4. Record Fuel Log
  const handleRecordFuel = (e: React.FormEvent) => {
    e.preventDefault();
    const veh = vehicles.find((v) => v.id === fuelForm.vehicleId) || vehicles[0];
    const qty = Number(fuelForm.quantityLitres);
    const rate = Number(fuelForm.ratePerLitre);

    const log: FuelLog = {
      id: `fuel-${Date.now()}`,
      tenantId: currentTenant.id,
      vehicleId: veh.id,
      vehicleCode: veh.vehicleCode,
      date: new Date().toISOString().split('T')[0],
      odometerReading: Number(fuelForm.odometerReading),
      quantityLitres: qty,
      ratePerLitre: rate,
      totalCost: qty * rate,
      fuelStation: fuelForm.fuelStation,
      invoiceRef: fuelForm.invoiceRef,
    };

    storage.recordFuelLog(log);
    setFuelLogs(storage.getFuelLogs(currentTenant.id));
    setIsAddFuelModalOpen(false);
    showToast(`Fuel refill of ${qty}L recorded for ${veh.vehicleCode}.`);
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
        <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-blue-600/20 border border-indigo-500/30 text-indigo-400 shadow-md shadow-indigo-500/10">
                <Bus className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  Transport & Fleet Management
                  <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                    Doc 58 Canonical
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Institutional vehicle fleet, driver licenses, route stops, passenger seating capacity limits, and trip logs.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Fuel className="w-4 h-4" />}
              onClick={() => setIsAddFuelModalOpen(true)}
            >
              Log Fuel Entry
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsEnrollModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-950/20"
            >
              Allocate Student to Route
            </Button>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="mt-6 pt-4 border-t border-slate-800/80">
          <Tabs
            activeTab={activeTab}
            onChange={(tab: any) => setActiveTab(tab)}
            tabs={[
              { id: 'vehicles', label: 'Fleet Vehicles & Compliance', count: vehicles.length },
              { id: 'drivers', label: 'Drivers & Attendants', count: drivers.length },
              { id: 'routes', label: 'Routes & Stop Networks', count: routes.length },
              { id: 'enrollments', label: 'Student Passenger Roster', count: enrollments.length },
              { id: 'trips', label: 'Daily Trips & Fuel Desk', count: trips.length },
            ]}
          />
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Fleet Size</span>
          <h3 className="text-2xl font-black text-white font-mono">{vehicles.length} Vehicles</h3>
          <p className="text-[11px] text-slate-400">{totalFleetCapacity} total passenger seats</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider block">Enrolled Students</span>
          <h3 className="text-2xl font-black text-indigo-400 font-mono">{totalAllocated} Allocated</h3>
          <p className="text-[11px] text-slate-400">
            Occupancy rate: {Math.round((totalAllocated / (totalFleetCapacity || 1)) * 100)}%
          </p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block">Commercial Drivers</span>
          <h3 className="text-2xl font-black text-emerald-400 font-mono">{drivers.length} Verified</h3>
          <p className="text-[11px] text-slate-400">100% Police verification compliant</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider block">Fuel Consumption</span>
          <h3 className="text-2xl font-black text-amber-400 font-mono">₹{totalFuelCost.toLocaleString('en-IN')}</h3>
          <p className="text-[11px] text-slate-400">{fuelLogs.length} Refill entries recorded</p>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: FLEET VEHICLES & COMPLIANCE */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'vehicles' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white">Institutional Fleet Register & Compliance Dates</h3>
              <p className="text-xs text-slate-400">
                Seating capacity enforcement, GPS tracking devices, and regulatory vehicle fitness certifications.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsAddVehicleModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500"
            >
              Add Vehicle
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {vehicles.map((v) => {
              const occupancyPct = Math.min(100, Math.round((v.allocatedStudents / v.capacity) * 100));

              return (
                <div key={v.id} className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-white text-base">{v.vehicleCode}</h4>
                      <p className="font-mono text-xs text-indigo-400 font-bold">{v.registrationNumber}</p>
                    </div>
                    <Badge variant="purple">{v.vehicleType.replace('_', ' ')}</Badge>
                  </div>

                  {/* Seating Occupancy Bar */}
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>Seating Capacity:</span>
                      <span className="font-mono font-bold text-white">
                        {v.allocatedStudents} / {v.capacity} Seats ({occupancyPct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          occupancyPct >= 100
                            ? 'bg-rose-500'
                            : occupancyPct > 80
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${occupancyPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Compliance & Driver Info */}
                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1 text-[11px] text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Assigned Driver:</span>
                      <span className="font-bold text-white">{v.assignedDriverName || 'Unassigned'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Fitness Expiry:</span>
                      <span className="font-mono text-slate-200">{v.fitnessExpiry}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Insurance Expiry:</span>
                      <span className="font-mono text-slate-200">{v.insuranceExpiry}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
                    <span className="text-[11px] text-slate-400 uppercase font-mono">{v.ownership}</span>
                    <Badge variant={v.status === 'ACTIVE' ? 'emerald' : 'amber'}>{v.status}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: DRIVERS & ATTENDANTS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'drivers' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white">Commercial Drivers & Safety Compliance</h3>
              <p className="text-xs text-slate-400">
                Heavy transport driver licenses, background police verification, and mobile contact lines.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsAddDriverModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500"
            >
              Add Driver
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {drivers.map((d) => (
              <div key={d.id} className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-white text-base">{d.name}</h4>
                      <p className="text-xs text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-indigo-400" />
                        {d.phone}
                      </p>
                    </div>
                    {d.policeVerified && (
                      <Badge variant="emerald">POLICE VERIFIED</Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">Commercial License:</span>
                      <span className="font-mono text-white font-bold">{d.licenseNumber}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">License Expiry:</span>
                      <span className="font-mono text-slate-200">{d.licenseExpiry}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
                  <span className="text-slate-400">
                    Assigned Vehicle: <span className="font-mono font-bold text-indigo-400">{d.assignedVehicleCode || 'Unassigned'}</span>
                  </span>
                  <Badge variant={d.status === 'ACTIVE' ? 'blue' : 'amber'}>{d.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: ROUTES & STOP NETWORKS */}
      {activeTab === 'routes' && (
        <div className="space-y-6">
          <div className="space-y-4">
            {routes.map((rt) => (
              <div key={rt.id} className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[11px] font-mono text-indigo-400 font-bold">{rt.routeCode}</span>
                    <h4 className="font-bold text-white text-base">{rt.name}</h4>
                    <p className="text-xs text-slate-400">
                      {rt.startPoint} ➔ {rt.endPoint} ({rt.totalDistanceKm} km)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="purple">{rt.vehicleCode}</Badge>
                    <Badge variant="blue">Driver: {rt.driverName}</Badge>
                  </div>
                </div>

                {/* Stops Sequence */}
                <div>
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                    Scheduled Stops & Timetable
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    {rt.stops.map((stop) => (
                      <div key={stop.id} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-white">
                          <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span className="truncate">{stop.stopName}</span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Pickup: <span className="font-mono text-emerald-400 font-bold">{stop.pickupTime}</span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Drop: <span className="font-mono text-amber-400 font-bold">{stop.dropTime}</span>
                        </div>
                        <div className="pt-1 border-t border-slate-900 text-right font-mono text-slate-300 font-semibold">
                          ₹{stop.fareAmount}/mo
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: STUDENT PASSENGER ROSTER */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'enrollments' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white">Student Passenger Roster & Stop Allocations</h3>
              <p className="text-xs text-slate-400">
                Official student bus allocations with boarding stops and monthly transport fees.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsEnrollModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500"
            >
              Allocate Student
            </Button>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Student & Admission</th>
                    <th className="py-3 px-4">Route Name</th>
                    <th className="py-3 px-4">Designated Stop</th>
                    <th className="py-3 px-4 text-center">Bus Code</th>
                    <th className="py-3 px-4 text-center">Monthly Fee</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {enrollments.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold text-white block">{e.studentName}</span>
                        <span className="font-mono text-slate-400 text-[11px]">{e.admissionNo}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-medium">{e.routeName}</td>
                      <td className="py-3 px-4 text-indigo-300 font-semibold">{e.stopName}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-white">{e.vehicleCode}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-emerald-400">
                        ₹{e.monthlyFee.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={e.status === 'ACTIVE' ? 'emerald' : 'rose'}>{e.status}</Badge>
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
      {/* TAB 5: DAILY TRIPS & FUEL LOGS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'trips' && (
        <div className="space-y-6">
          {/* Daily Trips */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white">Daily Boarding & Trip Execution Logs</h3>
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Trip Date</th>
                      <th className="py-3 px-4">Route</th>
                      <th className="py-3 px-4 text-center">Vehicle</th>
                      <th className="py-3 px-4">Driver</th>
                      <th className="py-3 px-4 text-center">Trip Type</th>
                      <th className="py-3 px-4 text-center">Boarded / Expected</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {trips.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-400">{t.tripDate}</td>
                        <td className="py-3 px-4 font-semibold text-white">{t.routeName}</td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-indigo-400">{t.vehicleCode}</td>
                        <td className="py-3 px-4 text-slate-300">{t.driverName}</td>
                        <td className="py-3 px-4 text-center font-mono text-slate-300">
                          {t.tripType.replace('_', ' ')}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-emerald-400">
                          {t.boardedCount} / {t.totalExpected} Students
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={t.status === 'COMPLETED' ? 'emerald' : 'blue'}>
                            {t.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Fuel Log Ledger */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-white">Fleet Fuel & Refueling Register</h3>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Fuel className="w-3.5 h-3.5" />}
                onClick={() => setIsAddFuelModalOpen(true)}
              >
                Record Fuel Refill
              </Button>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-center">Vehicle</th>
                      <th className="py-3 px-4 text-center">Odometer (km)</th>
                      <th className="py-3 px-4 text-center">Quantity (L)</th>
                      <th className="py-3 px-4 text-center">Rate (₹/L)</th>
                      <th className="py-3 px-4 text-center">Total Cost</th>
                      <th className="py-3 px-4">Fuel Station & Bill Ref</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {fuelLogs.map((f) => (
                      <tr key={f.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-400">{f.date}</td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-indigo-400">{f.vehicleCode}</td>
                        <td className="py-3 px-4 text-center font-mono font-semibold text-white">
                          {f.odometerReading.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-white">{f.quantityLitres} L</td>
                        <td className="py-3 px-4 text-center font-mono text-slate-300">₹{f.ratePerLitre}</td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-rose-400">
                          ₹{f.totalCost.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-white block">{f.fuelStation}</span>
                          <span className="font-mono text-slate-400 text-[11px]">{f.invoiceRef}</span>
                        </td>
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
      {/* MODAL: ALLOCATE STUDENT TO ROUTE */}
      {/* ------------------------------------------------------------- */}
      <Modal isOpen={isEnrollModalOpen} onClose={() => setIsEnrollModalOpen(false)} title="Allocate Student to Transport Route">
        <form onSubmit={handleEnrollStudent} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Select Student</label>
            <select
              value={enrollForm.studentId}
              onChange={(e) => setEnrollForm({ ...enrollForm, studentId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName} ({s.admissionNo}) - {s.classId || 'Class 10'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Select Transport Route</label>
            <select
              value={enrollForm.routeId}
              onChange={(e) => {
                const rt = routes.find((r) => r.id === e.target.value);
                setEnrollForm({
                  ...enrollForm,
                  routeId: e.target.value,
                  stopId: rt?.stops[0]?.id || '',
                });
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
            >
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.routeCode} - {r.name} ({r.vehicleCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Designated Boarding Stop</label>
            <select
              value={enrollForm.stopId}
              onChange={(e) => setEnrollForm({ ...enrollForm, stopId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
            >
              {routes
                .find((r) => r.id === enrollForm.routeId)
                ?.stops.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.stopName} (Pickup: {st.pickupTime} - Fare: ₹{st.fareAmount}/mo)
                  </option>
                ))}
            </select>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsEnrollModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" className="bg-indigo-600 hover:bg-indigo-500">
              Confirm Route Allocation
            </Button>
          </div>
        </form>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADD VEHICLE */}
      {/* ------------------------------------------------------------- */}
      <Modal isOpen={isAddVehicleModalOpen} onClose={() => setIsAddVehicleModalOpen(false)} title="Register Fleet Vehicle">
        <form onSubmit={handleCreateVehicle} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Vehicle Code</label>
              <input
                type="text"
                required
                value={vehicleForm.vehicleCode}
                onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleCode: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Registration Number</label>
              <input
                type="text"
                required
                value={vehicleForm.registrationNumber}
                onChange={(e) => setVehicleForm({ ...vehicleForm, registrationNumber: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Vehicle Type</label>
              <select
                value={vehicleForm.vehicleType}
                onChange={(e: any) => setVehicleForm({ ...vehicleForm, vehicleType: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              >
                <option value="SCHOOL_BUS">School Bus (Heavy Transport)</option>
                <option value="MINI_BUS">Mini Bus (Medium Transport)</option>
                <option value="VAN">Van / Winger</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Seating Capacity</label>
              <input
                type="number"
                required
                min={5}
                value={vehicleForm.capacity}
                onChange={(e) => setVehicleForm({ ...vehicleForm, capacity: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsAddVehicleModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" className="bg-indigo-600 hover:bg-indigo-500">
              Save Vehicle
            </Button>
          </div>
        </form>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADD DRIVER */}
      {/* ------------------------------------------------------------- */}
      <Modal isOpen={isAddDriverModalOpen} onClose={() => setIsAddDriverModalOpen(false)} title="Register Fleet Driver">
        <form onSubmit={handleCreateDriver} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Driver Full Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Kumar"
                value={driverForm.name}
                onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Phone Number</label>
              <input
                type="text"
                required
                value={driverForm.phone}
                onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Commercial License Number</label>
              <input
                type="text"
                required
                value={driverForm.licenseNumber}
                onChange={(e) => setDriverForm({ ...driverForm, licenseNumber: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Assigned Vehicle</label>
              <select
                value={driverForm.assignedVehicleCode}
                onChange={(e) => setDriverForm({ ...driverForm, assignedVehicleCode: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.vehicleCode}>
                    {v.vehicleCode} ({v.registrationNumber})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsAddDriverModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" className="bg-indigo-600 hover:bg-indigo-500">
              Register Driver
            </Button>
          </div>
        </form>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: RECORD FUEL LOG */}
      {/* ------------------------------------------------------------- */}
      <Modal isOpen={isAddFuelModalOpen} onClose={() => setIsAddFuelModalOpen(false)} title="Log Vehicle Fuel Refill Entry">
        <form onSubmit={handleRecordFuel} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Select Fleet Vehicle</label>
            <select
              value={fuelForm.vehicleId}
              onChange={(e) => setFuelForm({ ...fuelForm, vehicleId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.vehicleCode} - {v.registrationNumber} ({v.vehicleType})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Odometer (km)</label>
              <input
                type="number"
                required
                value={fuelForm.odometerReading}
                onChange={(e) => setFuelForm({ ...fuelForm, odometerReading: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Quantity (L)</label>
              <input
                type="number"
                required
                value={fuelForm.quantityLitres}
                onChange={(e) => setFuelForm({ ...fuelForm, quantityLitres: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Rate (₹/L)</label>
              <input
                type="number"
                step="0.1"
                required
                value={fuelForm.ratePerLitre}
                onChange={(e) => setFuelForm({ ...fuelForm, ratePerLitre: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Fuel Station</label>
              <input
                type="text"
                required
                value={fuelForm.fuelStation}
                onChange={(e) => setFuelForm({ ...fuelForm, fuelStation: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Bill / Invoice Reference</label>
              <input
                type="text"
                required
                value={fuelForm.invoiceRef}
                onChange={(e) => setFuelForm({ ...fuelForm, invoiceRef: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsAddFuelModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" className="bg-indigo-600 hover:bg-indigo-500">
              Save Refill Log
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
