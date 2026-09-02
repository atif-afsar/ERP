import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from './Button';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: LucideIcon;
  iconColor?: 'blue' | 'purple' | 'emerald' | 'amber' | 'rose';
  subtitle?: string;
  className?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  trend = 'neutral',
  icon: Icon,
  iconColor = 'blue',
  subtitle,
  className,
  onClick,
}) => {
  const colorMap = {
    blue: 'from-sky-500/20 to-blue-600/10 text-sky-400 border-sky-500/20',
    purple: 'from-purple-500/20 to-indigo-600/10 text-purple-400 border-purple-500/20',
    emerald: 'from-emerald-500/20 to-teal-600/10 text-emerald-400 border-emerald-500/20',
    amber: 'from-amber-500/20 to-yellow-600/10 text-amber-400 border-amber-500/20',
    rose: 'from-rose-500/20 to-red-600/10 text-rose-400 border-rose-500/20',
  };

  const glowMap = {
    blue: 'group-hover:shadow-sky-500/10',
    purple: 'group-hover:shadow-purple-500/10',
    emerald: 'group-hover:shadow-emerald-500/10',
    amber: 'group-hover:shadow-amber-500/10',
    rose: 'group-hover:shadow-rose-500/10',
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative glass-card p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl',
        glowMap[iconColor],
        onClick && 'cursor-pointer',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-bold text-white tracking-tight">{value}</h3>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
        <div
          className={cn(
            'p-3 rounded-xl bg-gradient-to-br border shadow-inner transition-transform duration-300 group-hover:scale-110',
            colorMap[iconColor]
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {change && (
        <div className="mt-3.5 flex items-center gap-1.5 text-xs">
          {trend === 'up' && (
            <span className="flex items-center text-emerald-400 font-medium">
              <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
              {change}
            </span>
          )}
          {trend === 'down' && (
            <span className="flex items-center text-rose-400 font-medium">
              <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
              {change}
            </span>
          )}
          {trend === 'neutral' && (
            <span className="text-slate-400 font-medium">{change}</span>
          )}
          <span className="text-slate-400">vs last month</span>
        </div>
      )}
    </div>
  );
};
