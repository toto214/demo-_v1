import React from 'react';
import { cn } from '../lib/utils';

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  trend: string;
  onClick?: () => void;
  isActive?: boolean;
}

export function StatCard({ label, value, icon, trend, onClick, isActive }: StatCardProps) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "bg-white p-6 rounded-2xl border shadow-sm flex items-start justify-between transition-all duration-200 select-none",
        onClick ? "cursor-pointer hover:border-accent/40 hover:shadow-md hover:-translate-y-0.5" : "",
        isActive ? "ring-2 ring-accent border-accent bg-accent/5 shadow-md" : "border-slate-200"
      )}
    >
      <div>
        <p className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">{label}</p>
        <p className="text-2xl font-bold text-primary mb-1">{value}</p>
        <span className={cn(
          "text-[10px] font-bold px-2 py-0.5 rounded-full", 
          trend.includes('+') ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-600"
        )}>
          {trend}
        </span>
      </div>
      <div className={cn("p-3 rounded-xl transition-colors", isActive ? "bg-white text-accent text-accent" : "bg-slate-50")}>
        {icon}
      </div>
    </div>
  );
}
