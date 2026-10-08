import React from 'react';

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`p-8 text-center flex flex-col items-center justify-center rounded bg-max-bg/50 border border-dashed border-max-border ${className}`}>
      {Icon && (
        <div className="w-10 h-10 rounded-full bg-max-surface border border-max-border flex items-center justify-center mb-3 text-max-text-muted">
          <Icon className="w-5 h-5" />
        </div>
      )}
      <h4 className="text-xs font-bold font-mono text-max-text-primary uppercase tracking-wider mb-1">{title}</h4>
      <p className="text-xs text-max-text-secondary max-w-sm mb-4 leading-relaxed">{description}</p>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
