import React from 'react';
import { User, CheckCircle2 } from 'lucide-react';

const MOCK_TEAM = [
  {
    id: '1',
    name: 'Abdullah S.',
    role: 'Lead Developer',
    capacity: 85, // percentage
    tasks: ['Database Schema', 'API Backend Setup', 'Supabase Integration'],
    avatar: 'bg-blue-600'
  },
  {
    id: '2',
    name: 'Mohammed A.',
    role: 'Frontend Engineer',
    capacity: 45, // percentage
    tasks: ['UI Implementation (Board)', 'Calendar Grid Fixes'],
    avatar: 'bg-purple-600'
  },
  {
    id: '3',
    name: 'Sarah K.',
    role: 'UX Designer',
    capacity: 100, // percentage
    tasks: ['Figma Prototype', 'Design System', 'User Testing Prep'],
    avatar: 'bg-pink-600'
  }
];

// Simple Circular Progress component
const CircularProgress = ({ percentage }: { percentage: number }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  // Color based on capacity
  const color = percentage > 90 ? '#ef4444' : percentage > 70 ? '#eab308' : '#3b82f6';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg className="transform -rotate-90 w-24 h-24">
        <circle 
          cx="48" cy="48" r={radius} 
          stroke="currentColor" 
          strokeWidth="8" 
          fill="transparent"
          className="text-[#2d2d2d]" 
        />
        <circle 
          cx="48" cy="48" r={radius} 
          stroke={color} 
          strokeWidth="8" 
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-white">{percentage}%</span>
        <span className="text-[10px] text-gray-400 uppercase tracking-wider">Booked</span>
      </div>
    </div>
  );
};

export const Team = () => {
  return (
    <div className="h-full flex flex-col text-white">
      <header className="mb-6 flex justify-between items-center bg-[#1e1e1e]/80 backdrop-blur border border-[#2d2d2d] rounded-xl p-4 shadow-lg">
        <h2 className="text-xl font-semibold">Team Members & Capacity</h2>
      </header>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {MOCK_TEAM.map(member => (
            <div key={member.id} className="bg-[#1e1e1e] rounded-xl border border-[#3d3d3d] p-6 shadow-md flex items-center gap-6 hover:border-[#4d4d4d] transition-colors">
              {/* Left Side: Avatar and Info */}
              <div className="flex flex-col items-center gap-3 w-1/4 shrink-0">
                <div className={`w-16 h-16 rounded-full ${member.avatar} flex items-center justify-center shadow-lg shadow-black/20`}>
                  <User size={32} className="text-white/80" />
                </div>
                <div className="text-center">
                  <h3 className="font-bold text-lg text-gray-100">{member.name}</h3>
                  <p className="text-xs text-planner-primary font-medium">{member.role}</p>
                </div>
              </div>
              
              {/* Middle: Progress Bar */}
              <div className="flex flex-col items-center justify-center shrink-0 border-l border-r border-[#2d2d2d] px-6">
                <CircularProgress percentage={member.capacity} />
              </div>
              
              {/* Right Side: Tasks */}
              <div className="flex-1 flex flex-col min-w-0">
                <h4 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Assigned Tasks</h4>
                <ul className="space-y-2">
                  {member.tasks.map((task, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-200">
                      <CheckCircle2 size={16} className="text-gray-500 shrink-0 mt-0.5" />
                      <span className="truncate">{task}</span>
                    </li>
                  ))}
                  {member.tasks.length === 0 && (
                    <li className="text-sm text-gray-500 italic">No tasks assigned</li>
                  )}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
