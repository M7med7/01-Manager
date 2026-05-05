import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export const ProjectCreation = ({ onProjectCreated }: { onProjectCreated: () => void }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('4'); // e.g. 4 weeks
  const [headcount, setHeadcount] = useState('3'); // e.g. 3 people
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Mock triggering AI schedule generation directly without inserting to DB first
      // since the DB is not fully set up.
      const res = await fetch('http://localhost:5001/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name,
          description,
          duration: parseInt(duration, 10),
          headcount: parseInt(headcount, 10)
        })
      });

      if (!res.ok) throw new Error('Failed to generate schedule');
      
      onProjectCreated();
      navigate('/board'); // go to board after creating
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-planner-card p-8 rounded shadow border border-planner-border">
      <h2 className="text-2xl font-semibold text-planner-text mb-6">Create New Project</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-planner-text mb-1">Project Name</label>
          <input
            type="text"
            required
            className="w-full bg-[#1e1e1e] text-white border border-[#3d3d3d] rounded p-2 focus:outline-none focus:ring-2 focus:ring-planner-primary"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. ZeroOne App Redesign"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-planner-text mb-1">Project Description</label>
          <textarea
            required
            rows={4}
            className="w-full bg-[#1e1e1e] text-white border border-[#3d3d3d] rounded p-2 focus:outline-none focus:ring-2 focus:ring-planner-primary"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the project scope to help the AI generate a schedule and tech stack..."
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-planner-text mb-1">Expected Duration (Weeks)</label>
            <input
              type="number"
              min="1"
              required
              className="w-full bg-[#1e1e1e] text-white border border-[#3d3d3d] rounded p-2 focus:outline-none focus:ring-2 focus:ring-planner-primary"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-planner-text mb-1">Assigned Headcount (People)</label>
            <input
              type="number"
              min="1"
              required
              className="w-full bg-[#1e1e1e] text-white border border-[#3d3d3d] rounded p-2 focus:outline-none focus:ring-2 focus:ring-planner-primary"
              value={headcount}
              onChange={(e) => setHeadcount(e.target.value)}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-planner-primary text-white py-3 px-4 rounded font-bold hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Generating Timeline & Tech Stack...' : 'Generate Project Plan'}
        </button>
      </form>
    </div>
  );
};
