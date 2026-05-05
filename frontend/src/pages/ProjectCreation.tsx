import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export const ProjectCreation = ({ onProjectCreated }: { onProjectCreated: () => void }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create Project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({ name, description })
        .select()
        .single();

      if (projectError) throw projectError;

      // Trigger AI schedule generation (mock backend call)
      const res = await fetch('http://localhost:5000/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id })
      });

      if (!res.ok) throw new Error('Failed to generate schedule');

      onProjectCreated();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-planner-card p-8 rounded shadow border border-planner-border">
      <h2 className="text-2xl font-semibold text-planner-text mb-6">Create New Project</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-planner-text mb-1">Project Name</label>
          <input
            type="text"
            required
            className="w-full border border-planner-border rounded p-2 focus:outline-none focus:ring-2 focus:ring-planner-primary"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-planner-text mb-1">Description</label>
          <textarea
            required
            rows={4}
            className="w-full border border-planner-border rounded p-2 focus:outline-none focus:ring-2 focus:ring-planner-primary"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the project scope to help the AI generate a schedule..."
          />
        </div>
        
        {/* Placeholder for Team Assignment selection */}
        <div>
          <label className="block text-sm font-medium text-planner-text mb-1">Assign Team Members</label>
          <div className="text-sm text-planner-subtext italic">Select users (mock UI)</div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-planner-primary text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Generating AI Schedule...' : 'Create Project & Generate Schedule'}
        </button>
      </form>
    </div>
  );
};
