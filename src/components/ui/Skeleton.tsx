import React from 'react';

export function Skeleton({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded bg-max-surface-hover/60 ${className}`}
      {...props}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="fintech-card p-4 space-y-3">
      <div className="flex justify-between items-center">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>
      <Skeleton className="h-7 w-36" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="border-b border-max-border/60">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="py-3 px-3">
          <Skeleton className={`h-3 ${i === 0 ? 'w-24' : 'w-16 ml-auto'}`} />
        </td>
      ))}
    </tr>
  );
}
