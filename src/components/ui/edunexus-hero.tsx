import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Building, ArrowRight, CheckCircle2 } from "lucide-react";

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
  title: string;
  subtitle: string;
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
  programs?: ProgramCard[];
  className?: string;
  children?: React.ReactNode;
}

export function EduNexusHero({
  logo,
  navigation = [],
  ctaButton,
  title,
  subtitle,
  primaryAction,
  secondaryAction,
  disclaimer,
  socialProof,
  programs = [],
  className,
  children,
}: EduNexusHeroProps) {
  return (
    <section
      className={cn(
        "relative w-full min-h-screen flex flex-col overflow-hidden",
        className
      )}
      style={{
        background: "linear-gradient(180deg, #EBF5EE 0%, #F5FAF6 45%, #FFFFFF 100%)",
      }}
      role="banner"
      aria-label="EduNexus Hero section"
    >
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-20 flex flex-row justify-between items-center px-6 sm:px-10 lg:px-16"
        style={{
          paddingTop: "24px",
          paddingBottom: "24px",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 cursor-pointer">
          {logo || (
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
                <Building className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-900 text-xl tracking-tight">EduNexus</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  ERP
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="hidden lg:flex flex-row items-center gap-8" aria-label="Main navigation">
          {navigation.map((item, index) => (
            <button
              key={index}
              onClick={item.onClick}
              className="flex flex-row items-center gap-1.5 text-slate-600 hover:text-emerald-800 transition-colors"
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: "15px",
                fontWeight: 500,
              }}
            >
              {item.label}
              {item.hasDropdown && (
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-slate-400">
                  <path
                    d="M4 6L8 10L12 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          ))}
        </nav>

        {/* CTA Button */}
        {ctaButton && (
          <button
            onClick={ctaButton.onClick}
            className="px-6 py-2.5 rounded-full transition-all hover:scale-105 active:scale-95 shadow-xs font-semibold"
            style={{
              background: "#FFFFFF",
              border: "1px solid #d1d5db",
              fontFamily: "Inter, sans-serif",
              fontSize: "15px",
              color: "#0f172a",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
            }}
          >
            {ctaButton.label}
          </button>
        )}
      </motion.header>

      {/* Main Content */}
      {children ? (
        <div className="relative z-10 flex-1 flex items-center justify-center w-full">
          {children}
        </div>
      ) : (
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 pt-6 pb-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex flex-col items-center text-center max-w-4xl"
            style={{ gap: "28px" }}
          >
            {/* Title */}
            <h1
              style={{
                fontFamily: "Inter, sans-serif",
                fontWeight: 800,
                fontSize: "clamp(34px, 5.5vw, 68px)",
                lineHeight: "1.12",
                color: "#0f172a",
                letterSpacing: "-0.025em",
              }}
            >
              {title}
            </h1>

            {/* Subtitle */}
            <p
              style={{
                fontFamily: "Inter, sans-serif",
                fontWeight: 400,
                fontSize: "clamp(16px, 1.8vw, 19px)",
                lineHeight: "1.6",
                color: "#475569",
                maxWidth: "640px",
              }}
            >
              {subtitle}
            </p>

            {/* Action Buttons */}
            {(primaryAction || secondaryAction) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex flex-col sm:flex-row items-center gap-3.5"
              >
                {primaryAction && (
                  <button
                    onClick={primaryAction.onClick}
                    className="flex flex-row items-center gap-2 px-8 py-3.5 rounded-full transition-all hover:scale-105 active:scale-95 shadow-md group"
                    style={{
                      background: "#16a34a",
                      fontFamily: "Inter, sans-serif",
                      fontSize: "17px",
                      fontWeight: 600,
                      color: "#FFFFFF",
                      boxShadow: "0 4px 16px rgba(22, 163, 74, 0.25)",
                    }}
                  >
                    <span>{primaryAction.label}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                )}

                {secondaryAction && (
                  <button
                    onClick={secondaryAction.onClick}
                    className="px-8 py-3.5 rounded-full transition-all hover:scale-105 active:scale-95 bg-white"
                    style={{
                      border: "1px solid #cbd5e1",
                      fontFamily: "Inter, sans-serif",
                      fontSize: "17px",
                      fontWeight: 600,
                      color: "#1e293b",
                    }}
                  >
                    {secondaryAction.label}
                  </button>
                )}
              </motion.div>
            )}

            {/* Disclaimer */}
            {disclaimer && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#64748b",
                }}
              >
                {disclaimer}
              </motion.p>
            )}

            {/* Social Proof */}
            {socialProof && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
                className="flex flex-row items-center gap-3 pt-1"
              >
                <div className="flex flex-row -space-x-2">
                  {socialProof.avatars.map((avatar, index) => (
                    <img
                      key={index}
                      src={avatar}
                      alt={`User ${index + 1}`}
                      className="rounded-full border-2 border-white shadow-xs"
                      style={{
                        width: "38px",
                        height: "38px",
                        objectFit: "cover",
                      }}
                    />
                  ))}
                </div>
                <span
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#334155",
                  }}
                >
                  {socialProof.text}
                </span>
              </motion.div>
            )}
          </motion.div>
        </div>
      )}

      {/* Campus & Operations Cards Infinite Carousel */}
      {programs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="relative z-10 w-full overflow-hidden"
          style={{
            paddingTop: "20px",
            paddingBottom: "50px",
          }}
        >
          {/* Gradient Overlays for smooth edge fade */}
          <div
            className="absolute left-0 top-0 bottom-0 z-10 pointer-events-none"
            style={{
              width: "120px",
              background: "linear-gradient(90deg, #FFFFFF 0%, rgba(255, 255, 255, 0) 100%)",
            }}
          />
          <div
            className="absolute right-0 top-0 bottom-0 z-10 pointer-events-none"
            style={{
              width: "120px",
              background: "linear-gradient(270deg, #FFFFFF 0%, rgba(255, 255, 255, 0) 100%)",
            }}
          />

          {/* Scrolling Container */}
          <motion.div
            className="flex items-center"
            animate={{
              x: [0, -((programs.length * 360) / 2)],
            }}
            transition={{
              x: {
                repeat: Infinity,
                repeatType: "loop",
                duration: programs.length * 4,
                ease: "linear",
              },
            }}
            style={{
              gap: "24px",
              paddingLeft: "24px",
            }}
          >
            {/* Duplicate programs for seamless infinite loop */}
            {[...programs, ...programs].map((program, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.04, y: -8 }}
                transition={{ duration: 0.3 }}
                onClick={program.onClick}
                className="flex-shrink-0 cursor-pointer relative overflow-hidden group"
                style={{
                  width: "340px",
                  height: "460px",
                  borderRadius: "22px",
                  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.12)",
                }}
              >
                {/* Image */}
                <img
                  src={program.image}
                  alt={program.title}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                  className="group-hover:scale-105 transition-transform duration-500"
                />

                {/* Dark Gradient Overlay */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: "linear-gradient(180deg, rgba(15, 23, 42, 0.05) 30%, rgba(15, 23, 42, 0.88) 100%)",
                  }}
                />

                {/* Top Badge if any */}
                {program.badge && (
                  <div className="absolute top-4 left-4">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/90 text-slate-900 shadow-sm backdrop-blur-md">
                      {program.badge}
                    </span>
                  </div>
                )}

                {/* Bottom Content */}
                <div
                  className="absolute bottom-0 left-0 right-0 p-6"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#86efac", // light emerald
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {program.category}
                  </span>
                  <h3
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: "21px",
                      fontWeight: 700,
                      color: "#FFFFFF",
                      lineHeight: "1.25",
                    }}
                  >
                    {program.title}
                  </h3>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      )}
    </section>
  );
}
