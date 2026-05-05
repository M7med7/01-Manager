import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { supabase } from '../lib/supabase';
import { MoreHorizontal, Plus, ChevronDown, CheckCircle2 } from 'lucide-react';
import { TaskModal } from '../components/TaskModal';

const INITIAL_COLUMNS = {
  'Infrastructure & DevOps': [
    { id: '1', title: 'Database Schema Design', estimated_days: 2, assigned_tech: ['PostgreSQL', 'Supabase'], assigned_to: 'user1' },
    { id: '2', title: 'API Backend Setup', estimated_days: 3, assigned_tech: ['Node.js', 'Express'], assigned_to: 'user2' }
  ],
  'Bots & Automations': [],
  'Website / Apps': [
    { id: '3', title: 'Hemaa Web Site Prototype', estimated_days: 2, assigned_tech: ['Figma'], assigned_to: 'user1' }
  ],
  'Data & AI': []
};

export const Board = () => {
  const [columns, setColumns] = useState<Record<string, any[]>>(INITIAL_COLUMNS);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  useEffect(() => {
    // Fetch mock/real tasks (implement later)
  }, []);

  const onDragEnd = (result: any) => {
    if (!result.destination) return;

    const { source, destination } = result;

    if (source.droppableId !== destination.droppableId) {
      const sourceCol = [...columns[source.droppableId]];
      const destCol = [...columns[destination.droppableId]];
      const [removed] = sourceCol.splice(source.index, 1);
      
      removed.status = destination.droppableId; // update status locally
      destCol.splice(destination.index, 0, removed);
      
      setColumns({
        ...columns,
        [source.droppableId]: sourceCol,
        [destination.droppableId]: destCol
      });

      // TODO: Update Supabase with new status
    } else {
      const col = [...columns[source.droppableId]];
      const [removed] = col.splice(source.index, 1);
      col.splice(destination.index, 0, removed);
      setColumns({ ...columns, [source.droppableId]: col });
    }
  };

  return (
    <div className="h-full flex flex-col">
      <header className="mb-6 flex justify-between items-center bg-[#1e1e1e]/80 backdrop-blur border border-[#2d2d2d] rounded-xl p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold">AI</div>
          <h2 className="text-xl font-semibold text-white">AI Club Tech Department</h2>
        </div>
        <div className="flex gap-2">
          <button className="bg-planner-primary text-white px-4 py-2 rounded shadow hover:bg-blue-700 text-sm font-semibold">
            Generate AI Schedule
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-x-auto custom-scrollbar">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-6 items-start h-full pb-4">
            {Object.entries(columns).map(([colId, tasks]) => (
              <div key={colId} className="flex flex-col w-[320px] shrink-0">
                <div className="flex items-center justify-between mb-3 px-1 text-white">
                  <h3 className="font-semibold text-[15px]">{colId}</h3>
                  <button className="text-gray-400 hover:text-white">
                    <MoreHorizontal size={18} />
                  </button>
                </div>
                
                <button className="w-full flex items-center gap-2 text-gray-400 bg-[#252525] hover:bg-[#2d2d2d] border border-[#3d3d3d] p-3 rounded-lg mb-3 transition-colors text-sm">
                  <Plus size={16} /> Add task
                </button>

                <Droppable droppableId={colId}>
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={`flex-1 min-h-[200px] rounded-lg transition-colors ${
                        snapshot.isDraggingOver ? 'bg-white/5' : 'bg-transparent'
                      }`}
                    >
                      {tasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => setSelectedTask(task)}
                              className={`mb-3 bg-[#1e1e1e] p-4 rounded-xl shadow-md border border-[#3d3d3d] cursor-pointer hover:border-[#4d4d4d] hover:bg-[#222222] transition-colors group
                                ${snapshot.isDragging ? 'shadow-2xl ring-2 ring-planner-primary z-50' : ''}
                              `}
                            >
                              <div className="flex gap-2 mb-2">
                                <CheckCircle2 size={16} className="text-gray-500 group-hover:text-planner-primary transition-colors mt-0.5 shrink-0" />
                                <p className="text-[15px] font-semibold text-gray-200 leading-snug">{task.title}</p>
                              </div>
                              <p className="text-xs text-gray-400 line-clamp-2 ml-6 mb-3">
                                {task.description || "Click to view task details and comments"}
                              </p>
                              <div className="flex justify-between items-center ml-6 text-xs text-gray-500">
                                <span>{task.estimated_days} days</span>
                                {task.assigned_to && (
                                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold shadow">
                                    {task.assigned_to === 'user1' ? 'AS' : 'MA'}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>

      {selectedTask && (
        <TaskModal task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}
    </div>
  );
};
