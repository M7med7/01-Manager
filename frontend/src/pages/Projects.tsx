import React from 'react';
import { useNavigate } from 'react-router-dom';

export const Projects = () => {
  const navigate = useNavigate();
  
  // Mock projects with AI descriptions and progress
  const mockProjects = [
    {
      id: 'proj_1',
      name: 'ZeroOne Manager Redesign',
      description: 'AI-Generated: A comprehensive UI/UX overhaul of the management dashboard to integrate a calendar view, team capacity tracking, and project timeline generation.',
      completion_percentage: 45
    },
    {
      id: 'proj_2',
      name: 'Takamul Platform Backend',
      description: 'AI-Generated: Domain-driven design implementation for the attendance system, including faculty and student endpoints and database schema optimizations.',
      completion_percentage: 80
    }
  ];

  return (
    <div className="h-full flex flex-col text-white">
      <header className="mb-6 flex justify-between items-center bg-[#1e1e1e]/80 backdrop-blur border border-[#2d2d2d] rounded-xl p-4 shadow-lg">
        <h2 className="text-xl font-semibold">Projects</h2>
        <button 
          onClick={() => navigate('/new')}
          className="bg-planner-primary text-white px-4 py-2 rounded shadow hover:bg-blue-700 text-sm font-semibold"
        >
          New Project
        </button>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
          {mockProjects.map(project => (
            <div 
              key={project.id}
              onClick={() => navigate(`/board`)}
              className="bg-[#1e1e1e] p-6 rounded-xl shadow-md border border-[#3d3d3d] cursor-pointer hover:border-[#4d4d4d] hover:bg-[#222222] transition-all group flex flex-col"
            >
              <h3 className="text-lg font-bold text-gray-100 mb-2 group-hover:text-planner-primary transition-colors">
                {project.name}
              </h3>
              
              <p className="text-sm text-gray-400 mb-6 flex-1 line-clamp-3">
                {project.description}
              </p>
              
              <div className="mt-auto">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-gray-300">Completion</span>
                  <span className="text-xs font-bold text-planner-primary">{project.completion_percentage}%</span>
                </div>
                <div className="w-full bg-[#2d2d2d] rounded-full h-2.5">
                  <div 
                    className="bg-planner-primary h-2.5 rounded-full" 
                    style={{ width: `${project.completion_percentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
