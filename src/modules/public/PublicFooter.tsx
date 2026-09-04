import React from 'react';
import { Building, ShieldCheck, CheckCircle } from 'lucide-react';

interface PublicFooterProps {
  onNavigate: (route: string) => void;
}

export const PublicFooter: React.FC<PublicFooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-white border-t border-slate-200 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          {/* Brand Info */}
          <div className="col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
                <Building className="w-5 h-5" />
              </div>
              <span className="font-bold text-slate-900 text-lg tracking-tight">EduNexus ERP</span>
            </div>
            <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
              The unified cloud operating system for forward-thinking schools and competitive coaching academies. Connected academic, financial, and logistical management.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-[11px] text-slate-600 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>PostgreSQL RLS Secured</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-[11px] text-slate-600 font-medium">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Offline First Architecture</span>
              </div>
            </div>
          </div>

          {/* Solutions */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Solutions</h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li>
                <button onClick={() => onNavigate('solutions/school')} className="hover:text-emerald-700 transition-colors">
                  K-12 Schools
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('solutions/coaching-centre')} className="hover:text-emerald-700 transition-colors">
                  Coaching Academies
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('solutions/school')} className="hover:text-emerald-700 transition-colors">
                  Multi-Campus Groups
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('pricing')} className="hover:text-emerald-700 transition-colors">
                  Pricing Plans
                </button>
              </li>
            </ul>
          </div>

          {/* Core Modules */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Modules</h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li>Admissions & Leads CRM</li>
              <li>Attendance & QR Passes</li>
              <li>Fee Invoicing & Payments</li>
              <li>Examinations & Marksheets</li>
              <li>CBSE Report Cards</li>
              <li>Hostel & Dining Mess</li>
            </ul>
          </div>

          {/* Portals & Access */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Portals</h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li>
                <button onClick={() => onNavigate('login')} className="hover:text-emerald-700 transition-colors">
                  Principal / Admin Desk
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('login')} className="hover:text-emerald-700 transition-colors">
                  Teacher Workspace
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('login')} className="hover:text-emerald-700 transition-colors">
                  Parent Portal
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('login')} className="hover:text-emerald-700 transition-colors">
                  Student Portal
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} EduNexus Cloud ERP SaaS. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-slate-800 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-slate-800 cursor-pointer">Terms of Service</span>
            <span className="hover:text-slate-800 cursor-pointer">Security Compliance</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
