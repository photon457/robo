import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon: LucideIcon;
  colorTheme?: 'emerald' | 'amber' | 'rose' | 'indigo' | 'cyan' | 'slate';
  badgeText?: string;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  unit,
  subtitle,
  icon: Icon,
  colorTheme = 'indigo',
  badgeText,
}) => {
  const themeClasses = {
    emerald: {
      bg: 'from-emerald-500/15 to-teal-500/5',
      border: 'border-emerald-500/30',
      iconBg: 'bg-emerald-500/20 text-emerald-400',
      badge: 'bg-emerald-500/25 text-emerald-300 border-emerald-500/40'
    },
    amber: {
      bg: 'from-amber-500/15 to-yellow-500/5',
      border: 'border-amber-500/30',
      iconBg: 'bg-amber-500/20 text-amber-400',
      badge: 'bg-amber-500/25 text-amber-300 border-amber-500/40'
    },
    rose: {
      bg: 'from-rose-500/15 to-red-500/5',
      border: 'border-rose-500/30',
      iconBg: 'bg-rose-500/20 text-rose-400',
      badge: 'bg-rose-500/25 text-rose-300 border-rose-500/40'
    },
    indigo: {
      bg: 'from-indigo-500/15 to-purple-500/5',
      border: 'border-indigo-500/30',
      iconBg: 'bg-indigo-500/20 text-indigo-400',
      badge: 'bg-indigo-500/25 text-indigo-300 border-indigo-500/40'
    },
    cyan: {
      bg: 'from-cyan-500/15 to-blue-500/5',
      border: 'border-cyan-500/30',
      iconBg: 'bg-cyan-500/20 text-cyan-400',
      badge: 'bg-cyan-500/25 text-cyan-300 border-cyan-500/40'
    },
    slate: {
      bg: 'from-slate-800/80 to-slate-900/60',
      border: 'border-slate-700/60',
      iconBg: 'bg-slate-700/50 text-slate-300',
      badge: 'bg-slate-700/50 text-slate-300 border-slate-600/40'
    },
  };

  const theme = themeClasses[colorTheme];

  return (
    <div className={`
      relative p-7 rounded-2xl bg-gradient-to-br ${theme.bg} border ${theme.border} backdrop-blur-md transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-black/30 group flex flex-col justify-between min-h-[170px]
    `}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-slate-300 uppercase tracking-wider">{title}</span>
        <div className={`p-3 rounded-xl ${theme.iconBg} transition-transform group-hover:scale-110`}>
          <Icon size={26} />
        </div>
      </div>

      <div className="flex items-baseline space-x-2 my-2">
        <span className="text-4xl xl:text-5xl font-black text-white tracking-tight">{value}</span>
        {unit && <span className="text-lg font-bold text-slate-400">{unit}</span>}
      </div>

      <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-700/30">
        {subtitle && <p className="text-sm text-slate-400 font-medium">{subtitle}</p>}
        {badgeText && (
          <span className={`px-3 py-1 text-sm font-bold rounded-full border ${theme.badge}`}>
            {badgeText}
          </span>
        )}
      </div>
    </div>
  );
};
