import React from 'react';
import { CheckCircle2, Clock, Ban, XCircle, AlertTriangle, Moon, PieChart } from 'lucide-react';

export type OrderStatusType = 'EXECUTED' | 'PENDING' | 'AMO' | 'CANCELLED' | 'REJECTED' | 'PARTIALLY_FILLED' | string;

interface OrderStatusBadgeProps {
  status: OrderStatusType;
  size?: 'sm' | 'md';
  className?: string;
}

export function OrderStatusBadge({ status, size = 'sm', className = '' }: OrderStatusBadgeProps) {
  const normalized = (status || '').toUpperCase();

  let bg = 'bg-slate-900/60';
  let text = 'text-slate-400';
  let border = 'border-max-border';
  let label = status;
  let Icon = Clock;

  switch (normalized) {
    case 'EXECUTED':
      bg = 'bg-emerald-950/40';
      text = 'text-emerald-300';
      border = 'border-emerald-900/50';
      label = 'Executed';
      Icon = CheckCircle2;
      break;

    case 'PENDING':
    case 'OPEN':
      bg = 'bg-amber-950/40';
      text = 'text-amber-300';
      border = 'border-amber-900/50';
      label = 'Pending';
      Icon = Clock;
      break;

    case 'AMO':
      bg = 'bg-blue-950/40';
      text = 'text-blue-300';
      border = 'border-blue-900/50';
      label = 'AMO (Queued)';
      Icon = Moon;
      break;

    case 'PARTIALLY_FILLED':
      bg = 'bg-cyan-950/40';
      text = 'text-cyan-300';
      border = 'border-cyan-900/50';
      label = 'Partially Filled';
      Icon = PieChart;
      break;

    case 'CANCELLED':
      bg = 'bg-slate-900/60';
      text = 'text-slate-400';
      border = 'border-max-border';
      label = 'Cancelled';
      Icon = Ban;
      break;

    case 'REJECTED':
      bg = 'bg-rose-950/40';
      text = 'text-rose-300';
      border = 'border-rose-900/50';
      label = 'Rejected';
      Icon = XCircle;
      break;

    default:
      bg = 'bg-slate-900/60';
      text = 'text-slate-400';
      border = 'border-max-border';
      label = status;
      Icon = AlertTriangle;
      break;
  }

  const sizeClasses = size === 'md' 
    ? 'px-2.5 py-1 text-xs gap-1.5' 
    : 'px-2 py-0.5 text-[10px] gap-1';

  return (
    <span
      className={`inline-flex items-center font-medium font-sans rounded border transition-colors ${bg} ${text} ${border} ${sizeClasses} ${className}`}
    >
      <Icon className={size === 'md' ? 'w-3.5 h-3.5 shrink-0' : 'w-3 h-3 shrink-0'} />
      <span>{label}</span>
    </span>
  );
}

