import React, { useState } from 'react';
import {
  Building,
  Plus,
  ShieldCheck,
  CreditCard,
  Settings,
  Users,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { storage } from '../../services/storageService';
import { TenantConfig, TenantType } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';

export const SuperAdminModule: React.FC = () => {
  const { allTenants, createNewTenant, switchTenant, updateCurrentTenant } = useTenant();
  const [tenants, setTenants] = useState<TenantConfig[]>(() => storage.getTenants());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State for Onboarding New Tenant
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    tenantType: 'SCHOOL' as TenantType,
    address: 'New Delhi',
    phone: '+91 99999 11111',
    email: 'contact@institution.edu',
    planName: 'Pro Tier',
  });

  const handleOnboardTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code) return;

    const newId = `tenant-${formData.tenantType.toLowerCase()}-${Date.now()}`;
    const newTenant: TenantConfig = {
      id: newId,
      name: formData.name,
      code: formData.code.toUpperCase(),
      tenantType: formData.tenantType,
      status: 'active',
      logo: 'https://images.unsplash.com/photo-1594608661623-aa0bd3a69d98?w=150&auto=format&fit=crop&q=80',
      primaryColor: formData.tenantType === 'SCHOOL' ? '#0284c7' : '#7c3aed',
      secondaryColor: formData.tenantType === 'SCHOOL' ? '#0369a1' : '#6d28d9',
      accentColor: '#f59e0b',
      address: formData.address,
      phone: formData.phone,
      email: formData.email,
      currency: 'INR',
      currencySymbol: '₹',
      timezone: 'Asia/Kolkata',
      academicYear: '2026-2027',
      planName: formData.planName,
      subscriptionRenewalDate: '2027-04-01',
      labels: formData.tenantType === 'SCHOOL'
        ? {
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
          }
        : {
            group: 'Batch',
            subgroup: 'Track',
            groupPlural: 'Batches',
            student: 'Learner',
            studentPlural: 'Learners',
            staff: 'Faculty',
            staffPlural: 'Faculty',
            admission: 'Enrollment',
            period: 'Course Session',
            exam: 'Test Series',
            examPlural: 'Test Series',
            reportCard: 'Performance Report',
            homework: 'Practice Sheet (DPP)',
            feeStructure: 'Installment Plan',
          },
      features: {
        attendance: true,
        qrAttendance: true,
        fees: true,
        onlinePayments: true,
        exams: true,
        reportCards: formData.tenantType === 'SCHOOL',
        testSeries: formData.tenantType === 'COACHING',
        rankComparison: formData.tenantType === 'COACHING',
        homework: true,
        timetable: true,
        communication: true,
        whatsappAlerts: true,
        inquiryCrm: true,
        certificates: true,
        hrPayroll: false,
        aiAssistant: true,
        aiReportSummary: true,
        transport: false,
        library: false,
        hostel: false,
      },
    };

    createNewTenant(newTenant);
    setTenants(storage.getTenants());
    setIsAddModalOpen(false);
  };

  const handleToggleTenantStatus = (tenant: TenantConfig) => {
    const nextStatus: import('../../types').TenantStatus = tenant.status === 'active' ? 'suspended' : 'active';
    const updated: TenantConfig = { ...tenant, status: nextStatus };
    storage.updateTenant(updated);
    setTenants(storage.getTenants());
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Multi-Tenant SaaS Management
          </h2>
          <p className="text-xs text-slate-400">
            Control onboarding, tenant lifecycle (active/suspended), and subscription provisioning.
          </p>
        </div>

        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsAddModalOpen(true)}
        >
          Onboard New Institution
        </Button>
      </div>

      {/* Tenants Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase font-semibold">
            <tr>
              <th className="px-6 py-4">Institution Name</th>
              <th className="px-6 py-4">Tenant Type</th>
              <th className="px-6 py-4">Plan & Subscription</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {tenants.map((t) => (
              <tr key={t.id} className="hover:bg-slate-850/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <img src={t.logo} alt="" className="w-9 h-9 rounded-xl object-cover" />
                    <div>
                      <p className="font-bold text-white">{t.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">Code: {t.code} • ID: {t.id}</p>
                    </div>
                  </div>
                </td>

                <td className="px-6 py-4">
                  <Badge variant={t.tenantType === 'SCHOOL' ? 'blue' : 'purple'} size="sm">
                    {t.tenantType}
                  </Badge>
                </td>

                <td className="px-6 py-4">
                  <p className="font-semibold text-white">{t.planName}</p>
                  <p className="text-[11px] text-slate-400">Renews: {t.subscriptionRenewalDate}</p>
                </td>

                <td className="px-6 py-4">
                  <Badge variant={t.status === 'active' ? 'emerald' : 'amber'} size="sm" dot>
                    {t.status.toUpperCase()}
                  </Badge>
                </td>

                <td className="px-6 py-4 text-right space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => switchTenant(t.id)}
                  >
                    Enter Tenant
                  </Button>
                  <Button
                    size="sm"
                    variant={t.status === 'active' ? 'danger' : 'success'}
                    onClick={() => handleToggleTenantStatus(t)}
                  >
                    {t.status === 'active' ? 'Suspend' : 'Activate'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal: Onboard Tenant */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Onboard New Educational Institution"
        subtitle="Provision a complete isolated tenant with pre-configured terminology and modules."
        maxWidth="lg"
      >
        <form onSubmit={handleOnboardTenant} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Institution Full Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. St. Xavier International School"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Short Code (Prefix) *</label>
              <input
                type="text"
                required
                maxLength={6}
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g. SXIS"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white uppercase font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Institution Model</label>
              <select
                value={formData.tenantType}
                onChange={(e) => setFormData({ ...formData, tenantType: e.target.value as TenantType })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
              >
                <option value="SCHOOL">K-12 School Model</option>
                <option value="COACHING">Coaching Institute Model</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">SaaS Subscription Plan</label>
            <select
              value={formData.planName}
              onChange={(e) => setFormData({ ...formData, planName: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
            >
              <option value="Starter School Plan">Starter Plan (₹15,000/mo)</option>
              <option value="Pro School SaaS">Pro Plan (₹25,000/mo)</option>
              <option value="Coaching Institute Enterprise">Coaching Enterprise (₹35,000/mo)</option>
            </select>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Provision Tenant
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
