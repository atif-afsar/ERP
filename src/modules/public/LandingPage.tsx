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
  ArrowUpRight,
  Sparkles, 
  BookOpen, 
  ChevronDown, 
  HelpCircle,
  QrCode,
  Bus,
  Home,
  UtensilsCrossed,
  HeartPulse,
  DollarSign,
  Zap,
  Check,
  FileText,
  Layers,
  Bot,
  Laptop
} from 'lucide-react';
import { PublicFooter } from './PublicFooter';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EduNexusHero } from '../../components/ui/edunexus-hero';

interface LandingPageProps {
  onNavigate: (route: string) => void;
  subRoute?: string;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, subRoute }) => {
  const [activeSolutionTab, setActiveSolutionTab] = useState<'school' | 'coaching'>(
    subRoute?.includes('coaching') ? 'coaching' : 'school'
  );
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

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
    <div className="min-h-screen bg-[#fafcfb] text-slate-900 flex flex-col antialiased selection:bg-emerald-500 selection:text-white">
      {/* 1. MedTrackr-Inspired Hero with EduNexus ERP Branding */}
      <EduNexusHero
        navigation={[
          { label: "Home", onClick: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
          { label: "Products", onClick: () => { const el = document.getElementById('features'); el?.scrollIntoView({ behavior: 'smooth' }); } },
          { label: "Resource", hasDropdown: true, onClick: () => { const el = document.getElementById('solutions'); el?.scrollIntoView({ behavior: 'smooth' }); } },
          { label: "Pricing", onClick: () => { const el = document.getElementById('pricing'); el?.scrollIntoView({ behavior: 'smooth' }); } },
          { label: "Company", onClick: () => { const el = document.getElementById('how-it-works'); el?.scrollIntoView({ behavior: 'smooth' }); } },
        ]}
        ctaButton={{
          label: "Get a Demo",
          onClick: () => onNavigate('login'),
        }}
        badgeText="AI-Powered Dual Engine Campus ERP"
        headlinePart1="Empower Your School & Coaching To"
        italicWord="Excel"
        headlinePart2="Every Day"
        subtitle="The unified operating platform built for modern K-12 Schools and Competitive Coaching Academies. Seamlessly manage admissions, QR gate attendance, CBSE report cards, test series ranks, and online fees in one place."
        primaryAction={{
          label: "Get Started",
          onClick: () => onNavigate('signup'),
        }}
        socialProof={{
          avatars: [
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces",
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces",
            "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces",
            "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces",
          ],
          text: "Trusted by 500+ schools & academies",
        }}
        dashboardImage="/assets/edunexus_hero_dashboard.jpg"
      />

      {/* ------------------------------------------------------------- */}
      {/* 2. TRUST & ACCREDITATION BANNER */}
      {/* ------------------------------------------------------------- */}
      <section className="py-10 border-y border-slate-200/80 bg-white/70 backdrop-blur-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">
            Trusted & Compliant with India's Premier Educational Standards
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-12 opacity-75 grayscale hover:grayscale-0 transition-all">
            <span className="font-extrabold text-slate-800 text-sm tracking-wide flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> CBSE Compliant (8-Point)
            </span>
            <span className="font-extrabold text-slate-800 text-sm tracking-wide flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span> ICSE & State Boards
            </span>
            <span className="font-extrabold text-slate-800 text-sm tracking-wide flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span> IIT-JEE / NEET Percentiles
            </span>
            <span className="font-extrabold text-slate-800 text-sm tracking-wide flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span> RBI BYOK Payment Standard
            </span>
            <span className="font-extrabold text-slate-800 text-sm tracking-wide flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-500"></span> ISO 27001 Cloud Security
            </span>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-slate-100">
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">150,000+</p>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">Enrolled Learners</p>
            </div>
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600">0.2 Sec</p>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">QR Gate Scan Speed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">₹18+ Crore</p>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">Direct Tuition Settled</p>
            </div>
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600">99.98%</p>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">Campus Platform Uptime</p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 3. DUAL-ENGINE OPERATING SYSTEM (SCHOOL VS COACHING) */}
      {/* ------------------------------------------------------------- */}
      <section id="solutions" className="py-20 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Header */}
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Purpose-Built Dual Engine</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              One Unified ERP. <br />
              <span className="text-emerald-600">Two Specialized Operating Engines.</span>
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Unlike generic software that forces schools into rigid corporate molds, EduNexus automatically morphs its entire UI, logic, and reports based on your institution type.
            </p>
          </div>

          {/* Interactive Mode Switcher */}
          <div className="flex justify-center">
            <div className="inline-flex p-1.5 bg-slate-100/90 border border-slate-200 rounded-2xl shadow-inner">
              <button
                onClick={() => setActiveSolutionTab('school')}
                className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  activeSolutionTab === 'school'
                    ? 'bg-white text-emerald-700 shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <School className="w-4 h-4 text-emerald-600" />
                <span>K-12 School Edition</span>
              </button>
              <button
                onClick={() => setActiveSolutionTab('coaching')}
                className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  activeSolutionTab === 'coaching'
                    ? 'bg-white text-purple-700 shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Target className="w-4 h-4 text-purple-600" />
                <span>Coaching Academy Edition</span>
              </button>
            </div>
          </div>

          {/* Tab Content: School Mode */}
          {activeSolutionTab === 'school' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-2">
              <div className="lg:col-span-6 space-y-5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold">
                  <span>Class & Section Governance</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-snug">
                  Tailored for CBSE, ICSE & State Board Curriculums
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Deliver pristine academic administration with single-class rosters, teacher roll calls, official CBSE 8-point report cards, and comprehensive campus safety logistics.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <p className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> Class & Section Rosters
                    </p>
                    <p className="text-[11px] text-slate-500">Fixed classes (Class 10-A, 10-B) with class teachers and room limits.</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <p className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> CBSE Report Cards
                    </p>
                    <p className="text-[11px] text-slate-500">Official 8-point grading (A1–E), co-scholastic marks, and teacher remarks.</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <p className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> School Bus Fleet & Routes
                    </p>
                    <p className="text-[11px] text-slate-500">Driver commercial licenses, pickup stop manifests, and RTO fitness tracking.</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <p className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> Campus Infirmary & Clinic
                    </p>
                    <p className="text-[11px] text-slate-500">Student allergy badges, temperature logs, and emergency parent dispatches.</p>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => onNavigate('solutions/school')}
                    className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700 hover:text-emerald-800"
                  >
                    <span>Explore all K-12 School features</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Showcase UI Card */}
              <div className="lg:col-span-6 p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 text-white shadow-xl border border-slate-800 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="font-bold text-sm text-white">Class 10-A • Academic Dashboard</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    CBSE 2026-27 Active
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
                    <p className="text-slate-400 text-[11px]">Class Teacher</p>
                    <p className="font-bold text-white text-sm mt-0.5">Mrs. Ritu Sen</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
                    <p className="text-slate-400 text-[11px]">Roster Strength</p>
                    <p className="font-bold text-white text-sm mt-0.5">38 Students</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
                    <p className="text-slate-400 text-[11px]">Attendance Today</p>
                    <p className="font-bold text-emerald-400 text-sm mt-0.5">97.4% Present</p>
                  </div>
                </div>

                {/* Simulated Student List */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Live Term Exam Rankings</span>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/90 border border-slate-800">
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold flex items-center justify-center">1</span>
                        <span className="font-semibold text-white">Aarav Sharma</span>
                      </div>
                      <span className="font-mono font-bold text-emerald-400">96.8% (A1)</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/90 border border-slate-800">
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-300 text-[10px] font-bold flex items-center justify-center">2</span>
                        <span className="font-semibold text-white">Diya Patel</span>
                      </div>
                      <span className="font-mono font-bold text-emerald-400">95.4% (A1)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content: Coaching Mode */}
          {activeSolutionTab === 'coaching' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-2">
              <div className="lg:col-span-6 space-y-5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-800 text-xs font-bold">
                  <span>Competitive Exam Mastery</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-snug">
                  Engineered for IIT-JEE, NEET & Foundation Academies
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Support flexible many-to-many batch allocations, conduct national-standard test series with negative marking (+4 / -1), calculate percentiles, and manage multi-installment coaching fees.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <p className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-purple-600" /> Many-to-Many Batches
                    </p>
                    <p className="text-[11px] text-slate-500">Students enroll across Physics Morning, Maths Evening & Test Series simultaneously.</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <p className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-purple-600" /> Negative Marking & Percentiles
                    </p>
                    <p className="text-[11px] text-slate-500">Real-time All-India Rank (AIR) projection, accuracy curves, and cut-off metrics.</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <p className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-purple-600" /> Daily Practice Sheets (DPP)
                    </p>
                    <p className="text-[11px] text-slate-500">Digital problem sets with submission countdowns and solution keys.</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <p className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-purple-600" /> Walk-in Lead CRM Pipeline
                    </p>
                    <p className="text-[11px] text-slate-500">Track demo lecture visitors, parent inquiries, and 1-click enrollments.</p>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => onNavigate('solutions/coaching-centre')}
                    className="inline-flex items-center gap-2 text-xs font-bold text-purple-700 hover:text-purple-800"
                  >
                    <span>Explore all Coaching Academy features</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Showcase UI Card for Coaching */}
              <div className="lg:col-span-6 p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 text-white shadow-xl border border-slate-800 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-purple-500 animate-pulse"></div>
                    <span className="font-bold text-sm text-white">IIT-JEE Super-30 • Test Series 04</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    AIR Leaderboard Active
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
                    <p className="text-slate-400 text-[11px]">Lead Faculty</p>
                    <p className="font-bold text-white text-sm mt-0.5">Er. V. Sharma (IIT-D)</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
                    <p className="text-slate-400 text-[11px]">Enrolled Aspirants</p>
                    <p className="font-bold text-white text-sm mt-0.5">30 Rankers</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
                    <p className="text-slate-400 text-[11px]">Top Score</p>
                    <p className="font-bold text-emerald-400 text-sm mt-0.5">292 / 300 (99.8%ile)</p>
                  </div>
                </div>

                {/* Simulated Leaderboard */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Mock Test Negative Marking Summary</span>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/90 border border-slate-800">
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold flex items-center justify-center">AIR 1</span>
                        <span className="font-semibold text-white">Rohan Kulkarni</span>
                      </div>
                      <span className="font-mono font-bold text-emerald-400">292 (+73 / -1)</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/90 border border-slate-800">
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-300 text-[10px] font-bold flex items-center justify-center">AIR 2</span>
                        <span className="font-semibold text-white">Ananya Deshmukh</span>
                      </div>
                      <span className="font-mono font-bold text-emerald-400">286 (+72 / -2)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 4. CORE SUITE BENTO GRID (ELEVATED CARDS) */}
      {/* ------------------------------------------------------------- */}
      <section id="features" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
            <Layers className="w-3.5 h-3.5" />
            <span>22 Mission-Critical Modules</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Every Campus Operation In One Place
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            From gate security roll calls to double-entry general ledgers and AI assistance.
          </p>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Bento 1: High-Speed QR Gate Scanner (Featured Large Card) */}
          <div className="lg:col-span-2 p-8 rounded-3xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 max-w-md">
                <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 w-fit border border-emerald-200">
                  <QrCode className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Smart QR Gate Scanner & Instant Guardian Alerts</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Students tap their digital photo ID card at campus gates. Camera sensors verify identity in 0.2 seconds, record entry timestamps, and auto-dispatch instant arrival notifications to parents.
                </p>
              </div>

              <div className="hidden sm:block shrink-0 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
                0.2s Verified
              </div>
            </div>

            {/* Simulated Mini Scanner UI */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-200 overflow-hidden border border-white shadow-xs">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop"
                    alt="Student"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">Aarav Sharma (ADM-2026-0412)</p>
                  <p className="text-[11px] text-slate-500">Class 10-A • Gate North #02 Check-in</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-xs">
                  ✓ Gate In: 08:14 AM
                </span>
                <span className="px-2 py-1 rounded-md text-[11px] font-semibold bg-white border border-slate-200 text-slate-700">
                  Parent Alert Sent
                </span>
              </div>
            </div>
          </div>

          {/* Bento 2: Direct Fee Settlement BYOK */}
          <div className="p-8 rounded-3xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-sky-50 text-sky-600 w-fit border border-sky-200">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Direct Fee Collection (BYOK)</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Connect your school's own Razorpay merchant keys. Student tuition settles directly into your bank account with zero escrow liability and automated 3-copy GST receipts.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>UPI / Cards / Cash Desk</span>
              <span className="text-emerald-600 font-bold">Direct T+1 Payout</span>
            </div>
          </div>

          {/* Bento 3: CBSE 8-Point Report Cards */}
          <div className="p-8 rounded-3xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 w-fit border border-amber-200">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">CBSE Report Cards & Marksheets</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                1-click generation of official CBSE 8-point report cards with school crest, scholastic subjects, co-scholastic remarks, and principal signatures.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>Automated GPA Calculation</span>
              <span className="text-amber-600 font-bold">1-Click PDF Export</span>
            </div>
          </div>

          {/* Bento 4: Campus Logistics (Transport, Hostel, Mess) */}
          <div className="p-8 rounded-3xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-purple-50 text-purple-600 w-fit border border-purple-200">
                <Bus className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Fleet Logistics & Hostel Residency</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Multi-stop bus pickup routes, commercial driver licenses, hostel dorm rooms with gender isolation policies, and rotating 7-day meal dining tokens.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>GPS Routes & Night Curfew</span>
              <span className="text-purple-600 font-bold">Zero Paperwork</span>
            </div>
          </div>

          {/* Bento 5: AI Education Assistant */}
          <div className="p-8 rounded-3xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 w-fit border border-emerald-200">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">AI Campus Copilot & Report Summarizer</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Context-aware conversational assistant that answers parent queries, generates personalized report card remarks, and detects at-risk students automatically.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>Natural Language Queries</span>
              <span className="text-emerald-600 font-bold">Instant Resolution</span>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 5. 5-STEP GUIDED ONBOARDING */}
      {/* ------------------------------------------------------------- */}
      <section id="how-it-works" className="py-20 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <span>Fast 15-Minute Setup</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Get Your Campus Running in Minutes
            </h2>
            <p className="text-sm text-slate-600">
              No complicated multi-month software implementations. Follow our clear 5-step onboarding wizard.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/90 text-center space-y-3 hover:border-emerald-500 transition-colors">
              <span className="w-10 h-10 rounded-full bg-emerald-600 text-white font-extrabold text-sm flex items-center justify-center mx-auto shadow-sm">
                1
              </span>
              <h4 className="font-bold text-slate-900 text-sm">Create Workspace</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Select K-12 School or Coaching Academy mode and customize your brand colors.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/90 text-center space-y-3 hover:border-emerald-500 transition-colors">
              <span className="w-10 h-10 rounded-full bg-emerald-600 text-white font-extrabold text-sm flex items-center justify-center mx-auto shadow-sm">
                2
              </span>
              <h4 className="font-bold text-slate-900 text-sm">Define Structure</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Add classes, sections, academic terms, or competitive subject batches.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/90 text-center space-y-3 hover:border-emerald-500 transition-colors">
              <span className="w-10 h-10 rounded-full bg-emerald-600 text-white font-extrabold text-sm flex items-center justify-center mx-auto shadow-sm">
                3
              </span>
              <h4 className="font-bold text-slate-900 text-sm">Invite Team</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Grant role-based logins to Teachers, Accountants, and Receptionists with RBAC guards.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/90 text-center space-y-3 hover:border-emerald-500 transition-colors">
              <span className="w-10 h-10 rounded-full bg-emerald-600 text-white font-extrabold text-sm flex items-center justify-center mx-auto shadow-sm">
                4
              </span>
              <h4 className="font-bold text-slate-900 text-sm">Import Students</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Upload CSV roster or enroll 1-by-1. Issue scannable QR digital identity cards.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/90 text-center space-y-3 hover:border-emerald-500 transition-colors">
              <span className="w-10 h-10 rounded-full bg-emerald-600 text-white font-extrabold text-sm flex items-center justify-center mx-auto shadow-sm">
                5
              </span>
              <h4 className="font-bold text-slate-900 text-sm">Go Live!</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Mark QR gate attendance, issue GST fee receipts, and grade examination marks.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 6. SAAS PRICING MATRIX */}
      {/* ------------------------------------------------------------- */}
      <section id="pricing" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
            <span>Simple, Predictable Plans</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Built For Single Campuses and Mega Networks
          </h2>
          <p className="text-sm text-slate-600">
            Transparent flat monthly pricing with zero hidden implementation charges.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Starter Plan */}
          <div className="p-8 rounded-3xl bg-white border border-slate-200/90 shadow-sm flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-slate-900 text-xl">Starter Academy</h3>
                <p className="text-xs text-slate-500 mt-1">For single-branch schools and emerging coaching centres.</p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-slate-900">₹1,999</span>
                <span className="text-xs text-slate-500">/ month</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-700 pt-2 border-t border-slate-100">
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
            <Button
              variant="outline"
              className="w-full text-xs font-bold py-3 rounded-full"
              onClick={() => onNavigate('signup')}
            >
              Choose Starter
            </Button>
          </div>

          {/* Growth Plan (Popular Featured) */}
          <div className="p-8 rounded-3xl bg-white border-2 border-emerald-600 shadow-xl flex flex-col justify-between space-y-6 relative">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-emerald-600 text-white text-[11px] font-extrabold rounded-full shadow-md uppercase tracking-wider">
              Most Popular
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-slate-900 text-xl">Campus Pro</h3>
                <p className="text-xs text-slate-500 mt-1">For established schools and multi-batch academies.</p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-slate-900">₹4,999</span>
                <span className="text-xs text-slate-500">/ month</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-700 pt-2 border-t border-slate-100">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Up to 1,500 Enrolled Students</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Online Fee Payment Gateway (BYOK)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Parent & Student Self-Service Portals</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Transport Fleet & Library Ledger</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Automated WhatsApp Alert Triggers</span>
                </li>
              </ul>
            </div>
            <Button
              variant="primary"
              className="w-full text-xs font-bold py-3 rounded-full bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/25"
              onClick={() => onNavigate('signup')}
            >
              Start 14-Day Free Trial
            </Button>
          </div>

          {/* Enterprise Plan */}
          <div className="p-8 rounded-3xl bg-white border border-slate-200/90 shadow-sm flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-slate-900 text-xl">Institutional Trust</h3>
                <p className="text-xs text-slate-500 mt-1">For large multi-branch school networks & groups.</p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-slate-900">₹9,999</span>
                <span className="text-xs text-slate-500">/ month</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-700 pt-2 border-t border-slate-100">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Unlimited Students & Faculty</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Multi-Campus Branch Switcher</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Hostel & Dining Mess Operations</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Staff Payroll & Biometric Attendance</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Dedicated SLA & Account Manager</span>
                </li>
              </ul>
            </div>
            <Button
              variant="outline"
              className="w-full text-xs font-bold py-3 rounded-full"
              onClick={() => onNavigate('signup')}
            >
              Contact Enterprise
            </Button>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 7. FAQ ACCORDION SECTION */}
      {/* ------------------------------------------------------------- */}
      <section className="py-20 bg-white border-y border-slate-200/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <span>Got Questions?</span>
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 bg-slate-50/50 overflow-hidden transition-all hover:border-slate-300"
              >
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between text-sm sm:text-base font-bold text-slate-900"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${
                      openFaqIndex === idx ? 'rotate-180 text-emerald-600' : ''
                    }`}
                  />
                </button>
                {openFaqIndex === idx && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-200/80 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 8. GLOWING FINAL CALL TO ACTION */}
      {/* ------------------------------------------------------------- */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="relative overflow-hidden p-10 sm:p-16 rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white shadow-2xl space-y-6">
          <div className="relative z-10 space-y-4 max-w-2xl mx-auto">
            <span className="px-3.5 py-1 rounded-full bg-white/20 border border-white/30 text-white text-xs font-bold backdrop-blur-md">
              Start Free Today
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              Ready to modernise your school or coaching academy?
            </h2>
            <p className="text-sm sm:text-base text-emerald-100 leading-relaxed">
              Experience effortless campus operations, automated fee billing, and real-time student tracking in one unified ERP.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => onNavigate('signup')}
                className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-white text-emerald-900 text-sm font-extrabold hover:bg-emerald-50 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-black/10"
              >
                Launch Your Campus Free
              </button>
              <button
                onClick={() => onNavigate('login')}
                className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-emerald-800/80 text-white text-sm font-bold border border-emerald-500/40 hover:bg-emerald-800 transition-all"
              >
                Sign In to Demo Portal
              </button>
            </div>
            <p className="text-xs text-emerald-200 pt-2 font-medium">
              *Instant 14-day setup • Zero credit card required
            </p>
          </div>
        </div>
      </section>

      {/* 9. Footer */}
      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
};
