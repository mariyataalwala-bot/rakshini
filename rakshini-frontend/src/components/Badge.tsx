import type { ReactNode } from 'react';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  pulse?: boolean;
  className?: string;
}

export function Badge({ children, variant = 'neutral', pulse = false, className = '' }: BadgeProps) {
  const variantStyles = {
    success: 'bg-green-500/20 text-green-400 border border-green-500/30',
    warning: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    danger: 'bg-cyber-neonRed/20 text-cyber-neonRed border border-cyber-neonRed/30 shadow-red-glow',
    info: 'bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/30 shadow-cyan-glow',
    neutral: 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
  };

  const badgeClass = `inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${variantStyles[variant]} ${pulse ? 'animate-pulse' : ''} ${className}`;
  
  return (
    <span className={badgeClass}>
      {children}
    </span>
  );
}
