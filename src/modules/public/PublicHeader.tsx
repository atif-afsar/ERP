import React, { useState } from 'react';
import { Building, Menu, X, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface PublicHeaderProps {
  onNavigate: (route: string) => void;
  activeSection?: string;
}

export const PublicHeader: React.FC<PublicHeaderProps> = ({ onNavigate, activeSection }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div 
          onClick={() => onNavigate('')}
          className="flex items-center gap-3 cursor-pointer select-none"
        >
          <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-900 text-lg tracking-tight">EduNexus</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                ERP
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium">School & Coaching Management</p>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-600">
          <button 
            onClick={() => onNavigate('features')} 
            className="hover:text-emerald-700 transition-colors"
          >
            Features
          </button>
          <button 
            onClick={() => onNavigate('solutions/school')} 
            className="hover:text-emerald-700 transition-colors"
          >
            For Schools
          </button>
          <button 
            onClick={() => onNavigate('solutions/coaching-centre')} 
            className="hover:text-emerald-700 transition-colors"
          >
            For Coaching Centres
          </button>
          <button 
            onClick={() => onNavigate('pricing')} 
            className="hover:text-emerald-700 transition-colors"
          >
            Pricing
          </button>
        </nav>

        {/* Action CTAs */}
        <div className="hidden sm:flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('login')}
          >
            Sign In
          </Button>
          <Button
            variant="primary"
            size="sm"
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            onClick={() => onNavigate('signup')}
          >
            Get Started
          </Button>
        </div>

        {/* Mobile Menu Trigger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Slide-down Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 py-4 space-y-3 shadow-lg animate-fade-in">
          <div className="flex flex-col space-y-2 text-sm font-semibold text-slate-700">
            <button 
              onClick={() => { onNavigate('features'); setMobileMenuOpen(false); }}
              className="text-left py-2 px-3 rounded-lg hover:bg-slate-50"
            >
              Features
            </button>
            <button 
              onClick={() => { onNavigate('solutions/school'); setMobileMenuOpen(false); }}
              className="text-left py-2 px-3 rounded-lg hover:bg-slate-50"
            >
              For Schools
            </button>
            <button 
              onClick={() => { onNavigate('solutions/coaching-centre'); setMobileMenuOpen(false); }}
              className="text-left py-2 px-3 rounded-lg hover:bg-slate-50"
            >
              For Coaching Centres
            </button>
            <button 
              onClick={() => { onNavigate('pricing'); setMobileMenuOpen(false); }}
              className="text-left py-2 px-3 rounded-lg hover:bg-slate-50"
            >
              Pricing
            </button>
          </div>
          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            <Button
              variant="outline"
              className="w-full text-xs"
              onClick={() => { onNavigate('login'); setMobileMenuOpen(false); }}
            >
              Sign In to Portal
            </Button>
            <Button
              variant="primary"
              className="w-full text-xs"
              onClick={() => { onNavigate('signup'); setMobileMenuOpen(false); }}
            >
              Create Institution Account
            </Button>
          </div>
        </div>
      )}
    </header>
  );
};
