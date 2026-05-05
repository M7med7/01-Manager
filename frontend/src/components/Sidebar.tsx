import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, PlusSquare, AlertTriangle } from 'lucide-react';

interface SidebarProps {
  capacities?: any[];
}

export const Sidebar: React.FC<SidebarProps> = ({ capacities = [] }) => {
  const overAllocated = capacities.filter(c => c.total_assigned_days > 10);

  return (
    <div className="w-64 bg-planner-card border-r border-planner-border h-screen flex flex-col">
      <div className="p-6 border-b border-planner-border flex items-center justify-center">
        <div className="flex items-end text-white">
          {/* Logo SVG */}
          <svg width="48" height="48" viewBox="0 0 100 80" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="mr-2">
            {/* Left Crescent */}
            <path d="M 35 10 Q 5 40 35 70 Q 15 40 35 10 Z" />
            
            {/* The Zero (Crescent-like O) */}
            <path d="M 52 15 C 72 15 72 65 52 65 C 32 65 32 15 52 15 M 48 22 C 60 22 60 58 48 58 C 42 58 42 22 48 22" fillRule="evenodd" />
            
            {/* The One with Serif and Base */}
            <path d="M 68 25 Q 75 25 78 12 L 78 68 L 70 68 L 70 74 L 96 74 L 96 68 L 88 68 L 88 12 L 68 12 Z" />
          </svg>
          <div className="flex flex-col leading-none">
            <span className="text-xl font-light tracking-widest text-planner-subtext">ZeroOne</span>
            <span className="text-sm font-bold tracking-widest text-planner-primary uppercase mt-1">Manager</span>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        <NavLink to="/" className={({isActive}) => `flex items-center space-x-2 p-2 rounded ${isActive ? 'bg-planner-primary/20 text-planner-primary' : 'text-planner-text hover:bg-planner-hover'}`}>
          <LayoutDashboard size={20} />
          <span>Board</span>
        </NavLink>
        <NavLink to="/team" className={({isActive}) => `flex items-center space-x-2 p-2 rounded ${isActive ? 'bg-planner-primary/20 text-planner-primary' : 'text-planner-text hover:bg-planner-hover'}`}>
          <Users size={20} />
          <span>Team</span>
        </NavLink>
        <NavLink to="/new" className={({isActive}) => `flex items-center space-x-2 p-2 rounded ${isActive ? 'bg-planner-primary/20 text-planner-primary' : 'text-planner-text hover:bg-planner-hover'}`}>
          <PlusSquare size={20} />
          <span>New Project</span>
        </NavLink>
      </nav>

      {overAllocated.length > 0 && (
        <div className="p-4 bg-red-950/30 border-t border-red-900/50 flex flex-col max-h-48">
          <h3 className="text-sm font-bold text-red-400 flex items-center mb-2 shrink-0">
            <AlertTriangle size={16} className="mr-1" />
            Capacity Warnings
          </h3>
          <ul className="text-xs text-red-300 space-y-1 overflow-y-auto pr-2 custom-scrollbar">
            {overAllocated.map(c => (
              <li key={c.user_id}>User {c.user_id.substring(0, 4)}: {c.total_assigned_days} days</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
