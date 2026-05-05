import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Board } from './pages/Board';
import { ProjectCreation } from './pages/ProjectCreation';
import { Team } from './pages/Team';

function App() {
  const dummyCapacities = [
    { user_id: '123e4567', total_assigned_days: 14 }
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a1128] bg-gradient-to-br from-[#0a1128] via-[#0b1c3c] to-[#0a1128]">
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-400 via-transparent to-transparent pointer-events-none"></div>
      <Sidebar capacities={dummyCapacities} />
      <main className="flex-1 overflow-auto p-6 relative z-10">
        <Routes>
          <Route path="/" element={<Board />} />
          <Route path="/new" element={<ProjectCreation onProjectCreated={() => {}} />} />
          <Route path="/team" element={<Team />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
