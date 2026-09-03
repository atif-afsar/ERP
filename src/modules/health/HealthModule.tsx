import React, { useState, useMemo } from 'react';
import {
  HeartPulse,
  Activity,
  AlertTriangle,
  Stethoscope,
  ShieldAlert,
  Thermometer,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  User,
  Building,
  Phone,
  Calendar,
  FileText,
  X,
  Printer,
  Sparkles,
  ShieldCheck,
  Eye,
  Smile,
  Syringe,
  Ambulance,
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storageService';
import {
  ClinicFacility,
  StudentHealthProfile,
  StudentAllergy,
  MedicalVisit,
  HealthScreening,
  VaccinationRecord,
  BloodGroup,
  VisitStatus,
  AllergySeverity,
} from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Tabs } from '../../components/ui/Tabs';

export const HealthModule: React.FC = () => {
  const { currentTenant } = useTenant();
  const { currentUser } = useAuth();

  // Primary State
  const [clinics, setClinics] = useState<ClinicFacility[]>(() =>
    storage.getClinics(currentTenant.id)
  );
  const [profiles, setProfiles] = useState<StudentHealthProfile[]>(() =>
    storage.getHealthProfiles(currentTenant.id)
  );
  const [allergies, setAllergies] = useState<StudentAllergy[]>(() =>
    storage.getStudentAllergies()
  );
  const [visits, setVisits] = useState<MedicalVisit[]>(() =>
    storage.getMedicalVisits(currentTenant.id)
  );
  const [screenings, setScreenings] = useState<HealthScreening[]>(() =>
    storage.getHealthScreenings(currentTenant.id)
  );
  const [vaccinations, setVaccinations] = useState<VaccinationRecord[]>(() =>
    storage.getVaccinationRecords()
  );

  // Aux data
  const students = storage.getStudents(currentTenant.id);

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    'visits' | 'profiles' | 'screenings' | 'vaccinations' | 'emergency'
  >('visits');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Modals
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAllergyModalOpen, setIsAllergyModalOpen] = useState(false);
  const [isVaccineModalOpen, setIsVaccineModalOpen] = useState(false);
  const [isScreeningModalOpen, setIsScreeningModalOpen] = useState(false);

  // Forms
  const [visitForm, setVisitForm] = useState({
    studentId: students[0]?.id || '',
    clinicId: clinics[0]?.id || '',
    chiefComplaint: '',
    symptoms: '',
    vitalTempF: 98.6,
    vitalPulse: 72,
    vitalBp: '120/80',
    diagnosis: '',
    treatmentGiven: '',
    medicationGiven: '',
    status: 'COMPLETED' as VisitStatus,
    parentNotified: false,
  });

  const [profileForm, setProfileForm] = useState({
    studentId: students[0]?.id || '',
    bloodGroup: 'B+' as BloodGroup,
    heightCm: 165,
    weightKg: 55,
    chronicConditions: 'None',
    dietaryRestrictions: 'None',
    emergencyContactName: 'Parent Guardian',
    emergencyContactPhone: '+91 98100 11223',
    emergencyContactRelation: 'Father',
    preferredHospital: 'Apollo Hospital',
  });

  const [allergyForm, setAllergyForm] = useState({
    studentId: students[0]?.id || '',
    substance: '',
    category: 'FOOD' as const,
    severity: 'SEVERE' as AllergySeverity,
    reaction: '',
  });

  const [vaccineForm, setVaccineForm] = useState({
    studentId: students[0]?.id || '',
    vaccineName: 'Tetanus Toxoid Booster',
    doseNumber: 1,
    dateAdministered: new Date().toISOString().split('T')[0],
    administeredBy: 'School Medical Clinic',
    certificateRef: 'VAC-SCH-2026-001',
  });

  const [screeningForm, setScreeningForm] = useState({
    studentId: students[0]?.id || '',
    screeningType: 'ANNUAL_CHECKUP' as const,
    visionRight: '6/6',
    visionLeft: '6/6',
    dentalHealth: 'HEALTHY' as const,
    generalFitness: 'EXCELLENT' as const,
    doctorNotes: 'Fit for all institutional academic and sports activities.',
    examinerName: 'Dr. Medical Officer, MBBS',
  });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // KPIs
  const totalVisitsCount = useMemo(() => visits.length, [visits]);
  const highRiskAllergiesCount = useMemo(
    () => allergies.filter((a) => a.severity === 'CRITICAL' || a.severity === 'SEVERE').length,
    [allergies]
  );
  const totalScreeningsCount = useMemo(() => screenings.length, [screenings]);
  const immunizationCount = useMemo(() => vaccinations.length, [vaccinations]);

  // Filtered Visits
  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      const matchSearch =
        v.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.chiefComplaint.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.diagnosis.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    });
  }, [visits, searchQuery]);

  // 1. Log Medical Visit
  const handleCreateVisit = (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find((s) => s.id === visitForm.studentId);
    if (!student) return;

    const studentFullName = `${student.firstName} ${student.lastName}`;

    const newVisit: MedicalVisit = {
      id: `mv-${Date.now()}`,
      tenantId: currentTenant.id,
      clinicId: visitForm.clinicId || clinics[0]?.id || 'clinic-1',
      studentId: student.id,
      studentName: studentFullName,
      admissionNo: student.admissionNo,
      visitDate: new Date().toISOString().split('T')[0],
      visitTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      chiefComplaint: visitForm.chiefComplaint,
      symptoms: visitForm.symptoms,
      vitalTempF: Number(visitForm.vitalTempF),
      vitalPulse: Number(visitForm.vitalPulse),
      vitalBp: visitForm.vitalBp,
      diagnosis: visitForm.diagnosis,
      treatmentGiven: visitForm.treatmentGiven,
      medicationGiven: visitForm.medicationGiven || undefined,
      status: visitForm.status,
      recordedBy: currentUser.name,
      parentNotified: visitForm.parentNotified,
    };

    storage.saveMedicalVisit(newVisit);
    setVisits(storage.getMedicalVisits(currentTenant.id));
    setIsVisitModalOpen(false);

    storage.saveAuditLog({
      id: `audit_${Date.now()}`,
      tenantId: currentTenant.id,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'MEDICAL_VISIT_LOGGED',
      category: 'HEALTH',
      entityType: 'MEDICAL_VISIT',
      entityId: newVisit.id,
      details: `Logged medical clinic visit for ${studentFullName} (${student.admissionNo}): ${newVisit.diagnosis}`,
      timestamp: new Date().toISOString(),
      status: 'SUCCESS',
    });

    showToast(`Medical visit recorded for ${studentFullName}.`);
  };

  // 2. Save Health Profile
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find((s) => s.id === profileForm.studentId);
    if (!student) return;

    const studentFullName = `${student.firstName} ${student.lastName}`;
    const h = Number(profileForm.heightCm) / 100;
    const w = Number(profileForm.weightKg);
    const calculatedBmi = Number((w / (h * h)).toFixed(1));

    const newProfile: StudentHealthProfile = {
      id: `hp-${Date.now()}`,
      tenantId: currentTenant.id,
      studentId: student.id,
      studentName: studentFullName,
      admissionNo: student.admissionNo,
      bloodGroup: profileForm.bloodGroup,
      heightCm: Number(profileForm.heightCm),
      weightKg: w,
      bmi: calculatedBmi,
      chronicConditions: profileForm.chronicConditions,
      dietaryRestrictions: profileForm.dietaryRestrictions,
      emergencyContactName: profileForm.emergencyContactName,
      emergencyContactPhone: profileForm.emergencyContactPhone,
      emergencyContactRelation: profileForm.emergencyContactRelation,
      preferredHospital: profileForm.preferredHospital,
      updatedAt: new Date().toISOString().split('T')[0],
    };

    storage.saveHealthProfile(newProfile);
    setProfiles(storage.getHealthProfiles(currentTenant.id));
    setIsProfileModalOpen(false);
    showToast(`Health profile updated for ${studentFullName}.`);
  };

  // 3. Add Allergy
  const handleAddAllergy = (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find((s) => s.id === allergyForm.studentId);
    if (!student) return;

    const newAllergy: StudentAllergy = {
      id: `al-${Date.now()}`,
      tenantId: currentTenant.id,
      studentId: student.id,
      substance: allergyForm.substance,
      category: allergyForm.category,
      severity: allergyForm.severity,
      reaction: allergyForm.reaction,
      status: 'ACTIVE',
    };

    storage.saveStudentAllergy(newAllergy);
    setAllergies(storage.getStudentAllergies());
    setIsAllergyModalOpen(false);
    showToast(`Allergy flag recorded: ${newAllergy.substance}.`);
  };

  // 4. Record Vaccination
  const handleRecordVaccine = (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find((s) => s.id === vaccineForm.studentId);
    if (!student) return;

    const studentFullName = `${student.firstName} ${student.lastName}`;

    const record: VaccinationRecord = {
      id: `vac-${Date.now()}`,
      tenantId: currentTenant.id,
      studentId: student.id,
      studentName: studentFullName,
      vaccineName: vaccineForm.vaccineName,
      doseNumber: Number(vaccineForm.doseNumber),
      dateAdministered: vaccineForm.dateAdministered,
      administeredBy: vaccineForm.administeredBy,
      certificateRef: vaccineForm.certificateRef,
      status: 'COMPLETED',
    };

    storage.saveVaccinationRecord(record);
    setVaccinations(storage.getVaccinationRecords());
    setIsVaccineModalOpen(false);
    showToast(`Vaccination record logged for ${studentFullName}.`);
  };

  // 5. Conduct Screening
  const handleCreateScreening = (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find((s) => s.id === screeningForm.studentId);
    if (!student) return;

    const studentFullName = `${student.firstName} ${student.lastName}`;

    const sc: HealthScreening = {
      id: `hs-${Date.now()}`,
      tenantId: currentTenant.id,
      studentId: student.id,
      studentName: studentFullName,
      date: new Date().toISOString().split('T')[0],
      screeningType: screeningForm.screeningType,
      visionRight: screeningForm.visionRight,
      visionLeft: screeningForm.visionLeft,
      dentalHealth: screeningForm.dentalHealth,
      generalFitness: screeningForm.generalFitness,
      doctorNotes: screeningForm.doctorNotes,
      examinerName: screeningForm.examinerName,
    };

    storage.saveHealthScreening(sc);
    setScreenings(storage.getHealthScreenings(currentTenant.id));
    setIsScreeningModalOpen(false);
    showToast(`Health screening report recorded for ${studentFullName}.`);
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
        <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-red-500/20 to-rose-600/20 border border-red-500/30 text-red-400 shadow-md shadow-red-500/10">
                <HeartPulse className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  Health & Medical Management
                  <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-300">
                    Doc 61 Canonical
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Campus infirmary clinic, student health profiles, vital signs, first aid treatment logs, and vaccination records.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Activity className="w-4 h-4" />}
              onClick={() => setIsScreeningModalOpen(true)}
            >
              Health Screening
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsVisitModalOpen(true)}
              className="bg-red-600 hover:bg-red-500 shadow-lg shadow-red-950/20"
            >
              Log Clinic Visit
            </Button>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="mt-6 pt-4 border-t border-slate-800/80">
          <Tabs
            activeTab={activeTab}
            onChange={(tab: any) => setActiveTab(tab)}
            tabs={[
              { id: 'visits', label: 'Clinic Visits & First Aid Desk', count: visits.length },
              { id: 'profiles', label: 'Student Health Profiles & Vitals', count: profiles.length },
              { id: 'screenings', label: 'Annual Health Screenings', count: screenings.length },
              { id: 'vaccinations', label: 'Immunization & Vaccines', count: vaccinations.length },
              { id: 'emergency', label: 'Emergency Referral Desk' },
            ]}
          />
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Clinic Visits</span>
          <h3 className="text-2xl font-black text-white font-mono">{totalVisitsCount} Recorded</h3>
          <p className="text-[11px] text-slate-400">School infirmary consultations</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-red-400 uppercase tracking-wider block">Critical Allergies</span>
          <h3 className="text-2xl font-black text-red-400 font-mono">{highRiskAllergiesCount} Alerts</h3>
          <p className="text-[11px] text-slate-400">Severe / Critical contraindications</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block">Annual Screenings</span>
          <h3 className="text-2xl font-black text-emerald-400 font-mono">{totalScreeningsCount} Conducted</h3>
          <p className="text-[11px] text-slate-400">Vision, dental & physical checks</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider block">Vaccine Records</span>
          <h3 className="text-2xl font-black text-blue-400 font-mono">{immunizationCount} Doses</h3>
          <p className="text-[11px] text-slate-400">Verified institutional records</p>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: CLINIC VISITS & FIRST AID DESK */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'visits' && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search visits by student name or complaint..."
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
              />
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsVisitModalOpen(true)}
              className="bg-red-600 hover:bg-red-500"
            >
              Record Clinic Visit
            </Button>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Chief Complaint & Symptoms</th>
                    <th className="py-3 px-4 text-center">Vitals (Temp / BP / Pulse)</th>
                    <th className="py-3 px-4">Diagnosis & Treatment</th>
                    <th className="py-3 px-4 text-center">Parent Notified</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredVisits.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono text-white block">{v.visitDate}</span>
                        <span className="text-[11px] text-slate-400">{v.visitTime}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-white block">{v.studentName}</span>
                        <span className="font-mono text-slate-400 text-[11px]">{v.admissionNo}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-red-300 block">{v.chiefComplaint}</span>
                        <span className="text-[11px] text-slate-400">{v.symptoms}</span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        <div className="text-[11px] text-slate-300">
                          <span className="text-amber-400">{v.vitalTempF}°F</span> • {v.vitalBp} • {v.vitalPulse} bpm
                        </div>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <span className="font-semibold text-white block">{v.diagnosis}</span>
                        <span className="text-[11px] text-slate-400">{v.treatmentGiven}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={v.parentNotified ? 'emerald' : 'slate'}>
                          {v.parentNotified ? 'NOTIFIED' : 'NO'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={v.status === 'COMPLETED' ? 'emerald' : 'rose'}>
                          {v.status}
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
      {/* TAB 2: STUDENT HEALTH PROFILES & VITALS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'profiles' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white">Student Health Profiles & Vitals</h3>
              <p className="text-xs text-slate-400">
                Blood groups, height/weight BMI tracking, and critical allergy registers.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<ShieldAlert className="w-3.5 h-3.5 text-red-400" />}
                onClick={() => setIsAllergyModalOpen(true)}
              >
                Add Allergy Flag
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => setIsProfileModalOpen(true)}
                className="bg-red-600 hover:bg-red-500"
              >
                Update Profile
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {profiles.map((p) => {
              const studentAllergies = allergies.filter((a) => a.studentId === p.studentId);

              return (
                <div key={p.id} className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 font-bold uppercase block">
                        {p.admissionNo} • Updated {p.updatedAt}
                      </span>
                      <h4 className="font-bold text-white text-lg">{p.studentName}</h4>
                      <p className="text-xs text-slate-400">
                        Height: {p.heightCm} cm • Weight: {p.weightKg} kg • BMI: {p.bmi}
                      </p>
                    </div>
                    <Badge variant="rose" size="md">
                      Blood: {p.bloodGroup}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Chronic Conditions</span>
                      <span className="font-semibold text-white">{p.chronicConditions || 'None reported'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Dietary Restrictions</span>
                      <span className="font-semibold text-white">{p.dietaryRestrictions || 'None'}</span>
                    </div>
                  </div>

                  {/* Allergies list */}
                  {studentAllergies.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block">
                        Medical Allergies & Contraindications
                      </span>
                      {studentAllergies.map((al) => (
                        <div
                          key={al.id}
                          className="p-2 rounded-xl bg-red-950/20 border border-red-900/40 text-xs flex justify-between items-center"
                        >
                          <div>
                            <span className="font-bold text-red-300 block">{al.substance}</span>
                            <span className="text-[11px] text-slate-400">{al.reaction}</span>
                          </div>
                          <Badge variant="rose">{al.severity}</Badge>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-800/80 flex justify-between items-center text-xs text-slate-400">
                    <div>
                      <span className="text-[10px] block uppercase text-slate-500">Emergency Contact</span>
                      <span className="font-medium text-white">{p.emergencyContactName} ({p.emergencyContactPhone})</span>
                    </div>
                    <span className="font-mono text-[11px] text-slate-400">{p.preferredHospital}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: ANNUAL HEALTH SCREENINGS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'screenings' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white">Annual Health & Fitness Screenings</h3>
              <p className="text-xs text-slate-400">
                Vision acuity tests, dental health examinations, and general fitness clearance reports.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsScreeningModalOpen(true)}
              className="bg-red-600 hover:bg-red-500"
            >
              Record Screening
            </Button>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Screening Type</th>
                    <th className="py-3 px-4 text-center">Vision (R / L)</th>
                    <th className="py-3 px-4 text-center">Dental Health</th>
                    <th className="py-3 px-4 text-center">General Fitness</th>
                    <th className="py-3 px-4">Doctor Notes & Examiner</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {screenings.map((sc) => (
                    <tr key={sc.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-400">{sc.date}</td>
                      <td className="py-3 px-4 font-bold text-white">{sc.studentName}</td>
                      <td className="py-3 px-4">
                        <Badge variant="purple">{sc.screeningType.replace('_', ' ')}</Badge>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-emerald-400 font-bold">
                        {sc.visionRight} / {sc.visionLeft}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={sc.dentalHealth === 'HEALTHY' ? 'emerald' : 'amber'}>
                          {sc.dentalHealth.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={sc.generalFitness === 'EXCELLENT' ? 'emerald' : 'blue'}>
                          {sc.generalFitness}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <span className="text-slate-200 block">{sc.doctorNotes}</span>
                        <span className="text-[11px] text-slate-400 font-mono">{sc.examinerName}</span>
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
      {/* TAB 4: VACCINATION & IMMUNIZATION */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'vaccinations' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white">Student Immunization & Vaccination Register</h3>
              <p className="text-xs text-slate-400">
                Vaccine administration logs with batch and certificate references.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsVaccineModalOpen(true)}
              className="bg-red-600 hover:bg-red-500"
            >
              Record Vaccine
            </Button>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Vaccine Name</th>
                    <th className="py-3 px-4 text-center">Dose</th>
                    <th className="py-3 px-4 font-mono">Administered Date</th>
                    <th className="py-3 px-4">Administered By</th>
                    <th className="py-3 px-4 font-mono">Certificate Ref</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {vaccinations.map((vac) => (
                    <tr key={vac.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-bold text-white">{vac.studentName}</td>
                      <td className="py-3 px-4 font-semibold text-slate-200">{vac.vaccineName}</td>
                      <td className="py-3 px-4 text-center font-mono">Dose #{vac.doseNumber}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">{vac.dateAdministered}</td>
                      <td className="py-3 px-4 text-slate-300">{vac.administeredBy}</td>
                      <td className="py-3 px-4 font-mono text-emerald-400">{vac.certificateRef || 'N/A'}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant="emerald">{vac.status}</Badge>
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
      {/* TAB 5: EMERGENCY REFERRAL DESK */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'emergency' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20">
                <Ambulance className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Emergency Hospital Dispatch Protocol</h3>
                <p className="text-xs text-slate-400">
                  Critical medical referral workflow integrated with designated tertiary hospitals and instant SMS parent alerts.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-white block">Designated Trauma Center</span>
                <p className="text-xs text-slate-300">
                  Max Super Speciality Hospital, Saket, New Delhi
                </p>
                <span className="text-[11px] font-mono text-red-400 block">Emergency Helpline: 1066 / 011-26515050</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-white block">Campus Ambulance Service</span>
                <p className="text-xs text-slate-300">
                  Driver on duty: Vikram Singh (Stationed at Gate 2)
                </p>
                <span className="text-[11px] font-mono text-emerald-400 block">Direct Mobile: +91 98110 99881</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: LOG CLINIC VISIT */}
      {/* ------------------------------------------------------------- */}
      <Modal isOpen={isVisitModalOpen} onClose={() => setIsVisitModalOpen(false)} title="Record School Infirmary Visit">
        <form onSubmit={handleCreateVisit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Select Student</label>
            <select
              value={visitForm.studentId}
              onChange={(e) => setVisitForm({ ...visitForm, studentId: e.target.value })}
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
              <label className="block font-semibold text-slate-300 mb-1">Chief Complaint</label>
              <input
                type="text"
                required
                placeholder="e.g. Fever, Sports injury, Headache"
                value={visitForm.chiefComplaint}
                onChange={(e) => setVisitForm({ ...visitForm, chiefComplaint: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Symptoms Description</label>
              <input
                type="text"
                required
                placeholder="e.g. Mild swelling, shivering"
                value={visitForm.symptoms}
                onChange={(e) => setVisitForm({ ...visitForm, symptoms: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Temperature (°F)</label>
              <input
                type="number"
                step="0.1"
                required
                value={visitForm.vitalTempF}
                onChange={(e) => setVisitForm({ ...visitForm, vitalTempF: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Blood Pressure</label>
              <input
                type="text"
                placeholder="120/80"
                value={visitForm.vitalBp}
                onChange={(e) => setVisitForm({ ...visitForm, vitalBp: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Pulse (bpm)</label>
              <input
                type="number"
                value={visitForm.vitalPulse}
                onChange={(e) => setVisitForm({ ...visitForm, vitalPulse: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Clinical Diagnosis</label>
            <input
              type="text"
              required
              placeholder="e.g. Viral Pharyngitis, Ankle Sprain"
              value={visitForm.diagnosis}
              onChange={(e) => setVisitForm({ ...visitForm, diagnosis: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Treatment Given / First Aid</label>
            <textarea
              required
              rows={2}
              placeholder="e.g. Cold compress applied, bed rest 30 mins"
              value={visitForm.treatmentGiven}
              onChange={(e) => setVisitForm({ ...visitForm, treatmentGiven: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-slate-300 font-semibold">
              <input
                type="checkbox"
                checked={visitForm.parentNotified}
                onChange={(e) => setVisitForm({ ...visitForm, parentNotified: e.target.checked })}
                className="rounded border-slate-800 text-red-500"
              />
              Send Alert to Parent / Guardian
            </label>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsVisitModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" className="bg-red-600 hover:bg-red-500">
              Save Medical Visit
            </Button>
          </div>
        </form>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: UPDATE HEALTH PROFILE */}
      {/* ------------------------------------------------------------- */}
      <Modal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} title="Update Student Health Profile">
        <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Student</label>
            <select
              value={profileForm.studentId}
              onChange={(e) => setProfileForm({ ...profileForm, studentId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName} ({s.admissionNo})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Blood Group</label>
              <select
                value={profileForm.bloodGroup}
                onChange={(e: any) => setProfileForm({ ...profileForm, bloodGroup: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              >
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="UNKNOWN">UNKNOWN</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Height (cm)</label>
              <input
                type="number"
                required
                value={profileForm.heightCm}
                onChange={(e) => setProfileForm({ ...profileForm, heightCm: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Weight (kg)</label>
              <input
                type="number"
                required
                value={profileForm.weightKg}
                onChange={(e) => setProfileForm({ ...profileForm, weightKg: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Emergency Contact Name</label>
              <input
                type="text"
                required
                value={profileForm.emergencyContactName}
                onChange={(e) => setProfileForm({ ...profileForm, emergencyContactName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Emergency Phone</label>
              <input
                type="text"
                required
                value={profileForm.emergencyContactPhone}
                onChange={(e) => setProfileForm({ ...profileForm, emergencyContactPhone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Known Chronic Conditions</label>
            <input
              type="text"
              value={profileForm.chronicConditions}
              onChange={(e) => setProfileForm({ ...profileForm, chronicConditions: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsProfileModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" className="bg-red-600 hover:bg-red-500">
              Save Health Profile
            </Button>
          </div>
        </form>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADD ALLERGY */}
      {/* ------------------------------------------------------------- */}
      <Modal isOpen={isAllergyModalOpen} onClose={() => setIsAllergyModalOpen(false)} title="Record Student Allergy Flag">
        <form onSubmit={handleAddAllergy} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Student</label>
            <select
              value={allergyForm.studentId}
              onChange={(e) => setAllergyForm({ ...allergyForm, studentId: e.target.value })}
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
              <label className="block font-semibold text-slate-300 mb-1">Allergen Substance</label>
              <input
                type="text"
                required
                placeholder="e.g. Peanuts, Penicillin, Shellfish"
                value={allergyForm.substance}
                onChange={(e) => setAllergyForm({ ...allergyForm, substance: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Severity</label>
              <select
                value={allergyForm.severity}
                onChange={(e: any) => setAllergyForm({ ...allergyForm, severity: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              >
                <option value="MILD">Mild</option>
                <option value="MODERATE">Moderate</option>
                <option value="SEVERE">Severe</option>
                <option value="CRITICAL">Critical (Anaphylaxis Risk)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Reaction Symptoms</label>
            <input
              type="text"
              required
              placeholder="e.g. Hives, difficulty breathing, rash"
              value={allergyForm.reaction}
              onChange={(e) => setAllergyForm({ ...allergyForm, reaction: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsAllergyModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" className="bg-red-600 hover:bg-red-500">
              Save Allergy Flag
            </Button>
          </div>
        </form>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: RECORD VACCINATION */}
      {/* ------------------------------------------------------------- */}
      <Modal isOpen={isVaccineModalOpen} onClose={() => setIsVaccineModalOpen(false)} title="Log Vaccination Record">
        <form onSubmit={handleRecordVaccine} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Student</label>
            <select
              value={vaccineForm.studentId}
              onChange={(e) => setVaccineForm({ ...vaccineForm, studentId: e.target.value })}
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
              <label className="block font-semibold text-slate-300 mb-1">Vaccine Name</label>
              <input
                type="text"
                required
                value={vaccineForm.vaccineName}
                onChange={(e) => setVaccineForm({ ...vaccineForm, vaccineName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Dose Sequence</label>
              <input
                type="number"
                required
                min={1}
                value={vaccineForm.doseNumber}
                onChange={(e) => setVaccineForm({ ...vaccineForm, doseNumber: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Administered Date</label>
              <input
                type="date"
                required
                value={vaccineForm.dateAdministered}
                onChange={(e) => setVaccineForm({ ...vaccineForm, dateAdministered: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Certificate Reference</label>
              <input
                type="text"
                placeholder="e.g. COWIN-12345 or PHC-778"
                value={vaccineForm.certificateRef}
                onChange={(e) => setVaccineForm({ ...vaccineForm, certificateRef: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsVaccineModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" className="bg-red-600 hover:bg-red-500">
              Record Immunization
            </Button>
          </div>
        </form>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: HEALTH SCREENING */}
      {/* ------------------------------------------------------------- */}
      <Modal isOpen={isScreeningModalOpen} onClose={() => setIsScreeningModalOpen(false)} title="Record Annual Health Screening">
        <form onSubmit={handleCreateScreening} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Student</label>
            <select
              value={screeningForm.studentId}
              onChange={(e) => setScreeningForm({ ...screeningForm, studentId: e.target.value })}
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
              <label className="block font-semibold text-slate-300 mb-1">Vision Right Eye</label>
              <input
                type="text"
                required
                value={screeningForm.visionRight}
                onChange={(e) => setScreeningForm({ ...screeningForm, visionRight: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Vision Left Eye</label>
              <input
                type="text"
                required
                value={screeningForm.visionLeft}
                onChange={(e) => setScreeningForm({ ...screeningForm, visionLeft: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Dental Health</label>
              <select
                value={screeningForm.dentalHealth}
                onChange={(e: any) => setScreeningForm({ ...screeningForm, dentalHealth: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              >
                <option value="HEALTHY">Healthy / No issues</option>
                <option value="CAVITIES_OBSERVED">Cavities Observed</option>
                <option value="ORTHODONTIC_CARE_REQUIRED">Orthodontic Care Required</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">General Fitness</label>
              <select
                value={screeningForm.generalFitness}
                onChange={(e: any) => setScreeningForm({ ...screeningForm, generalFitness: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              >
                <option value="EXCELLENT">Excellent</option>
                <option value="GOOD">Good</option>
                <option value="NEEDS_ATTENTION">Needs Attention / Follow-up</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Doctor Remarks & Clearance</label>
            <textarea
              required
              rows={2}
              value={screeningForm.doctorNotes}
              onChange={(e) => setScreeningForm({ ...screeningForm, doctorNotes: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsScreeningModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" className="bg-red-600 hover:bg-red-500">
              Save Screening Report
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
