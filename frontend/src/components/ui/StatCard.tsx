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
  iconColor = 'emerald',
  subtitle,
  className,
  onClick,
}) => {
  const colorMap = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200/80',
    blue: 'bg-blue-50 text-blue-600 border-blue-200/80',
    purple: 'bg-purple-50 text-purple-600 border-purple-200/80',
    amber: 'bg-amber-50 text-amber-600 border-amber-200/80',
    rose: 'bg-rose-50 text-rose-600 border-rose-200/80',
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all duration-150',
        onClick && 'cursor-pointer',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{value}</h3>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
        <div
          className={cn(
            'p-2.5 rounded-lg border flex items-center justify-center',
            colorMap[iconColor]
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {change && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-1.5 text-xs">
          {trend === 'up' && (
            <span className="flex items-center text-emerald-700 font-semibold">
              <TrendingUp className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              {change}
            </span>
          )}
          {trend === 'down' && (
            <span className="flex items-center text-rose-700 font-semibold">
              <TrendingDown className="w-3.5 h-3.5 mr-1 text-rose-600" />
              {change}
            </span>
          )}
          {trend === 'neutral' && (
            <span className="text-slate-500 font-medium">{change}</span>
          )}
        </div>
      )}
    </div>
  );
};
