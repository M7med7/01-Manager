import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Search, Plus } from 'lucide-react';
import { TaskModal } from '../components/TaskModal';

// Mock tasks that span dates
const MOCK_TASKS = [
  { id: '1', title: 'Database Schema', start: 5, end: 7, color: 'bg-red-500' },
  { id: '2', title: 'API Backend Setup', start: 10, end: 12, color: 'bg-blue-500' },
  { id: '3', title: 'Frontend Foundation', start: 18, end: 20, color: 'bg-green-500' },
  { id: '4', title: 'UI Implementation (Board)', start: 24, end: 27, color: 'bg-purple-600' }
];

export const Board = () => {
  const [selectedTask, setSelectedTask] = useState<any>(null);

  // Generate calendar days for May 2026 (starts on Friday)
  const daysInMonth = 31;
  const firstDayOfMonth = 5; // Friday (0=Sun, 1=Mon... 5=Fri)
  
  const calendarCells = [];
  
  // Empty cells for previous month
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarCells.push({ day: 26 + i, isCurrentMonth: false });
  }
  
  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarCells.push({ day: i, isCurrentMonth: true });
  }

  // Fill remaining cells for a 5-row grid (35 cells)
  while (calendarCells.length < 35) {
    calendarCells.push({ day: calendarCells.length - 30, isCurrentMonth: false });
  }

  return (
    <div className="h-full flex flex-col bg-[#111111] text-gray-200 rounded-xl overflow-hidden border border-[#2d2d2d] shadow-2xl">
      {/* Calendar Header */}
      <div className="flex justify-between items-center p-4 border-b border-[#2d2d2d]">
        <div className="flex items-center gap-4">
          <div className="flex space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <div className="flex space-x-2">
            <button className="p-1 text-gray-400 hover:text-white rounded bg-[#1e1e1e] border border-[#3d3d3d]"><ChevronLeft size={16} /></button>
            <button className="p-1 text-gray-400 hover:text-white rounded bg-[#1e1e1e] border border-[#3d3d3d]"><ChevronRight size={16} /></button>
          </div>
        </div>

        <div className="flex bg-[#1e1e1e] rounded-full p-1 border border-[#3d3d3d]">
          <button className="px-4 py-1 text-sm rounded-full text-gray-400 hover:text-white transition-colors">Day</button>
          <button className="px-4 py-1 text-sm rounded-full text-gray-400 hover:text-white transition-colors">Week</button>
          <button className="px-4 py-1 text-sm rounded-full bg-[#333333] text-white shadow-sm">Month</button>
          <button className="px-4 py-1 text-sm rounded-full text-gray-400 hover:text-white transition-colors">Year</button>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 text-gray-400 hover:text-white rounded-full bg-[#1e1e1e] border border-[#3d3d3d]">
            <Search size={16} />
          </button>
          <button className="p-2 text-white rounded-full bg-planner-primary hover:bg-blue-600 border border-blue-500">
            <Plus size={16} />
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center px-6 py-4">
        <h1 className="text-4xl font-bold text-white tracking-tight">May <span className="font-light text-gray-400">2026</span></h1>
        <div className="flex items-center gap-2">
          <button className="p-1 rounded hover:bg-[#222]"><ChevronLeft size={20} /></button>
          <button className="px-4 py-1.5 text-sm bg-[#222] rounded-full font-medium hover:bg-[#333] transition-colors border border-[#3d3d3d]">Today</button>
          <button className="p-1 rounded hover:bg-[#222]"><ChevronRight size={20} /></button>
        </div>
      </div>

      {/* Days of week */}
      <div className="grid grid-cols-7 border-b border-[#2d2d2d]">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="py-2 text-center text-sm font-medium text-gray-400">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 grid grid-cols-7 grid-rows-5 bg-[#181818]">
        {calendarCells.map((cell, i) => {
          // Find tasks that fall on this day
          const dayTasks = cell.isCurrentMonth ? MOCK_TASKS.filter(t => cell.day >= t.start && cell.day <= t.end) : [];
          
          return (
            <div key={i} className={`border-r border-b border-[#2d2d2d] relative p-1 transition-colors hover:bg-[#222] ${!cell.isCurrentMonth ? 'bg-[#111]' : ''}`}>
              <div className={`text-right text-sm p-1 ${!cell.isCurrentMonth ? 'text-[#333]' : 'text-gray-300'} ${cell.day === 5 && cell.isCurrentMonth ? 'text-white' : ''}`}>
                <span className={cell.day === 5 && cell.isCurrentMonth ? 'bg-red-500 rounded-full w-6 h-6 inline-flex items-center justify-center font-bold shadow-md shadow-red-500/30' : ''}>
                  {cell.day}
                  {(i === 5 || i === 31) && cell.isCurrentMonth ? (i === 5 ? ' May' : ' Jun') : ''}
                </span>
              </div>
              
              <div className="mt-1 space-y-1">
                {dayTasks.map(task => {
                  const isStart = cell.day === task.start;
                  const isEnd = cell.day === task.end;
                  
                  return (
                    <div 
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className={`h-5 flex items-center px-2 cursor-pointer transition-transform hover:scale-[1.02] hover:z-10 relative
                        ${task.color} ${isStart ? 'rounded-l-md ml-1' : ''} ${isEnd ? 'rounded-r-md mr-1' : ''}
                        ${!isStart && !isEnd ? 'opacity-80' : 'opacity-100 shadow-sm'}
                      `}
                    >
                      <span className="text-[10px] font-bold text-white truncate drop-shadow-md">
                        {isStart ? task.title : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {selectedTask && (
        <TaskModal task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}
    </div>
  );
};
