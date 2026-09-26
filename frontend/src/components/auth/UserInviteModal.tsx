import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { UserPlus, Copy, Check, Mail, Building, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { UserRole, UserInvitation } from '../../types';

interface UserInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInviteSuccess?: () => void;
}

export const UserInviteModal: React.FC<UserInviteModalProps> = ({ isOpen, onClose, onInviteSuccess }) => {
  const { inviteUser } = useAuth();
  const { branches, getLabel } = useTenant();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('TEACHER');
  const [branchId, setBranchId] = useState(branches[0]?.id || '');
  const [createdInvite, setCreatedInvite] = useState<UserInvitation | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name) return;

    const res = inviteUser(email, name, role, branchId || undefined);
    if (res.success && res.invitation) {
      setCreatedInvite(res.invitation);
      if (onInviteSuccess) onInviteSuccess();
    }
  };

  const handleCopyLink = () => {
    if (!createdInvite) return;
    const link = `${window.location.origin}/#/login?invite=${createdInvite.token}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setEmail('');
    setName('');
    setRole('TEACHER');
    setCreatedInvite(null);
    setCopied(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={createdInvite ? 'Invitation Dispatched' : 'Invite New Team Member'}
      maxWidth="md"
    >
      <div className="space-y-4 py-2">
        {!createdInvite ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-slate-400">
              Dispatches a cryptographically secure single-use invitation token with predefined role & branch privileges.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Dr. Kavita Deshmukh"
                className="w-full px-3.5 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/60"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Institutional Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. kavita.deshmukh@school.edu.in"
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/60"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-sky-500/60"
                >
                  <option value="TEACHER">Teacher / Faculty</option>
                  <option value="ACCOUNTANT">Accountant / Bursar</option>
                  <option value="STAFF">Receptionist / Front Office</option>
                  <option value="PARENT">Parent Portal</option>
                  <option value="TENANT_ADMIN">Co-Administrator</option>
                </select>
              </div>

              {branches.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Branch Context</label>
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-sky-500/60"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" leftIcon={<UserPlus className="w-3.5 h-3.5" />}>
                Generate Invitation
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 text-center py-2">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <div>
              <h4 className="font-bold text-white text-base">Invitation Generated</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Token is valid for 7 days and grants <span className="text-sky-300 font-semibold">{createdInvite.role}</span> permissions.
              </p>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 text-left space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Recipient:</span>
                <span className="text-white font-semibold">{createdInvite.name} ({createdInvite.email})</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Token:</span>
                <code className="text-amber-400 font-mono font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {createdInvite.token}
                </code>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1 justify-center"
                size="sm"
                onClick={handleCopyLink}
                leftIcon={copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              >
                {copied ? 'Link Copied!' : 'Copy Invitation Link'}
              </Button>
              <Button variant="primary" size="sm" onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
