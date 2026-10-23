import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Bus,
  Check,
  ChevronDown,
  ClipboardCheck,
  CreditCard,
  GraduationCap,
  LockKeyhole,
  Menu,
  QrCode,
  ReceiptIndianRupee,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { InstituteOnboardingModal } from '../../components/public/InstituteOnboardingModal';
import { PublicAssistantWidget } from '../../components/ai/PublicAssistantWidget';
import { apiClient } from '../../services/api/apiClient';

interface LandingPageProps {
  onNavigate: (route: string) => void;
  subRoute?: string;
  autoOpenPlan?: boolean;
}

const modules = [
  { icon: Users, title: 'Students & families', text: 'Admissions, yearly enrollment, parent and student logins, documents and a searchable student record.' },
  { icon: ClipboardCheck, title: 'Attendance & timetable', text: 'Daily class attendance, a clash-free weekly timetable, and QR check-in for coaching batches.' },
  { icon: ReceiptIndianRupee, title: 'Fees with UPI proof', text: 'Fee plans, installments and concessions. Parents pay by UPI or bank, upload proof, and get a receipt once you approve.' },
  { icon: GraduationCap, title: 'Exams & results', text: 'Exam schedules, teacher marks entry, automatic grades and published report cards.' },
  { icon: BookOpen, title: 'Homework & notices', text: 'Teachers post homework, the office sends notices, and parents see both in their portal.' },
  { icon: Bus, title: 'Reports & control', text: 'Student, attendance, fee and exam reports with CSV export, role-based access and an audit trail.' },
];

type PlanCard = { code: string; name: string; price: number; period: string; description: string; features: string[]; featured?: boolean };

// Shown until /billing/plans answers (or if the API is unreachable). The API is the
// source of truth: the same plans are sold in onboarding and in Subscription.
const FALLBACK_PLANS: PlanCard[] = [
  { code: 'STARTER_MONTHLY', name: 'Starter', price: 1999, period: 'month', description: 'For small schools and coaching centres that want everything in one place on a tight budget.', features: ['Up to 300 active students', 'All modules: admissions, attendance, fees, exams, homework', 'Staff & HR with leave and payroll', 'Parent & student portals', 'AI assistant and email notices'] },
  { code: 'GROWTH_MONTHLY', name: 'Growth', price: 3999, period: 'month', description: 'For growing schools and coaching institutes. Adds QR attendance from student phones for coaching batches.', features: ['Up to 1,000 active students', 'Everything in Starter', 'QR attendance for coaching batches', 'Excel import for students and staff', 'Reports with CSV export'], featured: true },
  { code: 'PRO_MONTHLY', name: 'Pro', price: 6999, period: 'month', description: 'For large schools and multi-batch institutes that want no limits and hands-on help.', features: ['Unlimited students and staff', 'Everything in Growth', 'Assisted data import and setup', 'Priority support'] },
];

const toCard = (p: any): PlanCard => ({
  code: p.code,
  name: p.name,
  price: Number(p.price_amount) / 100,
  period: p.billing_period === 'yearly' ? 'year' : 'month',
  description: p.description || '',
  features: Array.isArray(p.features) ? p.features : [],
  featured: Boolean(p.is_featured),
});

const faqs = [
  {
    q: 'Who is EduNexus built for?',
    a: 'EduNexus is designed for schools and coaching institutes that want one simple system for students, attendance, fees, exams and parent communication.',
  },
  {
    q: 'Can each role see only what it needs?',
    a: 'Yes. Super administrators, school owners, teachers, accountants, staff, parents and students receive role-based access. Tenant and ownership checks are enforced by the backend.',
  },
  {
    q: 'How are fee payments handled?',
    a: 'Schools can publish their bank or UPI details. Parents pay through their preferred banking app, upload proof, and receive a receipt after an authorized administrator verifies the payment.',
  },
  {
    q: 'Can we start with our existing academic structure?',
    a: 'Yes. Set up your academic year, classes, sections and subjects first, then import or admit students and assign teachers.',
  },
  {
    q: 'Does EduNexus support parents and students?',
    a: 'Yes. Linked parent and student accounts see their own attendance, homework, published results and fee status.',
  },
];

