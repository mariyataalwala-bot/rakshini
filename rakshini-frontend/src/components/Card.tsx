import type { ReactNode, CSSProperties } from 'react';

interface CardProps {
  title?: string | ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
  style?: CSSProperties;
}

export function Card({ title, icon, children, className = '', action, style }: CardProps) {
  return (
    <div className={`glass-panel flex flex-col p-4 ${className}`} style={style}>
      {(title || icon || action) && (
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-cyber-border/30">
          <div className="flex items-center gap-2 text-lg font-medium text-cyber-textMain">
            {icon && <span className="text-cyber-cyan drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]">{icon}</span>}
            {title}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="flex-1 flex flex-col min-h-0">
        {children}
      </div>
    </div>
  );
}
