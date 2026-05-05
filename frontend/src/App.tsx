import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Board } from './pages/Board';
import { ProjectCreation } from './pages/ProjectCreation';
import { Team } from './pages/Team';
import { Projects } from './pages/Projects';

function App() {
  return (
    <div className="flex h-screen overflow-hidden bg-[#0a1128] bg-gradient-to-br from-[#0a1128] via-[#0b1c3c] to-[#0a1128]">
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-400 via-transparent to-transparent pointer-events-none"></div>

      <Sidebar />
      
      <div className="flex-1 flex flex-col relative z-10">
        {/* Top Logo Bar */}
        <div className="h-16 border-b border-planner-border bg-planner-card/50 backdrop-blur flex items-center justify-center shrink-0">
          <div className="flex items-end text-white">
            <svg width="32" height="32" viewBox="0 0 100 80" fill="currentColor" className="mr-2 text-planner-primary">
              <path d="M 35 10 Q 5 40 35 70 Q 15 40 35 10 Z" />
              <path d="M 52 15 C 72 15 72 65 52 65 C 32 65 32 15 52 15 M 48 22 C 60 22 60 58 48 58 C 42 58 42 22 48 22" fillRule="evenodd" />
              <path d="M 68 25 Q 75 25 78 12 L 78 68 L 70 68 L 70 74 L 96 74 L 96 68 L 88 68 L 88 12 L 68 12 Z" />
            </svg>
            <div className="flex items-baseline leading-none">
              <span className="text-xl font-light tracking-widest text-planner-subtext">ZeroOne</span>
              <span className="text-xs font-bold tracking-widest text-planner-primary uppercase ml-2">Manager</span>
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-auto p-6">
          <Routes>
            <Route path="/" element={<Projects />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/board" element={<Board />} />
            <Route path="/new" element={<ProjectCreation onProjectCreated={() => {}} />} />
            <Route path="/team" element={<Team />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
