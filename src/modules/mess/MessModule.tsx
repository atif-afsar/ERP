import React, { useState, useMemo } from 'react';
import {
  UtensilsCrossed,
  Coffee,
  Sun,
  Sunset,
  Moon,
  Star,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Building,
  Heart,
  FileText,
  DollarSign,
  X,
  Printer,
  ChevronRight,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storageService';
import {
  HostelMess,
  MessMealPlan,
  StudentMessSubscription,
  MessDailyMenu,
  MealConsumptionRecord,
  MessFeedback,
  DietaryPreference,
  MealType,
} from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Tabs } from '../../components/ui/Tabs';

export const MessModule: React.FC = () => {
  const { currentTenant, isSchool, isCoaching } = useTenant();
  const { currentUser } = useAuth();

  // Primary State
  const [messes, setMesses] = useState<HostelMess[]>(() =>
    storage.getHostelMesses(currentTenant.id)
  );
  const [plans, setPlans] = useState<MessMealPlan[]>(() =>
    storage.getMessMealPlans(currentTenant.id)
  );
  const [subscriptions, setSubscriptions] = useState<StudentMessSubscription[]>(() =>
    storage.getMessSubscriptions(currentTenant.id)
  );
  const [menus, setMenus] = useState<MessDailyMenu[]>(() =>
    storage.getMessMenus(currentTenant.id)
  );
  const [consumptions, setConsumptions] = useState<MealConsumptionRecord[]>(() =>
    storage.getMealConsumptions(currentTenant.id)
  );
  const [feedback, setFeedback] = useState<MessFeedback[]>(() =>
    storage.getMessFeedback(currentTenant.id)
  );

  // Aux data
  const students = storage.getStudents(currentTenant.id);

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    'menu' | 'subscriptions' | 'consumption' | 'feedback' | 'kitchen'
  >('menu');

  const [selectedDay, setSelectedDay] = useState<
    'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'
  >('THURSDAY');

  // Modals & Forms
  const [isSubscribeModalOpen, setIsSubscribeModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [subForm, setSubForm] = useState({
    studentId: students[0]?.id || '',
    messId: messes[0]?.id || '',
    planId: plans[0]?.id || '',
    dietaryPreference: 'VEG' as DietaryPreference,
  });

  const [feedbackForm, setFeedbackForm] = useState({
    studentId: students[0]?.id || '',
    mealType: 'LUNCH' as MealType,
    rating: 5,
    category: 'TASTE' as const,
    comment: 'Food was delicious and served piping hot!',
  });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // KPIs
  const totalSubscribers = useMemo(
    () => subscriptions.filter((s) => s.status === 'ACTIVE').length,
    [subscriptions]
  );
  const todayMealsServed = useMemo(
    () => consumptions.reduce((acc, c) => acc + c.totalServed, 0),
    [consumptions]
  );
  const averageRating = useMemo(() => {
    if (!feedback.length) return '4.8';
    const sum = feedback.reduce((acc, f) => acc + f.rating, 0);
    return (sum / feedback.length).toFixed(1);
  }, [feedback]);

  // Current Day's Menu
  const currentMenu = useMemo(() => {
    return (
      menus.find((m) => m.dayOfWeek === selectedDay) || {
        dayOfWeek: selectedDay,
        breakfast: 'Vegetable Upma, Coconut Chutney, Tea / Milk',
        lunch: 'Rajma Rasila, Steamed Rice, Phulkas, Mixed Salad & Raita',
        snacks: 'Aloo Samosa with Mint Chutney, Tea',
        dinner: 'Paneer Makhani, Dal Tadka, Jeera Rice, Tawa Roti, Gulab Jamun',
        specialNote: 'Standard institutional mess menu',
      }
    );
  }, [menus, selectedDay]);

  // 1. Subscribe Student to Meal Plan
  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find((s) => s.id === subForm.studentId);
    const plan = plans.find((p) => p.id === subForm.planId) || plans[0];
    const mess = messes.find((m) => m.id === subForm.messId) || messes[0];
    if (!student) return;

    const studentFullName = `${student.firstName} ${student.lastName}`;

    const newSub: StudentMessSubscription = {
      id: `sub-${Date.now()}`,
      tenantId: currentTenant.id,
      studentId: student.id,
      studentName: studentFullName,
      admissionNo: student.admissionNo,
      messId: mess.id,
      planId: plan.id,
      planName: plan.name,
      dietaryPreference: subForm.dietaryPreference,
      monthlyRate: plan.monthlyRate,
      status: 'ACTIVE',
    };

    storage.saveMessSubscription(newSub);
    setSubscriptions(storage.getMessSubscriptions(currentTenant.id));
    setIsSubscribeModalOpen(false);

    storage.saveAuditLog({
      id: `audit_${Date.now()}`,
      tenantId: currentTenant.id,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'MESS_SUBSCRIPTION',
      category: 'MESS',
      entityType: 'MESS_SUBSCRIPTION',
      entityId: newSub.id,
      details: `Subscribed ${studentFullName} to ${plan.name} (${subForm.dietaryPreference}). Fee: ₹${plan.monthlyRate}/mo.`,
      timestamp: new Date().toISOString(),
      status: 'SUCCESS',
    });

    showToast(`Subscribed ${studentFullName} to ${plan.name}.`);
  };

  // 2. Token Check-in for Meal
  const handleTokenCheckIn = (consumptionId: string) => {
    const record = consumptions.find((c) => c.id === consumptionId);
    if (!record) return;

    const updatedRecord: MealConsumptionRecord = {
      ...record,
      totalServed: record.totalServed + 1,
      status: 'SERVING',
    };

    storage.recordMealConsumption(updatedRecord);
    setConsumptions(storage.getMealConsumptions(currentTenant.id));
    showToast(`Dining token checked-in for ${record.mealType}! Total served: ${updatedRecord.totalServed}.`);
  };

  // 3. Submit Feedback
  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find((s) => s.id === feedbackForm.studentId);
    if (!student) return;

    const studentFullName = `${student.firstName} ${student.lastName}`;

    const fb: MessFeedback = {
      id: `fb-${Date.now()}`,
      tenantId: currentTenant.id,
      studentId: student.id,
      studentName: studentFullName,
      date: new Date().toISOString().split('T')[0],
      mealType: feedbackForm.mealType,
      rating: Number(feedbackForm.rating),
      comment: feedbackForm.comment,
      category: feedbackForm.category,
      status: 'REVIEWED',
    };

    storage.saveMessFeedback(fb);
    setFeedback(storage.getMessFeedback(currentTenant.id));
    setIsFeedbackModalOpen(false);
    showToast(`Meal quality rating recorded (${fb.rating}★).`);
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
        <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-orange-500/20 to-amber-600/20 border border-orange-500/30 text-orange-400 shadow-md shadow-orange-500/10">
                <UtensilsCrossed className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  Hostel Mess & Dining Management
                  <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-300">
                    Doc 60 Canonical
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Dining halls, 7-day rotating weekly menus, subscription meal plans (Veg/Non-Veg/Jain), and meal token check-ins.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Star className="w-4 h-4 text-amber-400" />}
              onClick={() => setIsFeedbackModalOpen(true)}
            >
              Rate Today's Meal
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsSubscribeModalOpen(true)}
              className="bg-orange-600 hover:bg-orange-500 shadow-lg shadow-orange-950/20"
            >
              Subscribe Student to Mess
            </Button>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="mt-6 pt-4 border-t border-slate-800/80">
          <Tabs
            activeTab={activeTab}
            onChange={(tab: any) => setActiveTab(tab)}
            tabs={[
              { id: 'menu', label: '7-Day Weekly Menu Board' },
              { id: 'subscriptions', label: 'Meal Plans & Subscriptions', count: subscriptions.length },
              { id: 'consumption', label: 'Dining Token Attendance', count: consumptions.length },
              { id: 'feedback', label: 'Quality Ratings & Feedback', count: feedback.length },
              { id: 'kitchen', label: 'Kitchen Pantry Supplies' },
            ]}
          />
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Dining Halls</span>
          <h3 className="text-2xl font-black text-white font-mono">{messes.length} Facilities</h3>
          <p className="text-[11px] text-slate-400">Total capacity: 270 seats</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-orange-400 uppercase tracking-wider block">Meal Subscribers</span>
          <h3 className="text-2xl font-black text-orange-400 font-mono">{totalSubscribers} Students</h3>
          <p className="text-[11px] text-slate-400">Boarding resident meal plans</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block">Today's Meals Served</span>
          <h3 className="text-2xl font-black text-emerald-400 font-mono">{todayMealsServed} Meals</h3>
          <p className="text-[11px] text-slate-400">Breakfast & lunch served today</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider block">Quality Rating</span>
          <h3 className="text-2xl font-black text-amber-400 font-mono flex items-center gap-1">
            <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
            {averageRating} / 5.0
          </h3>
          <p className="text-[11px] text-slate-400">{feedback.length} Student reviews received</p>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: 7-DAY WEEKLY MENU BOARD */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'menu' && (
        <div className="space-y-6">
          {/* Day of Week Selector */}
          <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-slate-900/80 border border-slate-800">
            {(
              ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const
            ).map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedDay === day
                    ? 'bg-orange-500 text-slate-950 shadow-md shadow-orange-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {day}
              </button>
            ))}
          </div>

          {/* 4 Meal Windows */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Breakfast */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Coffee className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Breakfast Window</h4>
                    <span className="text-[11px] font-mono text-slate-400">07:00 AM – 08:30 AM</span>
                  </div>
                </div>
                <Badge variant="amber">MORNING</Badge>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">{currentMenu.breakfast}</p>
            </div>

            {/* Lunch */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                    <Sun className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Lunch Window</h4>
                    <span className="text-[11px] font-mono text-slate-400">12:30 PM – 02:00 PM</span>
                  </div>
                </div>
                <Badge variant="emerald">AFTERNOON</Badge>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">{currentMenu.lunch}</p>
            </div>

            {/* Evening Snacks */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Sunset className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">High Tea & Snacks</h4>
                    <span className="text-[11px] font-mono text-slate-400">05:00 PM – 06:00 PM</span>
                  </div>
                </div>
                <Badge variant="purple">EVENING</Badge>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">{currentMenu.snacks}</p>
            </div>

            {/* Dinner */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <Moon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Dinner Feast Window</h4>
                    <span className="text-[11px] font-mono text-slate-400">07:45 PM – 09:15 PM</span>
                  </div>
                </div>
                <Badge variant="blue">NIGHT</Badge>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">{currentMenu.dinner}</p>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: MEAL PLANS & SUBSCRIPTIONS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white">Student Mess Subscriptions</h3>
              <p className="text-xs text-slate-400">
                Boarding residents meal plans with dietary tags (Veg, Non-Veg, Jain).
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsSubscribeModalOpen(true)}
              className="bg-orange-600 hover:bg-orange-500"
            >
              Subscribe Student
            </Button>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Meal Plan</th>
                    <th className="py-3 px-4 text-center">Dietary Preference</th>
                    <th className="py-3 px-4 text-center">Monthly Rate</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {subscriptions.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-bold text-white">
                        {s.studentName}
                        <span className="font-mono text-slate-400 text-[11px] block">{s.admissionNo}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-medium">{s.planName}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant={
                            s.dietaryPreference === 'NON_VEG'
                              ? 'rose'
                              : s.dietaryPreference === 'JAIN'
                              ? 'amber'
                              : 'emerald'
                          }
                        >
                          {s.dietaryPreference}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-emerald-400">
                        ₹{s.monthlyRate.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={s.status === 'ACTIVE' ? 'emerald' : 'slate'}>{s.status}</Badge>
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
      {/* TAB 3: DINING TOKEN ATTENDANCE */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'consumption' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white">Dining Hall Token Check-In & Headcount</h3>
              <p className="text-xs text-slate-400">
                Track meal attendance and food consumption count at dining hall entrance counters.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {consumptions.map((c) => (
              <div key={c.id} className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-white text-base">{c.mealType} Service</h4>
                    <span className="font-mono text-xs text-slate-400">{c.date}</span>
                  </div>
                  <Badge variant={c.status === 'COMPLETED' ? 'slate' : 'emerald'}>{c.status}</Badge>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Expected:</span>
                    <span className="font-mono font-bold text-white">{c.totalExpected} Students</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Actual Served:</span>
                    <span className="font-mono font-bold text-emerald-400">{c.totalServed} Plates</span>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  className="w-full bg-orange-600 hover:bg-orange-500 text-xs"
                  onClick={() => handleTokenCheckIn(c.id)}
                >
                  Scan Student Token (+1)
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: QUALITY RATINGS & FEEDBACK */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'feedback' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white">Student Food Quality Ratings</h3>
              <p className="text-xs text-slate-400">
                Direct student reviews on taste, hygiene, temperature, and quantity reviewed by Mess Committee.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsFeedbackModalOpen(true)}
            >
              Submit Review
            </Button>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Meal</th>
                    <th className="py-3 px-4 text-center">Rating</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Student Comment</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {feedback.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-bold text-white">{f.studentName}</td>
                      <td className="py-3 px-4 font-mono text-slate-300">{f.mealType}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-mono font-bold text-amber-400 flex items-center justify-center gap-1">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          {f.rating}.0
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="purple">{f.category}</Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{f.comment}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant="emerald">{f.status}</Badge>
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
      {/* TAB 5: KITCHEN PANTRY SUPPLIES */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'kitchen' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-orange-400" />
              Direct Kitchen Inventory Integration (Document 56)
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Mess kitchen inventory is automatically linked with the Institutional Inventory & Consumable Ledger. Requisitions for Basmati Rice, Atta, Edible Oil, and Fresh Dairy deduct from the Central Warehouse.
            </p>
            <div className="pt-2">
              <Badge variant="emerald">Integrated with Inventory Module</Badge>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: SUBSCRIBE TO MESS */}
      {/* ------------------------------------------------------------- */}
      <Modal isOpen={isSubscribeModalOpen} onClose={() => setIsSubscribeModalOpen(false)} title="Subscribe Student to Hostel Mess">
        <form onSubmit={handleSubscribe} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Select Student</label>
            <select
              value={subForm.studentId}
              onChange={(e) => setSubForm({ ...subForm, studentId: e.target.value })}
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
              <label className="block font-semibold text-slate-300 mb-1">Mess Hall</label>
              <select
                value={subForm.messId}
                onChange={(e) => setSubForm({ ...subForm, messId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              >
                {messes.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Meal Plan</label>
              <select
                value={subForm.planId}
                onChange={(e) => setSubForm({ ...subForm, planId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (₹{p.monthlyRate}/mo)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Dietary Preference</label>
            <select
              value={subForm.dietaryPreference}
              onChange={(e: any) => setSubForm({ ...subForm, dietaryPreference: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
            >
              <option value="VEG">Vegetarian (Standard)</option>
              <option value="NON_VEG">Non-Vegetarian Included</option>
              <option value="JAIN">Pure Jain (No Onion/Garlic/Root veg)</option>
            </select>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsSubscribeModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" className="bg-orange-600 hover:bg-orange-500">
              Confirm Subscription
            </Button>
          </div>
        </form>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: SUBMIT FEEDBACK */}
      {/* ------------------------------------------------------------- */}
      <Modal isOpen={isFeedbackModalOpen} onClose={() => setIsFeedbackModalOpen(false)} title="Submit Meal Quality Feedback">
        <form onSubmit={handleSubmitFeedback} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Select Student</label>
              <select
                value={feedbackForm.studentId}
                onChange={(e) => setFeedbackForm({ ...feedbackForm, studentId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName} ({s.admissionNo})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Meal Service</label>
              <select
                value={feedbackForm.mealType}
                onChange={(e: any) => setFeedbackForm({ ...feedbackForm, mealType: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              >
                <option value="BREAKFAST">Breakfast</option>
                <option value="LUNCH">Lunch</option>
                <option value="SNACKS">Evening Snacks</option>
                <option value="DINNER">Dinner</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Quality Rating</label>
              <select
                value={feedbackForm.rating}
                onChange={(e) => setFeedbackForm({ ...feedbackForm, rating: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              >
                <option value={5}>⭐⭐⭐⭐⭐ (5 - Excellent)</option>
                <option value={4}>⭐⭐⭐⭐ (4 - Very Good)</option>
                <option value={3}>⭐⭐⭐ (3 - Average)</option>
                <option value={2}>⭐⭐ (2 - Needs Improvement)</option>
                <option value={1}>⭐ (1 - Poor)</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Review Category</label>
              <select
                value={feedbackForm.category}
                onChange={(e: any) => setFeedbackForm({ ...feedbackForm, category: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              >
                <option value="TASTE">Taste & Flavor</option>
                <option value="HYGIENE">Cleanliness & Hygiene</option>
                <option value="PORTION">Quantity / Portion Size</option>
                <option value="TEMPERATURE">Food Temperature</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Comments & Suggestions</label>
            <textarea
              required
              rows={2}
              value={feedbackForm.comment}
              onChange={(e) => setFeedbackForm({ ...feedbackForm, comment: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsFeedbackModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" className="bg-orange-600 hover:bg-orange-500">
              Submit Review
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
