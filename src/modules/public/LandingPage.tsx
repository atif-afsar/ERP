import React, { useState } from 'react';
import { 
  Building, 
  School, 
  Target, 
  Users, 
  CalendarCheck, 
  CreditCard, 
  Award, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  BookOpen, 
  ChevronDown, 
  HelpCircle,
  QrCode,
  Bus,
  Home,
  UtensilsCrossed,
  HeartPulse,
  DollarSign
} from 'lucide-react';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

import { EduNexusHero, ProgramCard } from '../../components/ui/edunexus-hero';

interface LandingPageProps {
  onNavigate: (route: string) => void;
  subRoute?: string;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, subRoute }) => {
  const [activeSolutionTab, setActiveSolutionTab] = useState<'school' | 'coaching'>(
    subRoute?.includes('coaching') ? 'coaching' : 'school'
  );
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const heroPrograms: ProgramCard[] = [
    {
      image: '/assets/school_classroom.jpg',
      category: 'K-12 SCHOOLS',
      badge: 'CBSE & ICSE',
      title: 'Smart Classrooms & Automated Roster Attendance',
      onClick: () => {
        setActiveSolutionTab('school');
        const el = document.getElementById('solutions');
        el?.scrollIntoView({ behavior: 'smooth' });
      },
    },
    {
      image: '/assets/coaching_hall.jpg',
      category: 'COACHING ACADEMIES',
      badge: 'IIT-JEE & NEET',
      title: 'Auditorium Batches & Test Series Ranks',
      onClick: () => {
        setActiveSolutionTab('coaching');
        const el = document.getElementById('solutions');
        el?.scrollIntoView({ behavior: 'smooth' });
      },
    },
    {
      image: '/assets/qr_gate_pass.jpg',
      category: 'SMART GATEPASS',
      badge: 'Live RFID & QR',
      title: 'Instant Gate Check-in & Guardian SMS Alerts',
      onClick: () => {
        const el = document.getElementById('features');
        el?.scrollIntoView({ behavior: 'smooth' });
      },
    },
    {
      image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&h=800&fit=crop',
      category: 'FLEET LOGISTICS',
      badge: 'GPS Bus Tracking',
      title: 'Multi-Stop School Bus Fleet & Route Ledgers',
      onClick: () => {
        const el = document.getElementById('features');
        el?.scrollIntoView({ behavior: 'smooth' });
      },
    },
    {
      image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=600&h=800&fit=crop',
      category: 'ACADEMIC LABS',
      badge: 'Library & OPAC',
      title: 'Central Library Catalog & Science Lab Inventory',
      onClick: () => {
        const el = document.getElementById('features');
        el?.scrollIntoView({ behavior: 'smooth' });
      },
    },
    {
      image: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600&h=800&fit=crop',
      category: 'RESIDENCE',
      badge: 'Hostel & Mess',
      title: 'Hostel Bed Allocations & 7-Day Meal Token Plans',
      onClick: () => {
        const el = document.getElementById('features');
        el?.scrollIntoView({ behavior: 'smooth' });
      },
    },
  ];

  const faqs = [
    {
      q: 'Does EduNexus work for both K-12 schools and coaching centres?',
      a: 'Yes! EduNexus has a dual-engine core. When configured as a School, it structures students by Classes, Sections, and CBSE report cards. When set up as a Coaching Centre, it uses flexible Course Batches, Test Series percentiles, and multi-batch scheduling.',
    },
    {
      q: 'How does multi-tenant data isolation work?',
      a: 'Every institution is assigned an isolated tenant UUID. PostgreSQL Row Level Security (RLS) policies enforce database-level boundaries so your student records, fees, and employee details are 100% private to your institution.',
    },
    {
      q: 'Can parents pay school fees online?',
      a: 'Absolutely. Parents can sign into the dedicated Parent Portal or mobile view to check dues, view itemized invoice breakdowns, and settle fees via UPI, credit card, or net banking with instant automated receipt generation.',
    },
    {
      q: 'Can we manage multiple campus branches?',
      a: 'Yes. EduNexus supports multi-branch campus management with a unified group dashboard for the management trust while maintaining individual branch accounts, timetables, and staff directories.',
    },
    {
      q: 'What happens if our campus internet connection drops?',
      a: 'EduNexus has an offline-first resilient architecture. Critical operations like gate attendance scanning and classroom registers continue operating locally and automatically sync back to cloud PostgreSQL once connectivity resumes.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8faf9] text-slate-900 flex flex-col antialiased selection:bg-emerald-500 selection:text-white">
      {/* 1. PulseFit Style Hero with EduNexus Branding & Infinite Moving Carousel */}
      <EduNexusHero
        navigation={[
          { label: "Features", onClick: () => { const el = document.getElementById('features'); el?.scrollIntoView({ behavior: 'smooth' }); } },
          { label: "For Schools", onClick: () => { setActiveSolutionTab('school'); const el = document.getElementById('solutions'); el?.scrollIntoView({ behavior: 'smooth' }); } },
          { label: "For Coaching Centres", onClick: () => { setActiveSolutionTab('coaching'); const el = document.getElementById('solutions'); el?.scrollIntoView({ behavior: 'smooth' }); } },
          { label: "Pricing", onClick: () => { const el = document.getElementById('pricing'); el?.scrollIntoView({ behavior: 'smooth' }); } },
          { label: "How It Works", onClick: () => { const el = document.getElementById('how-it-works'); el?.scrollIntoView({ behavior: 'smooth' }); } },
        ]}
        ctaButton={{
          label: "Sign In",
          onClick: () => onNavigate('login'),
        }}
        title="Run your school or coaching centre from one simple platform."
        subtitle="Admissions, students, attendance, fees, examinations, communication, staff, and campus logistics — seamlessly unified in one modern, accessible ERP."
        primaryAction={{
          label: "Get Started Free",
          onClick: () => onNavigate('signup'),
        }}
        secondaryAction={{
          label: "See How It Works",
          onClick: () => { const el = document.getElementById('how-it-works'); el?.scrollIntoView({ behavior: 'smooth' }); },
        }}
        disclaimer="*No credit card required • Instant 14-day setup"
        socialProof={{
          avatars: [
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces",
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces",
            "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces",
            "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces",
          ],
          text: "Over 250+ premier institutions & 15,000+ students powered by EduNexus",
        }}
        programs={heroPrograms}
      />

      {/* 3. Dual Engine Solutions Section */}
      <section id="solutions" className="py-16 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <Badge variant="emerald" size="sm">Purpose-Built Architecture</Badge>
            <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              One ERP. Two Specialized Operating Engines.
            </h2>
            <p className="text-sm text-slate-600">
              Unlike generic software, EduNexus provides native, dedicated workflows tailored specifically for traditional schools or competitive coaching institutes.
            </p>
          </div>

          {/* Solution Tabs Switcher */}
          <div className="flex justify-center">
            <div className="inline-flex p-1 bg-slate-100 border border-slate-200 rounded-xl shadow-2xs">
              <button
                onClick={() => setActiveSolutionTab('school')}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  activeSolutionTab === 'school'
                    ? 'bg-white text-emerald-800 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <School className="w-4 h-4 text-emerald-600" />
                <span>K-12 School Edition</span>
              </button>
              <button
                onClick={() => setActiveSolutionTab('coaching')}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  activeSolutionTab === 'coaching'
                    ? 'bg-white text-emerald-800 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Target className="w-4 h-4 text-emerald-600" />
                <span>Coaching Academy Edition</span>
              </button>
            </div>
          </div>

          {/* Tab Content: School Mode */}
          {activeSolutionTab === 'school' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center pt-4">
              <div className="space-y-4">
                <Badge variant="blue" size="sm">Tailored for CBSE, ICSE & State Boards</Badge>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Complete Class & Section Governance
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Easily manage student rosters partitioned into standard classes, sections, roll numbers, and academic sessions. Deliver official marksheet generation and CBSE grading standards.
                </p>
                <ul className="space-y-2.5 text-xs text-slate-700 font-medium">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Single-class enrollment with fixed sections (Class 10-A, 10-B)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Term-wise examination marks, GPA bands (A1, A2, B1) and printable report cards</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>School bus fleet routes with designated stops and boarding logs</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>School infirmary first-aid log and annual health screenings</span>
                  </li>
                </ul>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <span className="font-bold text-sm text-slate-900">Class 10-A Academic Summary</span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Active Session
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <p className="text-slate-500 text-[11px]">Class Teacher</p>
                    <p className="font-bold text-slate-900 mt-0.5">Mrs. Ritu Sen</p>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <p className="text-slate-500 text-[11px]">Roster Count</p>
                    <p className="font-bold text-slate-900 mt-0.5">38 Students</p>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <p className="text-slate-500 text-[11px]">Term 1 Status</p>
                    <p className="font-bold text-emerald-700 mt-0.5">Report Cards Ready</p>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <p className="text-slate-500 text-[11px]">Attendance Today</p>
                    <p className="font-bold text-slate-900 mt-0.5">97.4% Present</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content: Coaching Mode */}
          {activeSolutionTab === 'coaching' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center pt-4">
              <div className="space-y-4">
                <Badge variant="purple" size="sm">Engineered for JEE, NEET & Foundation</Badge>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Many-to-Many Batches & Test Series Ranks
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Learners enroll across multiple subject batches with flexible timing. Run competitive mock test series with automated negative marking and percentile ranking.
                </p>
                <ul className="space-y-2.5 text-xs text-slate-700 font-medium">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Flexible batch allocations (e.g. Physics Morning Batch, Maths Weekend Batch)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Mock test rankings with AIR projection, negative marks and percentile analysis</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Custom installment fee payment plans with automated reminders</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Inquiry CRM pipeline tracking walk-in demo lectures and conversions</span>
                  </li>
                </ul>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <span className="font-bold text-sm text-slate-900">IIT-JEE Super-30 Test Matrix</span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-800 border border-purple-200">
                    Advanced Prep
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <p className="text-slate-500 text-[11px]">Enrolled Aspirants</p>
                    <p className="font-bold text-slate-900 mt-0.5">30 Top Rankers</p>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <p className="text-slate-500 text-[11px]">Batch Faculty</p>
                    <p className="font-bold text-slate-900 mt-0.5">Er. V. Sharma (IIT-D)</p>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <p className="text-slate-500 text-[11px]">Latest Test Top Score</p>
                    <p className="font-bold text-emerald-700 mt-0.5">292 / 300 (99.8%ile)</p>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <p className="text-slate-500 text-[11px]">Fee Installments</p>
                    <p className="font-bold text-slate-900 mt-0.5">100% Up to Date</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 4. Core Capabilities Feature Grid */}
      <section id="features" className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 max-w-2xl mx-auto mb-12">
          <Badge variant="emerald" size="sm">Comprehensive Suite</Badge>
          <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Every Campus Operation In One Place
          </h2>
          <p className="text-sm text-slate-600">
            From gate security and classroom attendance to multi-warehouse inventory and audited financial ledgers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-3 hover:border-slate-300 transition-colors">
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 w-fit border border-emerald-200/80">
              <QrCode className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">QR Gate & Daily Attendance</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Instant digital student card verification via mobile or webcam scanner. Auto-sends absence alerts to guardians.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-3 hover:border-slate-300 transition-colors">
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 w-fit border border-emerald-200/80">
              <CreditCard className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Fees, Billing & Accounting</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Automated invoice generation, concession rules, online payment gateway, and double-entry General Ledger with P&L.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-3 hover:border-slate-300 transition-colors">
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 w-fit border border-emerald-200/80">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Exams & CBSE Report Cards</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Configurable grading schemes, automated total calculations, class rank matrices, and printable report cards.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-3 hover:border-slate-300 transition-colors">
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 w-fit border border-emerald-200/80">
              <Bus className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Transport & Fleet Management</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Vehicle compliance tracking, driver directories, multi-stop pickup routes, seat allocations, and fuel expense logs.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-3 hover:border-slate-300 transition-colors">
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 w-fit border border-emerald-200/80">
              <Home className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Hostel & Dining Mess</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Room and bed allocations with strict gender isolation policies, evening curfew attendance, and rotating 7-day meal tokens.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-3 hover:border-slate-300 transition-colors">
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 w-fit border border-emerald-200/80">
              <HeartPulse className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Clinic & Student Health</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Infirmary consultations, vital signs logging, chronic allergy registers, annual screenings, and hospital emergency dispatch.
            </p>
          </div>
        </div>
      </section>

      {/* 5. How It Works (Section 120-133) */}
      <section id="how-it-works" className="py-16 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <Badge variant="emerald" size="sm">Frictionless Onboarding</Badge>
            <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Set Up Your Institution In Minutes
            </h2>
            <p className="text-sm text-slate-600">
              A clear, guided roadmap from sign-up to daily campus management.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-center">
              <span className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center mx-auto">1</span>
              <h4 className="font-bold text-slate-900 text-sm">Create Org</h4>
              <p className="text-xs text-slate-500">Pick School or Coaching mode and enter institution profile.</p>
            </div>

            <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-center">
              <span className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center mx-auto">2</span>
              <h4 className="font-bold text-slate-900 text-sm">Configure</h4>
              <p className="text-xs text-slate-500">Set up initial classes, sections, academic sessions or batches.</p>
            </div>

            <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-center">
              <span className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center mx-auto">3</span>
              <h4 className="font-bold text-slate-900 text-sm">Invite Team</h4>
              <p className="text-xs text-slate-500">Invite teachers, accountants, and staff with secure role links.</p>
            </div>

            <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-center">
              <span className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center mx-auto">4</span>
              <h4 className="font-bold text-slate-900 text-sm">Add Students</h4>
              <p className="text-xs text-slate-500">Enroll students, issue digital ID passes, and assign fees.</p>
            </div>

            <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-center">
              <span className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center mx-auto">5</span>
              <h4 className="font-bold text-slate-900 text-sm">Go Live!</h4>
              <p className="text-xs text-slate-500">Conduct live attendance, collect fees, and grade exams.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Pricing Section */}
      <section id="pricing" className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 max-w-2xl mx-auto mb-12">
          <Badge variant="emerald" size="sm">Simple, Transparent Pricing</Badge>
          <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Fair Pricing Built For Institutions of All Sizes
          </h2>
          <p className="text-sm text-slate-600">
            No surprise add-on fees. Everything needed to run your school or coaching academy.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Starter Plan */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-2xs space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Starter Academy</h3>
                <p className="text-xs text-slate-500 mt-1">For single-branch schools and emerging coaching centres.</p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-extrabold text-slate-900">₹1,999</span>
                <span className="text-xs text-slate-500">/ month</span>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-700">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Up to 300 Enrolled Students</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>QR Attendance & Registers</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Fee Billing & Invoicing</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Report Cards & Marksheets</span>
                </li>
              </ul>
            </div>
            <Button variant="outline" className="w-full text-xs font-semibold" onClick={() => onNavigate('signup')}>
              Choose Starter
            </Button>
          </div>

          {/* Growth Plan (Popular) */}
          <div className="bg-white p-8 rounded-2xl border-2 border-emerald-600 shadow-lg space-y-6 flex flex-col justify-between relative">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-emerald-600 text-white text-[11px] font-bold rounded-full shadow-xs uppercase tracking-wider">
              Most Popular
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Campus Pro</h3>
                <p className="text-xs text-slate-500 mt-1">For established schools and multi-batch academies.</p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-extrabold text-slate-900">₹4,999</span>
                <span className="text-xs text-slate-500">/ month</span>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-700">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Up to 1,500 Enrolled Students</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>All Starter Features</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Online Fee Payment Gateway</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Parent & Student Portals</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Transport Fleet & Library Ledger</span>
                </li>
              </ul>
            </div>
            <Button variant="primary" className="w-full text-xs font-semibold" onClick={() => onNavigate('signup')}>
              Start 14-Day Free Trial
            </Button>
          </div>

          {/* Enterprise Plan */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-2xs space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Institutional Trust</h3>
                <p className="text-xs text-slate-500 mt-1">For large multi-branch school networks & universities.</p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-extrabold text-slate-900">₹9,999</span>
                <span className="text-xs text-slate-500">/ month</span>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-700">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Unlimited Students & Staff</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Multi-Campus Branch Switcher</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Hostel & Mess Operations</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Health Clinic & Hospital Dispatch</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Dedicated Account Manager & SLA</span>
                </li>
              </ul>
            </div>
            <Button variant="outline" className="w-full text-xs font-semibold" onClick={() => onNavigate('signup')}>
              Contact Enterprise
            </Button>
          </div>
        </div>
      </section>

      {/* 7. FAQ Accordion Section */}
      <section className="py-16 bg-white border-y border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-3">
            <Badge variant="emerald" size="sm">Got Questions?</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                  className="w-full p-4 text-left flex items-center justify-between text-xs sm:text-sm font-bold text-slate-900"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${openFaqIndex === idx ? 'rotate-180 text-emerald-600' : ''}`} />
                </button>
                {openFaqIndex === idx && (
                  <div className="px-4 pb-4 text-xs text-slate-600 leading-relaxed border-t border-slate-200 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Final CTA Banner */}
      <section className="py-16 md:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="p-8 sm:p-12 rounded-3xl bg-emerald-600 text-white shadow-lg space-y-6">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Ready to upgrade your school or academy?
          </h2>
          <p className="text-sm sm:text-base text-emerald-100 max-w-xl mx-auto">
            Experience effortless campus operations, automated fee billing, and real-time student tracking.
          </p>
          <div className="pt-2">
            <Button
              variant="outline"
              size="lg"
              className="bg-white text-emerald-800 hover:bg-emerald-50 border-white text-sm font-bold px-8 py-3"
              onClick={() => onNavigate('signup')}
            >
              Get Started Now — It's Free
            </Button>
          </div>
        </div>
      </section>

      {/* 9. Footer */}
      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
};
