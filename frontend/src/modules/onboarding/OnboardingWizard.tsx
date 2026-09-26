import React, { useState } from 'react';
import { 
  Building, 
  School, 
  Target, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Users, 
  Mail, 
  Phone, 
  MapPin, 
  Layers, 
  UserPlus, 
  Sparkles 
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useTenant } from '../../context/TenantContext';
import { TenantConfig, TenantType, UserRole } from '../../types';

interface OnboardingWizardProps {
  onComplete: (newTenant: TenantConfig) => void;
  onCancel: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete, onCancel }) => {
  const { createNewTenant } = useTenant();
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form State
  const [institutionType, setInstitutionType] = useState<TenantType>('SCHOOL');
  
  // Organization Info
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Delhi');
  const [address, setAddress] = useState('');

  // Branch Info
  const [hasMultiBranch, setHasMultiBranch] = useState(false);
  const [mainBranchName, setMainBranchName] = useState('Main Campus');

  // Administrator Info
  const [adminName, setAdminName] = useState('');
  const [adminDesignation, setAdminDesignation] = useState('Principal');
  const [adminPhone, setAdminPhone] = useState('');

  // Initial Structure
  const [initialItems, setInitialItems] = useState<string[]>(['Class 9', 'Class 10', 'Class 11', 'Class 12']);

  // Invitations
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('TEACHER');
  const [invites, setInvites] = useState<{ email: string; role: UserRole }[]>([]);

  const handleTypeSelect = (type: TenantType) => {
    setInstitutionType(type);
    if (type === 'COACHING') {
      setInitialItems(['IIT-JEE Foundation 2-Year', 'NEET Pinnacle Medical 1-Year', 'Target JEE Advanced']);
      setAdminDesignation('Director');
    } else {
      setInitialItems(['Class 9', 'Class 10', 'Class 11', 'Class 12']);
      setAdminDesignation('Principal');
    }
    setCurrentStep(2);
  };

  const handleAddInvite = () => {
    if (inviteEmail.trim()) {
      setInvites([...invites, { email: inviteEmail.trim(), role: inviteRole }]);
      setInviteEmail('');
    }
  };

  const handleFinishSetup = () => {
    const slug = orgName.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20) || 'campus';
    const newTenant: TenantConfig = {
      id: `tenant-${Date.now()}`,
      name: orgName.trim() || (institutionType === 'SCHOOL' ? 'Delhi Public Academy' : 'Apex Coaching Institute'),
      code: slug.toUpperCase().slice(0, 6) || 'CAMPUS',
      tenantType: institutionType,
      status: 'active',
      planName: 'Campus Pro',
      subscriptionRenewalDate: '2027-03-31',
      academicYear: '2026-27',
      address: `${address || 'Sector 14'}, ${city || 'New Delhi'}, ${state}`,
      email: email || 'admin@campus.edu.in',
      phone: phone || '+91 98765 43210',
      logo: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=120&h=120&fit=crop',
      primaryColor: '#16a34a',
      secondaryColor: '#15803d',
      accentColor: '#10b981',
      currency: 'INR',
      currencySymbol: '₹',
      timezone: 'Asia/Kolkata',
      labels: institutionType === 'SCHOOL' ? {
        group: 'Class',
        subgroup: 'Section',
        groupPlural: 'Classes',
        student: 'Student',
        studentPlural: 'Students',
        staff: 'Teacher',
        staffPlural: 'Teachers',
        admission: 'Admission',
        period: 'Academic Year',
        exam: 'Examination',
        examPlural: 'Examinations',
        reportCard: 'Report Card',
        homework: 'Homework',
        feeStructure: 'Annual Fee Structure',
      } : {
        group: 'Target Program',
        subgroup: 'Batch',
        groupPlural: 'Programs',
        student: 'Learner',
        studentPlural: 'Learners',
        staff: 'Faculty',
        staffPlural: 'Faculty Members',
        admission: 'Enrollment',
        period: 'Course Phase',
        exam: 'Mock Test',
        examPlural: 'Test Series',
        reportCard: 'Performance Card',
        homework: 'Daily Practice Sheet (DPP)',
        feeStructure: 'Course Installment Plan',
      },
      features: {
        attendance: true,
        qrAttendance: true,
        fees: true,
        onlinePayments: true,
        exams: true,
        reportCards: true,
        testSeries: institutionType === 'COACHING',
        rankComparison: institutionType === 'COACHING',
        homework: true,
        timetable: true,
        communication: true,
        whatsappAlerts: true,
        inquiryCrm: true,
        certificates: true,
        hrPayroll: true,
        aiAssistant: true,
        aiReportSummary: true,
        transport: true,
        library: true,
        hostel: true,
      },
    };

    createNewTenant(newTenant);
    onComplete(newTenant);
  };

  return (
    <div className="min-h-screen bg-[#f8faf9] flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 selection:bg-emerald-500 selection:text-white">
      <div className="max-w-xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 p-2 px-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs mb-2">
            <div className="p-1.5 rounded-lg bg-emerald-600 text-white shadow-xs">
              <Building className="w-4 h-4" />
            </div>
            <span className="font-bold text-slate-900 text-sm">EduNexus Onboarding Wizard</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900">Set Up Your Institution</h2>
          <p className="text-xs text-slate-500">
            Step {currentStep} of 6 — Quick initial setup without complex configurations.
          </p>

          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-3">
            <div 
              className="h-full bg-emerald-600 transition-all duration-300"
              style={{ width: `${(currentStep / 6) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          
          {/* STEP 1: Institution Type */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h3 className="text-base font-bold text-slate-900">What are you managing?</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  This determines your academic terminology, rosters, and examination frameworks.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleTypeSelect('SCHOOL')}
                  className="p-5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-emerald-50/50 hover:border-emerald-500 text-left transition-colors group space-y-2"
                >
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 group-hover:text-emerald-700 w-fit">
                    <School className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm group-hover:text-emerald-800">K-12 School</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Classes, sections, CBSE/ICSE report cards, daily period timetable, and bus fleet routes.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleTypeSelect('COACHING')}
                  className="p-5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-emerald-50/50 hover:border-emerald-500 text-left transition-colors group space-y-2"
                >
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 group-hover:text-emerald-700 w-fit">
                    <Target className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm group-hover:text-emerald-800">Coaching Academy</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Multi-batch scheduling, JEE/NEET test series, percentiles, installment plans, and walk-in lead CRM.
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Organization Profile */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h3 className="text-base font-bold text-slate-900">Institution Details</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter the official legal name and contact coordinates for your campus.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Institution Name</label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder={institutionType === 'SCHOOL' ? 'e.g. Modern International Public School' : 'e.g. Apex JEE & NEET Institute'}
                    className="w-full px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Official Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="info@institution.edu.in"
                      className="w-full px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 11 2788 1234"
                      className="w-full px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. New Delhi"
                      className="w-full px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="e.g. Delhi"
                      className="w-full px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <Button variant="ghost" size="sm" onClick={() => setCurrentStep(1)}>
                  Back
                </Button>
                <Button variant="primary" size="sm" onClick={() => setCurrentStep(3)}>
                  Continue to Branch Setup
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Branch Setup */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h3 className="text-base font-bold text-slate-900">Campus & Branch Configuration</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Does your institution operate across multiple campuses or a single facility?
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setHasMultiBranch(false)}
                    className={`p-4 rounded-xl border text-left transition-colors ${
                      !hasMultiBranch
                        ? 'bg-emerald-50/60 border-emerald-500 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <h4 className="font-bold text-xs text-slate-900">Single Campus</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">One central facility location.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setHasMultiBranch(true)}
                    className={`p-4 rounded-xl border text-left transition-colors ${
                      hasMultiBranch
                        ? 'bg-emerald-50/60 border-emerald-500 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <h4 className="font-bold text-xs text-slate-900">Multiple Campuses</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Main campus + regional branches.</p>
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Campus Name</label>
                  <input
                    type="text"
                    value={mainBranchName}
                    onChange={(e) => setMainBranchName(e.target.value)}
                    placeholder="e.g. Main Campus (Rohini)"
                    className="w-full px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <Button variant="ghost" size="sm" onClick={() => setCurrentStep(2)}>
                  Back
                </Button>
                <Button variant="primary" size="sm" onClick={() => setCurrentStep(4)}>
                  Continue to Admin Setup
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: Administrator Profile */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h3 className="text-base font-bold text-slate-900">Chief Administrator Profile</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  The primary administrator account that will oversee daily operations.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="e.g. Dr. Sunita Verma"
                    className="w-full px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Designation</label>
                    <input
                      type="text"
                      value={adminDesignation}
                      onChange={(e) => setAdminDesignation(e.target.value)}
                      placeholder={institutionType === 'SCHOOL' ? 'Principal' : 'Director'}
                      className="w-full px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={adminPhone}
                      onChange={(e) => setAdminPhone(e.target.value)}
                      placeholder="+91 98110 54321"
                      className="w-full px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <Button variant="ghost" size="sm" onClick={() => setCurrentStep(3)}>
                  Back
                </Button>
                <Button variant="primary" size="sm" onClick={() => setCurrentStep(5)}>
                  Configure Academic Defaults
                </Button>
              </div>
            </div>
          )}

          {/* STEP 5: Academic Structure */}
          {currentStep === 5 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {institutionType === 'SCHOOL' ? 'Default Classes & Grades' : 'Core Courses & Batches'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Initial starting structure. You can add, edit, or customize more from the dashboard later.
                </p>
              </div>

              <div className="space-y-2">
                {initialItems.map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs font-medium text-slate-800">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{item}</span>
                    </div>
                    <span className="text-[11px] text-slate-400">Ready to provision</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <Button variant="ghost" size="sm" onClick={() => setCurrentStep(4)}>
                  Back
                </Button>
                <Button variant="primary" size="sm" onClick={() => setCurrentStep(6)}>
                  Continue to Team Invites
                </Button>
              </div>
            </div>
          )}

          {/* STEP 6: Team Invites & Final Checklist */}
          {currentStep === 6 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h3 className="text-base font-bold text-slate-900">Invite Your Leadership Team</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Send secure invitations to teachers, accountants, or academic coordinators.
                </p>
              </div>

              <div className="flex gap-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@institution.edu.in"
                  className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 outline-none"
                >
                  <option value="TEACHER">Teacher / Faculty</option>
                  <option value="ACCOUNTANT">Accountant</option>
                  <option value="STAFF">Front Desk Staff</option>
                </select>
                <Button variant="outline" size="sm" onClick={handleAddInvite}>
                  Add
                </Button>
              </div>

              {invites.length > 0 && (
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {invites.map((inv, idx) => (
                    <div key={idx} className="p-2 bg-emerald-50/50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-800">{inv.email}</span>
                      <Badge variant="emerald" size="sm">{inv.role}</Badge>
                    </div>
                  ))}
                </div>
              )}

              {/* Ready Checklist */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Setup Ready Checklist</h4>
                <div className="space-y-1.5 text-slate-700">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Institution Profile: {orgName || 'Configured'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Mode: {institutionType === 'SCHOOL' ? 'K-12 School' : 'Coaching Academy'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Admin Profile: {adminName || 'Dr. Sunita Verma'} ({adminDesignation})</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <Button variant="ghost" size="sm" onClick={() => setCurrentStep(5)}>
                  Back
                </Button>
                <Button variant="primary" size="sm" onClick={handleFinishSetup} rightIcon={<Sparkles className="w-4 h-4" />}>
                  Launch Institution Workspace
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
