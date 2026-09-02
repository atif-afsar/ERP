import React, { useState } from 'react';
import {
  MessageSquare,
  Plus,
  Send,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { storage } from '../../services/storageService';
import { Notice } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';

export const CommunicationModule: React.FC = () => {
  const { currentTenant, getLabel } = useTenant();
  const [notices, setNotices] = useState<Notice[]>(() => storage.getNotices(currentTenant.id));
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    audience: 'ALL' as 'ALL' | 'STUDENTS' | 'PARENTS' | 'STAFF',
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
  });

  const [whatsAppPhone, setWhatsAppPhone] = useState('+919833344556');
  const [whatsAppMsg, setWhatsAppMsg] = useState(
    `Dear Parent, attendance for your child has been verified at ${currentTenant.name} at 08:15 AM today. Regards.`
  );

  const handleCreateNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.content) return;

    const newNotice: Notice = {
      id: `not-${Date.now()}`,
      tenantId: currentTenant.id,
      title: formData.title,
      content: formData.content,
      audience: formData.audience,
      priority: formData.priority,
      publishedAt: new Date().toISOString().split('T')[0],
      author: 'Principal / Admin Office',
    };

    storage.saveNotice(newNotice);
    setNotices(storage.getNotices(currentTenant.id));
    setIsAddModalOpen(false);
    setFormData({ title: '', content: '', audience: 'ALL', priority: 'MEDIUM' });
  };

  const handleOpenWhatsAppDeepLink = () => {
    const cleanPhone = whatsAppPhone.replace(/[^0-9]/g, '');
    const encoded = encodeURIComponent(whatsAppMsg);
    window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Communication & WhatsApp Broadcasts
          </h2>
          <p className="text-xs text-slate-400">
            Publish institutional notices and dispatch targeted parent WhatsApp alerts.
          </p>
        </div>

        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsAddModalOpen(true)}
        >
          Publish Notice
        </Button>
      </div>

      {/* Grid: Notices + WhatsApp Trigger Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Notices */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-bold text-white text-base">Broadcast Notice Board</h3>
          <div className="space-y-3">
            {notices.map((notice) => (
              <div
                key={notice.id}
                className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2 hover:border-sky-500/40 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        notice.priority === 'URGENT'
                          ? 'rose'
                          : notice.priority === 'HIGH'
                          ? 'amber'
                          : 'blue'
                      }
                      size="sm"
                    >
                      {notice.priority}
                    </Badge>
                    <span className="text-xs text-slate-400">Target: {notice.audience}</span>
                  </div>
                  <span className="text-xs text-slate-400">{notice.publishedAt}</span>
                </div>

                <h4 className="font-bold text-white text-sm">{notice.title}</h4>
                <p className="text-xs text-slate-300 leading-relaxed">{notice.content}</p>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Published by: {notice.author}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Instant WhatsApp Alert Sender */}
        <div className="glass-panel p-6 rounded-2xl border border-emerald-500/30 space-y-4">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-base">WhatsApp Direct Dispatch</h3>
          </div>
          <p className="text-xs text-slate-300">
            Instant parent alert simulator using official WhatsApp deep-link formatting.
          </p>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Parent WhatsApp Number</label>
              <input
                type="text"
                value={whatsAppPhone}
                onChange={(e) => setWhatsAppPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Message Body</label>
              <textarea
                rows={4}
                value={whatsAppMsg}
                onChange={(e) => setWhatsAppMsg(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
              />
            </div>

            <Button
              variant="success"
              className="w-full"
              leftIcon={<ExternalLink className="w-4 h-4" />}
              onClick={handleOpenWhatsAppDeepLink}
            >
              Send via WhatsApp
            </Button>
          </div>
        </div>
      </div>

      {/* Modal: Publish Notice */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Publish Broadcast Announcement"
        maxWidth="md"
      >
        <form onSubmit={handleCreateNotice} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Announcement Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Pre-Board Examination Schedule Released"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Audience</label>
            <select
              value={formData.audience}
              onChange={(e) => setFormData({ ...formData, audience: e.target.value as any })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
            >
              <option value="ALL">Everyone (All Parents & Students)</option>
              <option value="PARENTS">Parents Only</option>
              <option value="STUDENTS">Students Only</option>
              <option value="STAFF">Teaching Faculty / Staff Only</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Priority</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent Alert</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Notice Content *</label>
            <textarea
              rows={4}
              required
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Enter full notice body..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
            />
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Publish Notice
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
