import React from 'react';
import { cn } from './Button';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className }) => {
  return (
    <div className={cn('flex items-center gap-1.5 p-1 bg-slate-950/60 border border-slate-800 rounded-xl overflow-x-auto no-scrollbar', className)}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-all duration-150 whitespace-nowrap',
              isActive
                ? 'bg-slate-800 text-white shadow-sm border border-slate-700/80 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px] font-semibold',
                  isActive ? 'bg-sky-500/20 text-sky-400' : 'bg-slate-800 text-slate-400'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
