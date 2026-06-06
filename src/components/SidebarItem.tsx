import React from 'react';
import { cn } from '../lib/utils';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  isCollapsed: boolean;
  onClick: () => void;
}

export function SidebarItem({ icon, label, active, isCollapsed, onClick }: SidebarItemProps) {
  return (
    <button 
      onClick={onClick} 
      className={cn(
        "w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 group relative", 
        active ? "bg-accent text-white shadow-lg" : "text-slate-400 hover:text-white hover:bg-slate-800", 
        isCollapsed ? "justify-center" : "space-x-3"
      )}
    >
      <span className={cn(active ? "text-white" : "text-slate-400 group-hover:text-white")}>{icon}</span>
      {!isCollapsed && <span className="text-sm font-medium">{label}</span>}
    </button>
  );
}
