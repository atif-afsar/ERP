import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Building, ArrowUpRight, Star, Menu, X, ChevronDown, Sparkles } from "lucide-react";

export interface NavigationItem {
  label: string;
  hasDropdown?: boolean;
  onClick?: () => void;
}

export interface ProgramCard {
  image: string;
  category: string;
  title: string;
  badge?: string;
  onClick?: () => void;
}

export interface EduNexusHeroProps {
  logo?: string | React.ReactNode;
  navigation?: NavigationItem[];
  ctaButton?: {
    label: string;
    onClick: () => void;
  };
  badgeText?: string;
  headlinePart1?: string;
  italicWord?: string;
  headlinePart2?: string;
  title?: string;
  subtitle?: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  disclaimer?: string;
  socialProof?: {
    avatars: string[];
    text: string;
  };
  dashboardImage?: string;
  programs?: ProgramCard[];
  className?: string;
  children?: React.ReactNode;
}

export function EduNexusHero({
  logo,
  navigation = [],
  ctaButton,
  badgeText = "AI-Powered Dual Engine Campus ERP",
  headlinePart1 = "Empower Your School & Coaching To",
  italicWord = "Excel",
  headlinePart2 = "Every Day",
  title,
  subtitle = "The unified operating platform built for modern K-12 Schools and Competitive Coaching Academies. Seamlessly manage admissions, QR gate attendance, CBSE report cards, test series ranks, and online fees in one place.",
  primaryAction,
  secondaryAction,
  disclaimer,
  socialProof,
  dashboardImage = "/assets/edunexus_hero_dashboard.jpg",
  className,
  children,
}: EduNexusHeroProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fallback avatars if none provided
  const avatars = socialProof?.avatars || [
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces",
  ];

  return (
    <section
      className={cn(
        "relative w-full overflow-hidden text-slate-900 bg-[#fafcfb]",
        className
      )}
      style={{
        minHeight: "100vh",
        background: `
          radial-gradient(ellipse 65% 55% at 10% 18%, rgba(186, 230, 253, 0.55) 0%, rgba(224, 242, 254, 0.25) 45%, transparent 75%),
          radial-gradient(ellipse 60% 50% at 90% 22%, rgba(254, 215, 170, 0.55) 0%, rgba(254, 243, 199, 0.25) 45%, transparent 75%),
          linear-gradient(180deg, #FFFFFF 0%, #F9FBFA 60%, #F0F5F2 100%)
        `,
      }}
      role="banner"
      aria-label="EduNexus Hero"
    >
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP NAVBAR */}
      {/* ------------------------------------------------------------- */}
      <header className="relative z-30 max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-5 sm:py-6 flex items-center justify-between">
        {/* Brand Logo */}
        <div 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-3 cursor-pointer select-none"
        >
          {logo || (
            <img
              src="/assets/edunexus_logo.png"
              alt="EduNexus ERP - Schools • Academies • Brighter Tomorrows"
              className="h-8 sm:h-10 w-auto object-contain transition-transform hover:scale-102"
            />
          )}
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-[15px] font-medium text-slate-600">
          {navigation.length > 0 ? (
            navigation.map((item, idx) => (
              <button
                key={idx}
                onClick={item.onClick}
                className="flex items-center gap-1 hover:text-slate-900 transition-colors"
              >
                <span>{item.label}</span>
                {item.hasDropdown && <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
              </button>
            ))
          ) : (
            <>
              <button className="font-semibold text-slate-900 hover:text-emerald-700 transition-colors">
                Home
              </button>
              <button className="hover:text-slate-900 transition-colors">Products</button>
              <button className="flex items-center gap-1 hover:text-slate-900 transition-colors">
                <span>Resource</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
              <button className="hover:text-slate-900 transition-colors">Pricing</button>
              <button className="hover:text-slate-900 transition-colors">Company</button>
            </>
          )}
        </nav>

        {/* Desktop Header CTA */}
        <div className="hidden sm:flex items-center gap-3">
          {ctaButton ? (
            <button
              onClick={ctaButton.onClick}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-[14px] font-semibold transition-all hover:scale-105 active:scale-95 shadow-sm shadow-emerald-600/30"
            >
              <span>{ctaButton.label}</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={primaryAction?.onClick}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-[14px] font-semibold transition-all hover:scale-105 active:scale-95 shadow-sm shadow-emerald-600/30"
            >
              <span>Get a Demo</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Mobile Menu Toggle Button */}
        <div className="flex md:hidden items-center gap-2">
          {ctaButton && (
            <button
              onClick={ctaButton.onClick}
              className="px-3.5 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1 shadow-sm"
            >
              <span>{ctaButton.label}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-slate-700 hover:bg-slate-100/80 transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden relative z-30 px-6 py-4 mx-4 rounded-2xl bg-white/95 border border-slate-200/90 shadow-xl backdrop-blur-md space-y-3"
          >
            {navigation.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setMobileMenuOpen(false);
                  item.onClick?.();
                }}
                className="w-full text-left py-2 text-sm font-medium text-slate-700 hover:text-emerald-700 border-b border-slate-100 last:border-0 flex items-center justify-between"
              >
                <span>{item.label}</span>
                {item.hasDropdown && <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
              </button>
            ))}
            {primaryAction && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  primaryAction.onClick();
                }}
                className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-sm"
              >
                <span>{primaryAction.label}</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------------- */}
      {/* 2. HERO BODY */}
      {/* ------------------------------------------------------------- */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-16 flex flex-col items-center text-center">
        {/* Top Badge: ★ New Introduce our new ai features */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 border border-slate-200/90 shadow-xs backdrop-blur-xs mb-6 cursor-pointer hover:border-slate-300 transition-colors"
        >
          <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-[10px] sm:text-[11px] font-bold flex items-center gap-1">
            ★ New
          </span>
          <span className="text-xs sm:text-[13px] font-medium text-slate-700">
            {badgeText}
          </span>
        </motion.div>

        {/* Hero Title with Serif Italic Accent (Ref Image: "Track Your Progress And Thrive Every Day") */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="max-w-4xl font-extrabold text-slate-900 text-4xl sm:text-5xl md:text-6xl lg:text-[68px] tracking-tight leading-[1.12] mb-5"
        >
          {title ? (
            title
          ) : (
            <>
              {headlinePart1} <br className="hidden sm:inline" />
              <span
                style={{
                  fontFamily: "'Newsreader', Georgia, serif",
                  fontStyle: "italic",
                  fontWeight: 500,
                }}
                className="text-slate-800"
              >
                {italicWord}
              </span>{" "}
              {headlinePart2}
            </>
          )}
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="max-w-2xl text-slate-600 text-sm sm:text-base md:text-lg leading-relaxed mb-8 px-2"
        >
          {subtitle}
        </motion.p>

        {/* CTA & Social Proof Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 mb-12 sm:mb-16"
        >
          {/* Primary Button */}
          {primaryAction && (
            <button
              onClick={primaryAction.onClick}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-[15px] sm:text-base font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-emerald-600/30"
            >
              <span>{primaryAction.label}</span>
              <ArrowUpRight className="w-5 h-5" />
            </button>
          )}

          {/* Social Proof (Avatars + 5 Stars + Trusted by 20k+ user) */}
          <div className="flex items-center gap-3">
            {/* Overlapping Avatars */}
            <div className="flex items-center -space-x-2.5">
              {avatars.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`Educator ${i + 1}`}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-white object-cover shadow-2xs"
                />
              ))}
            </div>

            {/* Stars & Text */}
            <div className="text-left">
              <div className="flex items-center gap-0.5 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                ))}
              </div>
              <p className="text-[12px] sm:text-[13px] font-semibold text-slate-700">
                {socialProof?.text || "Trusted by 20k+ user"}
              </p>
            </div>
          </div>
        </motion.div>

        {/* ------------------------------------------------------------- */}
        {/* 3. HERO DASHBOARD SHOWCASE (DESKTOP + MOBILE RESPONSIVE) */}
        {/* ------------------------------------------------------------- */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.4 }}
          className="w-full max-w-5xl mx-auto"
        >
          {/* Elevated Floating Card Container */}
          <div className="relative rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-2 sm:p-3.5 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.12)] transition-transform duration-500 hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.16)]">
            {/* Dashboard Mockup Image */}
            <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-slate-100 bg-white">
              <img
                src={dashboardImage}
                alt="EduNexus ERP Intelligent Campus Dashboard"
                className="w-full h-auto object-cover object-top block"
                loading="eager"
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Children or Additional Slots */}
      {children}
    </section>
  );
}