const Logo = () => (
  <div className="flex items-center gap-2.5">
    <img src="/logo.png" alt="EduNexus" className="h-8 w-8 rounded-xl bg-white object-contain p-1 shadow-sm" />
    <span className="text-sm font-black tracking-[-0.03em] text-white">EduNexus</span>
  </div>
);

const StatusPill = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-800">
    <Check className="h-3 w-3" /> {children}
  </span>
);

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, subRoute, autoOpenPlan }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [plans, setPlans] = useState<PlanCard[]>(FALLBACK_PLANS);
  useEffect(() => {
    apiClient.request<{ plans: any[] }>('/api/v1/billing/plans')
      .then(r => { if (r.data.plans?.length) setPlans(r.data.plans.map(toCard)); })
      .catch(() => { /* keep the fallback list */ });
  }, []);
  const featuredPlan = plans.find(p => p.featured) || plans[0];
  const choosePlan = (plan: PlanCard) => setOnboardingPlan({ code: plan.code, name: plan.name, price: plan.price, period: plan.period });
  const [onboardingPlan, setOnboardingPlan] = useState<null | { code: string; name: string; price: number; period: string }>(
    autoOpenPlan || subRoute === 'signup' ? { ...FALLBACK_PLANS[1] } : null,
  );

  const scroll = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMenuOpen(false);
  };

  const start = () => choosePlan(featuredPlan);

  return (
    <div className="public-landing min-h-screen overflow-x-hidden bg-[#f8f8f6] font-sans text-[#111827] selection:bg-violet-200 selection:text-slate-950">
      <header className="fixed inset-x-0 top-4 z-50 px-4">
        <div className="landing-dark mx-auto flex max-w-5xl items-center justify-between rounded-2xl border border-white/10 bg-[#10131d]/95 px-4 py-3 text-white shadow-2xl shadow-slate-900/20 backdrop-blur-xl">
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Go to top">
            <Logo />
          </button>
          <nav className="hidden items-center gap-7 text-xs font-semibold text-slate-300 md:flex">
            <button onClick={() => scroll('platform')} className="hover:text-white">Platform</button>
            <button onClick={() => scroll('roles')} className="hover:text-white">For your team</button>
            <button onClick={() => scroll('pricing')} className="hover:text-white">Pricing</button>
            <button onClick={() => scroll('security')} className="hover:text-white">Security</button>
            <button onClick={() => scroll('faq')} className="hover:text-white">FAQ</button>
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            <button onClick={() => onNavigate('login')} className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-black text-white shadow-sm transition-colors hover:border-white/35 hover:bg-white/15">Sign in</button>
            <button onClick={start} className="rounded-xl bg-white px-4 py-2 text-xs font-black text-slate-950 hover:bg-violet-100">Create institute</button>
          </div>
          <button type="button" className="rounded-lg p-2 md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {menuOpen && (
          <div className="mx-auto mt-2 max-w-5xl rounded-2xl border bg-white p-3 shadow-xl md:hidden">
            {['platform', 'roles', 'pricing', 'security', 'faq'].map((item) => (
              <button key={item} onClick={() => scroll(item)} className="block w-full rounded-xl px-3 py-3 text-left text-sm font-bold capitalize hover:bg-slate-50">{item === 'roles' ? 'For your team' : item}</button>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2 border-t pt-3">
              <button onClick={() => onNavigate('login')} className="rounded-xl border px-3 py-3 text-sm font-bold">Sign in</button>
              <button onClick={start} className="rounded-xl bg-slate-950 px-3 py-3 text-sm font-bold text-white">Get started</button>
            </div>
          </div>
        )}
      </header>

      <main>
        <section className="landing-hero relative mx-auto min-h-[760px] max-w-[1480px] overflow-hidden px-4 pb-16 pt-32 sm:px-8 sm:pb-20 sm:pt-36 lg:pt-44">
          <div className="landing-hero-bg absolute inset-x-4 top-20 h-[610px] rounded-[2rem] bg-cover bg-center opacity-95 sm:inset-x-8 sm:top-24 sm:h-[580px] sm:rounded-[2.5rem]" style={{ backgroundImage: "url('/landing-hero-bg.png')" }} />
          <div className="landing-float-card landing-float-card-left absolute left-[8%] top-72 hidden w-48 rotate-[-7deg] rounded-2xl border border-white/80 bg-white/75 p-4 shadow-xl backdrop-blur md:block">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Today</p>
            <p className="mt-3 text-sm font-black">94% attendance</p>
            <div className="mt-3 h-1.5 rounded-full bg-slate-100"><div className="h-full w-[94%] rounded-full bg-emerald-500" /></div>
          </div>
          <div className="landing-float-card landing-float-card-right absolute right-[8%] top-64 hidden w-52 rotate-[6deg] rounded-2xl border border-white/80 bg-white/75 p-4 shadow-xl backdrop-blur md:block">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Payment proof</p>
            <div className="mt-3 flex items-center justify-between"><span className="text-sm font-black">₹12,500</span><span className="rounded-full bg-amber-100 px-2 py-1 text-[9px] font-black text-amber-800">Review</span></div>
          </div>
          <div className="landing-hero-copy relative mx-auto max-w-4xl text-center">
            <div className="mb-6 flex flex-wrap justify-center gap-2">
              <StatusPill>Built for education teams</StatusPill>
              <span className="rounded-full border border-white bg-white/70 px-3 py-1 text-[11px] font-bold text-slate-600">School · Coaching · Multi-campus</span>
            </div>
            <h1 className="text-balance text-[2.7rem] font-black leading-[0.98] tracking-[-0.06em] text-slate-950 min-[390px]:text-5xl sm:text-7xl sm:tracking-[-0.065em] lg:text-[88px]">
              One operating system for{' '}
              <span className="block font-serif font-normal italic tracking-[-0.04em]">your entire institute.</span>
            </h1>
            <p className="mx-auto mt-7 max-w-2xl text-pretty text-base leading-7 text-slate-600 sm:text-lg">
              Bring admissions, academics, attendance, fees, results and campus operations into one clear workspace for every role.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button onClick={start} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-3.5 text-sm font-black text-white shadow-xl hover:-translate-y-0.5 hover:bg-violet-950 sm:w-auto">
                Create your institute <ArrowRight className="h-4 w-4" />
              </button>
              <button onClick={() => onNavigate('login')} className="w-full rounded-xl border border-slate-300 bg-white/80 px-6 py-3.5 text-sm font-black text-slate-900 hover:bg-white sm:w-auto">Open your workspace</button>
            </div>
            <p className="mt-4 text-xs font-medium text-slate-500">Guided setup · Role-based access · Manual bank/UPI payment verification</p>
          </div>
          <div className="landing-product-preview relative mx-auto mt-12 grid max-w-4xl gap-3 rounded-[1.7rem] border border-white bg-white/80 p-2.5 shadow-2xl shadow-violet-200/40 backdrop-blur sm:mt-16 sm:p-3 lg:grid-cols-[1.2fr_.8fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-left">
              <div className="flex items-center justify-between"><div><p className="text-xs font-bold text-slate-400">Operations overview</p><h2 className="mt-1 text-lg font-black">Good morning, Riverdale School</h2></div><span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700">Session active</span></div>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[['1,248', 'Students'], ['94%', 'Attendance'], ['₹8.4L', 'Collected'], ['86', 'Staff']].map(([value, label]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><p className="text-xl font-black">{value}</p><p className="mt-1 text-[10px] font-bold text-slate-500">{label}</p></div>)}
              </div>
              <div className="mt-4 rounded-xl bg-slate-950 p-4 text-white"><div className="flex items-center justify-between"><p className="text-xs font-bold">Fee collection</p><p className="text-[10px] text-slate-400">This session</p></div><div className="mt-4 flex h-24 items-end gap-2">{[35,52,42,68,61,82,76,92].map((h,i)=><div key={i} className="landing-chart-bar flex-1 rounded-t bg-gradient-to-t from-violet-600 to-amber-200" style={{height:`${h}%`, animationDelay: `${420 + i * 75}ms`}} />)}</div></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-2xl border border-slate-200 bg-[#f6f4ff] p-5"><QrCode className="h-6 w-6 text-violet-700"/><p className="mt-4 text-base font-black">Attendance that fits the day</p><p className="mt-2 text-xs leading-5 text-slate-600">Teachers mark the class roster in a minute. Coaching batches can check in by scanning a QR code.</p></div>
              <div className="rounded-2xl border border-slate-200 bg-[#fffbea] p-5"><CreditCard className="h-6 w-6 text-amber-700"/><p className="mt-4 text-base font-black">Payments with human control</p><p className="mt-2 text-xs leading-5 text-slate-600">Review bank or UPI proof before a receipt and accounting entry are created.</p></div>
            </div>
          </div>
        </section>

        <section id="platform" className="bg-white px-5 py-24 sm:px-8 lg:py-32">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-3xl"><p className="text-xs font-black uppercase tracking-[0.2em] text-violet-700">One connected platform</p><h2 className="mt-4 text-4xl font-black tracking-[-0.055em] text-slate-950 sm:text-6xl">Less switching. More clarity for the whole campus.</h2><p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">Each workflow uses the same student, enrollment, staff and academic records—so teams work from one source of truth.</p></div>
            <div className="mt-14 grid gap-px overflow-hidden rounded-3xl border bg-slate-200 md:grid-cols-2 lg:grid-cols-3">
              {modules.map(({icon:Icon,title,text})=><article key={title} className="bg-white p-7 transition-colors hover:bg-[#faf9ff]"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-white"><Icon className="h-5 w-5"/></div><h3 className="mt-8 text-lg font-black">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{text}</p></article>)}
            </div>
          </div>
        </section>

        <section id="roles" className="px-5 py-24 sm:px-8 lg:py-32">
          <div className="mx-auto max-w-6xl">
            <div className="grid items-end gap-8 lg:grid-cols-2"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Designed around people</p><h2 className="mt-4 text-4xl font-black tracking-[-0.055em] sm:text-6xl">A focused workspace for every role.</h2></div><p className="max-w-xl text-base leading-7 text-slate-600">Owners see institutional health. Teachers see assigned work. Accountants see financial operations. Families see only their own information.</p></div>
            <div className="mt-14 grid gap-5 lg:grid-cols-2">
              <div className="rounded-3xl border bg-white p-7 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-xs font-bold text-violet-700">For school leadership</p><h3 className="mt-1 text-2xl font-black">See what needs attention.</h3></div><BarChart3 className="h-7 w-7 text-violet-700"/></div><div className="mt-8 grid grid-cols-3 gap-3">{[['Admissions','24'],['Pending proofs','7'],['Absent today','31']].map(([l,v])=><div key={l} className="rounded-2xl bg-slate-50 p-4"><p className="text-2xl font-black">{v}</p><p className="mt-1 text-[10px] font-bold text-slate-500">{l}</p></div>)}</div><p className="mt-7 text-sm leading-6 text-slate-600">Review activity, approve operational work and follow durable audit history without searching across spreadsheets.</p></div>
              <div className="rounded-3xl border bg-white p-7 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-xs font-bold text-emerald-700">For teachers and families</p><h3 className="mt-1 text-2xl font-black">Only the context that matters.</h3></div><Users className="h-7 w-7 text-emerald-700"/></div><div className="mt-8 space-y-3">{['Teacher: Class 10 · Section A attendance','Parent: linked children, fees and results','Student: own attendance and published results'].map((x,i)=><div key={x} className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-xs font-bold"><span className={`h-2 w-2 rounded-full ${i===0?'bg-violet-500':i===1?'bg-amber-500':'bg-emerald-500'}`}/>{x}</div>)}</div><p className="mt-7 text-sm leading-6 text-slate-600">Role permissions, tenant boundaries and relationship checks keep each portal relevant and private.</p></div>
            </div>
          </div>
        </section>

        <section id="pricing" className="bg-white px-5 py-24 sm:px-8 lg:py-32">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-700">Plans that grow with you</p>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.055em] text-slate-950 sm:text-6xl">Choose the operating depth your institute needs.</h2>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600">Pay through the displayed bank or UPI account and upload proof during onboarding. Access begins after platform verification.</p>
            </div>
            <div className="mx-auto mt-14 grid max-w-5xl items-stretch gap-5 md:grid-cols-3">
              {plans.map((plan) => (
                <article key={plan.code} className={`relative flex flex-col rounded-3xl border p-7 ${plan.featured ? 'border-violet-300 bg-[#f7f4ff] shadow-xl shadow-violet-100' : 'border-slate-200 bg-white'}`}>
                  {plan.featured && <span className="absolute right-5 top-5 rounded-full bg-violet-700 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white">Most popular</span>}
                  <p className="text-sm font-black text-slate-950">{plan.name}</p>
                  <div className="mt-5 flex items-end gap-2"><span className="text-4xl font-black tracking-[-0.05em]">₹{plan.price.toLocaleString('en-IN')}</span><span className="pb-1 text-sm font-semibold text-slate-500">/{plan.period}</span></div>
                  <p className="mt-5 min-h-[72px] text-sm leading-6 text-slate-600">{plan.description}</p>
                  <div className="my-7 h-px bg-slate-200" />
                  <ul className="space-y-3 text-sm font-semibold text-slate-700">
                    {plan.features.map((feature) => <li key={feature} className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span>{feature}</span></li>)}
                  </ul>
                  <button onClick={() => choosePlan(plan)} className={`mt-8 rounded-xl px-5 py-3.5 text-sm font-black ${plan.featured ? 'bg-slate-950 text-white hover:bg-violet-950' : 'border border-slate-300 bg-white text-slate-950 hover:bg-slate-50'}`}>Choose {plan.name}</button>
                </article>
              ))}
            </div>
            <p className="mt-6 text-center text-xs leading-5 text-slate-500">Every plan includes every module. Prices are per institution, not per student. Activation follows payment-proof review.</p>
          </div>
        </section>

        <section id="security" className="landing-dark relative overflow-hidden bg-[#11131c] px-5 py-24 text-white sm:px-8 lg:py-32">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_20%,rgba(124,58,237,.22),transparent_35%),radial-gradient(circle_at_78%_70%,rgba(250,204,21,.13),transparent_32%)]" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[.85fr_1.15fr]">
            <div><span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold text-violet-200"><ShieldCheck className="h-3.5 w-3.5"/>Security built into daily work</span><h2 className="mt-6 text-4xl font-black tracking-[-0.055em] text-white sm:text-6xl" style={{color:'#ffffff'}}>Control access without slowing your team.</h2><p className="mt-6 text-base leading-7 text-slate-300" style={{color:'#cbd5e1'}}>EduNexus checks the signed-in user, institution, role and resource relationship before protected data is returned or changed.</p></div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur sm:p-8"><div className="flex items-center gap-3 border-b border-white/10 pb-5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-400/15"><LockKeyhole className="h-5 w-5 text-violet-200"/></div><div><p className="font-black">Access decision</p><p className="text-xs text-slate-400">Verified on the backend</p></div></div><div className="mt-6 space-y-3">{['Authenticated account','Active institution membership','Role and permission granted','Tenant and ownership scope matched','Action recorded in audit history'].map((x)=><div key={x} className="flex items-center gap-3 rounded-xl border border-white/5 bg-black/10 px-4 py-3 text-sm text-slate-200"><Check className="h-4 w-4 text-emerald-400"/>{x}</div>)}</div></div>
          </div>
        </section>

        <section id="faq" className="bg-white px-5 py-24 sm:px-8 lg:py-32">
          <div className="mx-auto max-w-3xl"><div className="text-center"><p className="text-xs font-black uppercase tracking-[0.2em] text-violet-700">Questions before you begin</p><h2 className="mt-4 text-4xl font-black tracking-[-0.055em] sm:text-5xl">Clear answers, without the sales script.</h2></div><div className="mt-12 divide-y border-y">{faqs.map((faq,i)=><div key={faq.q}><button type="button" className="flex w-full items-center justify-between gap-5 py-5 text-left text-sm font-black sm:text-base" onClick={()=>setFaqOpen(faqOpen===i?null:i)} aria-expanded={faqOpen===i}><span>{faq.q}</span><ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${faqOpen===i?'rotate-180 text-violet-700':''}`}/></button>{faqOpen===i&&<p className="max-w-2xl pb-6 text-sm leading-6 text-slate-600">{faq.a}</p>}</div>)}</div></div>
        </section>

        <section className="relative overflow-hidden px-5 py-24 text-center sm:px-8 lg:py-32"><div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_90%,rgba(196,181,253,.75),transparent_32%),radial-gradient(circle_at_90%_90%,rgba(254,240,138,.7),transparent_34%),linear-gradient(#fff,#faf9ff)]"/><div className="relative mx-auto max-w-3xl"><Sparkles className="mx-auto h-7 w-7 text-violet-700"/><h2 className="mt-6 text-5xl font-black leading-[1] tracking-[-0.06em] sm:text-7xl">Ready for a calmer campus?</h2><p className="mx-auto mt-6 max-w-xl text-base leading-7 text-slate-600">Create your institute, choose a plan and configure your first academic session with a guided setup.</p><div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row"><button onClick={start} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-3.5 text-sm font-black text-white">Create your institute <ArrowRight className="h-4 w-4"/></button><button onClick={() => onNavigate('login')} className="rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-sm font-black">Sign in</button></div></div></section>
      </main>

      <footer className="landing-dark bg-[#0c0f18] px-5 pb-10 pt-16 text-white sm:px-8">
        <div className="mx-auto max-w-6xl"><div className="grid gap-10 border-b border-white/10 pb-12 md:grid-cols-[1.5fr_1fr_1fr]"><div><Logo/><p className="mt-5 max-w-sm text-sm leading-6 text-slate-400">A unified operating system for institutions that want clear academic, financial and campus workflows.</p></div><div><p className="text-xs font-black uppercase tracking-widest text-slate-500">Explore</p><div className="mt-4 space-y-3 text-sm text-slate-300"><button className="block" onClick={()=>scroll('platform')}>Platform</button><button className="block" onClick={()=>scroll('roles')}>For your team</button><button className="block" onClick={()=>scroll('pricing')}>Pricing</button><button className="block" onClick={()=>scroll('security')}>Security</button></div></div><div><p className="text-xs font-black uppercase tracking-widest text-slate-500">Access</p><div className="mt-4 space-y-3 text-sm text-slate-300"><button className="block" onClick={()=>onNavigate('login')}>Sign in</button><button className="block" onClick={start}>Create institute</button><a className="block" href="mailto:contact@edunexus.app">Contact</a></div></div></div><div className="py-12 text-center"><p className="font-serif text-6xl italic tracking-[-0.05em] text-white sm:text-8xl lg:text-[132px]">EduNexus</p></div><div className="flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row"><p>© {new Date().getFullYear()} EduNexus. All rights reserved.</p><p>Built for responsible institutional operations.</p></div></div>
      </footer>

      <PublicAssistantWidget onNavigate={route => route === 'pricing' ? scroll('pricing') : route === 'signup' ? start() : onNavigate('login')} />

      {onboardingPlan && <InstituteOnboardingModal isOpen selectedPlan={onboardingPlan} onClose={()=>setOnboardingPlan(null)} onSuccessLoginRedirect={()=>onNavigate('login')} />}
    </div>
  );
};
