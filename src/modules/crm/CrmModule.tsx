import React, { useState } from 'react';
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
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { storage } from '../../services/storageService';
import { LeadCRM, LeadStatus } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';

export const CrmModule: React.FC = () => {
  const { currentTenant, isSchool, isCoaching } = useTenant();
  const [leads, setLeads] = useState<LeadCRM[]>(() => storage.getLeads(currentTenant.id));
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const stages: { key: LeadStatus; label: string; color: string }[] = [
    { key: 'NEW', label: 'New Inquiry', color: 'border-blue-500/30 text-blue-400' },
    { key: 'CONTACTED', label: 'Contacted', color: 'border-amber-500/30 text-amber-400' },
    { key: 'DEMO_SCHEDULED', label: 'Demo / Tour Given', color: 'border-purple-500/30 text-purple-400' },
    { key: 'FOLLOW_UP', label: 'Follow Up', color: 'border-sky-500/30 text-sky-400' },
    { key: 'ENROLLED', label: 'Enrolled / Admitted', color: 'border-emerald-500/30 text-emerald-400' },
  ];

  const handleUpdateStatus = (lead: LeadCRM, newStatus: LeadStatus) => {
    const updated = { ...lead, status: newStatus };
    storage.saveLead(updated);
    setLeads(storage.getLeads(currentTenant.id));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {isSchool ? 'Admission Inquiries & Front Desk' : 'Lead CRM Pipeline'}
          </h2>
          <p className="text-xs text-slate-400">
            {isSchool
              ? 'Track parent inquiries, school campus tours, and admission applications.'
              : 'Lead pipeline: New Inquiry → Demo Given → Follow Up → Enrolled.'}
          </p>
        </div>
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
                {stageLeads.map((lead) => (
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

                    {/* Quick Move Trigger */}
                    {stage.key !== 'ENROLLED' && (
                      <div className="pt-2 border-t border-slate-800 flex justify-end">
                        <button
                          onClick={() => {
                            const nextStageIndex = stages.findIndex((s) => s.key === stage.key) + 1;
                            if (nextStageIndex < stages.length) {
                              handleUpdateStatus(lead, stages[nextStageIndex].key);
                            }
                          }}
                          className="flex items-center gap-1 text-[10px] font-semibold text-sky-400 hover:text-sky-300"
                        >
                          <span>Move Next</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
