import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky';
  subtitle?: React.ReactNode;
}

const colorMap = {
  indigo: {
    bg: 'bg-indigo-50 text-indigo-600',
    border: 'border-indigo-100',
  },
  emerald: {
    bg: 'bg-emerald-50 text-emerald-600',
    border: 'border-emerald-100',
  },
  amber: {
    bg: 'bg-amber-50 text-amber-600',
    border: 'border-amber-100',
  },
  rose: {
    bg: 'bg-rose-50 text-rose-600',
    border: 'border-rose-100',
  },
  sky: {
    bg: 'bg-sky-50 text-sky-600',
    border: 'border-sky-100',
  },
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  color = 'indigo',
  subtitle,
}) => {
  const styles = colorMap[color];
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3.5 rounded-2xl ${styles.bg}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};
