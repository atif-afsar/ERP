import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  Plus,
  Phone,
  Mail,
  Calendar,
  Sparkles,
  DollarSign,
  ArrowRight,
  CheckCircle,
  GraduationCap,
  Check,
  Building
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { storage } from '../../services/storageService';
import { crmService, CrmLead } from '../../services/crmService';
import { LeadCRM, LeadStatus } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';

export const CrmModule: React.FC = () => {
  const { currentTenant, isSchool, isCoaching } = useTenant();
  const [leads, setLeads] = useState<LeadCRM[]>(() => storage.getLeads(currentTenant.id));
  const [loading, setLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    studentName: '',
    parentName: '',
    email: '',
    phone: '',
    interestedClass: isSchool ? 'Class 9' : 'JEE Advanced Batch',
    source: 'Walk-in Inquiry',
    notes: ''
  });

  const stages: { key: LeadStatus; label: string; color: string }[] = [
    { key: 'NEW', label: 'New Inquiry', color: 'border-blue-500/30 text-blue-400' },
    { key: 'CONTACTED', label: 'Contacted', color: 'border-amber-500/30 text-amber-400' },
    { key: 'DEMO_SCHEDULED', label: 'Demo / Tour Given', color: 'border-purple-500/30 text-purple-400' },
    { key: 'FOLLOW_UP', label: 'Follow Up', color: 'border-sky-500/30 text-sky-400' },
    { key: 'ENROLLED', label: 'Enrolled / Admitted', color: 'border-emerald-500/30 text-emerald-400' },
  ];

  // Load live leads from backend
  const loadLeads = async () => {
    try {
      setLoading(true);
      const res = await crmService.list(currentTenant.id);
      if (res.data?.data && res.data.data.length > 0) {
        const live: LeadCRM[] = res.data.data.map((l: CrmLead) => ({
          id: l.id,
          studentName: l.studentName,
          parentName: l.parentName,
          phone: l.phone,
          interestedCourseOrClass: l.interestedClass || 'General Admission',
          source: (l.source as any) || 'WALK_IN',
          status: (l.status as LeadStatus) || 'NEW',
          notes: l.notes || '',
          estimatedValue: 45000,
          tenantId: currentTenant.id,
          createdAt: l.createdAt ? l.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
        }));
        setLeads(live);
      }
    } catch {
      // Keep existing storage fallback if offline
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, [currentTenant.id]);

  const handleUpdateStatus = async (lead: LeadCRM, newStatus: LeadStatus) => {
    try {
      await crmService.updateStatus(lead.id, newStatus, undefined, currentTenant.id);
      await loadLeads();
    } catch {
      // Local fallback
      const updated = { ...lead, status: newStatus };
      storage.saveLead(updated);
      setLeads(storage.getLeads(currentTenant.id));
    }
  };

  const handleConvertToStudent = async (lead: LeadCRM) => {
    try {
      setConvertingId(lead.id);
      const res = await crmService.convertToStudent(lead.id, currentTenant.id);
      alert(res.data?.data?.message || `Student successfully admitted!`);
      await loadLeads();
    } catch (err: any) {
      alert(err.message || 'Conversion failed');
    } finally {
      setConvertingId(null);
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.studentName.trim() || !formData.parentName.trim() || !formData.phone.trim()) return;

    try {
      await crmService.create({
        studentName: formData.studentName.trim(),
        parentName: formData.parentName.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim(),
        interestedClass: formData.interestedClass,
        source: formData.source,
        notes: formData.notes.trim() || undefined
      }, currentTenant.id);

      await loadLeads();
    } catch {
      const newLead: LeadCRM = {
        id: `lead-${Date.now()}`,
        tenantId: currentTenant.id,
        studentName: formData.studentName,
        parentName: formData.parentName,
        phone: formData.phone,
        interestedCourseOrClass: formData.interestedClass,
        source: 'WALK_IN',
        status: 'NEW',
        notes: formData.notes,
        estimatedValue: 45000,
        createdAt: new Date().toISOString().split('T')[0]
      };
      storage.saveLead(newLead);
      setLeads(storage.getLeads(currentTenant.id));
    }

    setIsAddModalOpen(false);
    setFormData({
      studentName: '',
      parentName: '',
      email: '',
      phone: '',
      interestedClass: isSchool ? 'Class 9' : 'JEE Advanced Batch',
      source: 'Walk-in Inquiry',
      notes: ''
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>{isSchool ? 'Admission Inquiries & Front Desk' : 'Lead CRM Pipeline'}</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
              Live Relational DB
            </span>
          </h2>
          <p className="text-xs text-slate-500">
            {isSchool
              ? 'Track parent inquiries, school campus tours, and convert prospective leads into active enrolled students with 1 click.'
              : 'Lead pipeline: New Inquiry → Demo Given → Follow Up → Enrolled with 1-click admission.'}
          </p>
        </div>

        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsAddModalOpen(true)}
        >
          New Inquiry / Lead
        </Button>
      </div>

      {/* Kanban Pipeline Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageLeads = leads.filter((l) => l.status === stage.key);

          return (
            <div
              key={stage.key}
              className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3 min-w-[240px]"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className={`text-xs font-bold ${stage.color}`}>{stage.label}</span>
                <Badge variant="slate" size="sm">{stageLeads.length}</Badge>
              </div>

              <div className="space-y-2.5">
                {stageLeads.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic text-center py-6">No inquiries</p>
                ) : (
                  stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2 hover:border-slate-700 transition-all shadow-sm"
                    >
                      <div>
                        <h4 className="font-bold text-white text-xs">{lead.studentName}</h4>
                        <p className="text-[11px] text-slate-400">Parent: {lead.parentName}</p>
                      </div>

                      <div className="space-y-1 text-[11px] text-slate-300">
                        <div className="flex items-center gap-1.5 text-sky-400">
                          <Phone className="w-3 h-3" />
                          <span>{lead.phone}</span>
                        </div>
                        <p className="text-slate-400 truncate">{lead.interestedCourseOrClass}</p>
                      </div>

                      {lead.notes && (
                        <p className="text-[10px] text-slate-400 bg-slate-950 p-1.5 rounded-lg border border-slate-800/80">
                          "{lead.notes}"
                        </p>
                      )}

                      {/* Quick Move Trigger & 1-Click Convert */}
                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-1 text-[10px]">
                        {stage.key !== 'ENROLLED' ? (
                          <button
                            onClick={() => {
                              const nextStageIndex = stages.findIndex((s) => s.key === stage.key) + 1;
                              if (nextStageIndex < stages.length) {
                                handleUpdateStatus(lead, stages[nextStageIndex].key);
                              }
                            }}
                            className="flex items-center gap-1 font-semibold text-sky-400 hover:text-sky-300"
                          >
                            <span>Move Next</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <Check className="w-3 h-3" /> Ready
                          </span>
                        )}

                        <button
                          onClick={() => handleConvertToStudent(lead)}
                          disabled={convertingId === lead.id}
                          className="px-2 py-1 rounded bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 font-bold flex items-center gap-1 transition-colors"
                        >
                          <GraduationCap className="w-3 h-3" />
                          <span>{convertingId === lead.id ? 'Admitting...' : 'Admit Student'}</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: New Inquiry / Lead */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register New Admission Inquiry"
        subtitle="Capture prospective student information, parent contact, and program interest."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateLead} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Student Name *</label>
              <input
                type="text"
                required
                value={formData.studentName}
                onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                placeholder="e.g. Rahul Verma"
                className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Parent / Guardian Name *</label>
              <input
                type="text"
                required
                value={formData.parentName}
                onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                placeholder="e.g. Mr. Sanjay Verma"
                className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Contact Phone *</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g. 9876543210"
                className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Email Address (Optional)</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="parent@example.com"
                className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Interested Grade / Program</label>
              <input
                type="text"
                value={formData.interestedClass}
                onChange={(e) => setFormData({ ...formData, interestedClass: e.target.value })}
                placeholder={isSchool ? 'Class 9th CBSE' : 'JEE Advanced Batch 2027'}
                className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Inquiry Source</label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-sky-500"
              >
                <option value="Walk-in Inquiry">Walk-in Inquiry</option>
                <option value="Website Contact Form">Website Contact Form</option>
                <option value="Phone Call Inquiry">Phone Call Inquiry</option>
                <option value="Referral by Parent">Referral by Parent</option>
                <option value="Social Media Campaign">Social Media Campaign</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Inquiry Notes & Questions</label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Interested in bus route 4, asked about science lab and fee installment options."
              className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-sky-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Inquiry
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
