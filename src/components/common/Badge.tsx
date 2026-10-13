import React from 'react';

export type BadgeVariant =
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'neutral'
  | 'primary';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  danger: 'bg-rose-50 text-rose-700 border-rose-200/60',
  warning: 'bg-amber-50 text-amber-700 border-amber-200/60',
  info: 'bg-sky-50 text-sky-700 border-sky-200/60',
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  primary: 'bg-indigo-50 text-indigo-700 border-indigo-200/60',
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
}) => {
  const sizeStyles = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';
  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border ${sizeStyles} ${variantStyles[variant]}`}
    >
      {children}
    </span>
  );
};
