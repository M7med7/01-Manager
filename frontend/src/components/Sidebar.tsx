import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, PlusSquare } from 'lucide-react';

export const Sidebar: React.FC = () => {
  return (
    <div className="w-64 bg-planner-card border-r border-planner-border h-screen flex flex-col">
      <div className="p-6 border-b border-planner-border flex items-center justify-center">
        <div className="text-planner-subtext font-semibold uppercase tracking-widest text-sm">
          Menu
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        <NavLink to="/projects" className={({isActive}) => `flex items-center space-x-2 p-2 rounded ${isActive ? 'bg-planner-primary/20 text-planner-primary' : 'text-planner-text hover:bg-planner-hover'}`}>
          <LayoutDashboard size={20} />
          <span>Projects</span>
        </NavLink>
        <NavLink to="/board" className={({isActive}) => `flex items-center space-x-2 p-2 rounded ${isActive ? 'bg-planner-primary/20 text-planner-primary' : 'text-planner-text hover:bg-planner-hover'}`}>
          <LayoutDashboard size={20} />
          <span>Board</span>
        </NavLink>
        <NavLink to="/team" className={({isActive}) => `flex items-center space-x-2 p-2 rounded ${isActive ? 'bg-planner-primary/20 text-planner-primary' : 'text-planner-text hover:bg-planner-hover'}`}>
          <Users size={20} />
          <span>Team</span>
        </NavLink>
        <NavLink to="/new" className={({isActive}) => `flex items-center space-x-2 p-2 rounded ${isActive ? 'bg-planner-primary/20 text-planner-primary' : 'text-planner-text hover:bg-planner-hover'}`}>
          <PlusSquare size={20} />
          <span>Create Project</span>
        </NavLink>
      </nav>

    </div>
  );
};
