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

  let bg = 'bg-slate-800/80';
  let text = 'text-slate-300';
  let border = 'border-slate-700/60';
  let label = status;
  let Icon = Clock;

  switch (normalized) {
    case 'EXECUTED':
      bg = 'bg-emerald-500/10';
      text = 'text-emerald-400';
      border = 'border-emerald-500/30';
      label = 'Executed';
      Icon = CheckCircle2;
      break;

    case 'PENDING':
    case 'OPEN':
      bg = 'bg-amber-500/10';
      text = 'text-amber-400';
      border = 'border-amber-500/30';
      label = 'Pending';
      Icon = Clock;
      break;

    case 'AMO':
      bg = 'bg-indigo-500/10';
      text = 'text-indigo-400';
      border = 'border-indigo-500/30';
      label = 'AMO (Queued)';
      Icon = Moon;
      break;

    case 'PARTIALLY_FILLED':
      bg = 'bg-blue-500/10';
      text = 'text-blue-400';
      border = 'border-blue-500/30';
      label = 'Partially Filled';
      Icon = PieChart;
      break;

    case 'CANCELLED':
      bg = 'bg-slate-800/80';
      text = 'text-slate-400';
      border = 'border-slate-700/60';
      label = 'Cancelled';
      Icon = Ban;
      break;

    case 'REJECTED':
      bg = 'bg-rose-500/10';
      text = 'text-rose-400';
      border = 'border-rose-500/30';
      label = 'Rejected';
      Icon = XCircle;
      break;

    default:
      bg = 'bg-slate-800/80';
      text = 'text-slate-300';
      border = 'border-slate-700/60';
      label = status;
      Icon = AlertTriangle;
      break;
  }

  const sizeClasses = size === 'md' 
    ? 'px-2.5 py-1 text-xs gap-1.5' 
    : 'px-2 py-0.5 text-[11px] gap-1';

  return (
    <span
      className={`inline-flex items-center font-medium font-sans rounded-full border transition-all ${bg} ${text} ${border} ${sizeClasses} ${className}`}
    >
      <Icon className={size === 'md' ? 'w-3.5 h-3.5 shrink-0' : 'w-3 h-3 shrink-0'} />
      <span>{label}</span>
    </span>
  );
}

