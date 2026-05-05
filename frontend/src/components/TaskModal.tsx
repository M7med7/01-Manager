import React, { useState } from 'react';
import { X, CheckCircle2, MessageSquare, Paperclip, MoreHorizontal, UserCircle, Tag, AlertTriangle, Bot, Sparkles, Send } from 'lucide-react';

interface TaskModalProps {
  task: any;
  onClose: () => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({ task, onClose }) => {
  const [activeTab, setActiveTab] = useState<'details' | 'chat'>('details');
  const [chatMessage, setChatMessage] = useState('');

  if (!task) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#11131a] border border-[#2d3748] rounded-2xl shadow-2xl w-full max-w-5xl flex h-[80vh] overflow-hidden text-gray-200">
        
        {/* Left Pane - Task Details */}
        <div className="flex-[1.2] flex flex-col overflow-y-auto border-r border-[#2d3748] custom-scrollbar bg-gradient-to-b from-[#11131a] to-[#0a0c10]">
          <header className="p-6 pb-2">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="text-planner-primary mt-1 shrink-0" size={24} />
                <div>
                  <h2 className="text-2xl font-bold text-white leading-tight">{task.title}</h2>
                  <p className="text-xs text-gray-400 mt-1">
                    Completed Mar 1 by ALI SALEH SAEED ALGHAMDI
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 mt-4 text-sm text-gray-400">
              <Tag size={16} />
              <span>Add label</span>
            </div>
            
            {/* Avatars */}
            <div className="flex items-center gap-1 mt-3">
              <UserCircle size={20} className="text-gray-400" />
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs text-white font-bold border border-[#1e1e1e] -ml-1 z-10">
                AS
              </div>
              <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-xs text-white font-bold border border-[#1e1e1e] -ml-1 z-20">
                MA
              </div>
              <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-[10px] text-white font-bold border border-[#1e1e1e] -ml-1 z-30">
                +3
              </div>
            </div>
          </header>

          <div className="px-6 flex gap-2 border-b border-[#2d2d2d]">
            <button className="flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 border-planner-primary text-white">
              <span className="bg-planner-primary text-white p-1 rounded"><CheckCircle2 size={14}/></span>
              Task details
            </button>
            <button className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-400 hover:text-gray-200">
              <Paperclip size={16} />
              Attachments (3)
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2">Status</label>
                <div className="bg-[#2d2d2d] border border-[#3d3d3d] rounded p-2 text-sm flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-planner-primary" />
                    <span>Completed</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2">Priority</label>
                <div className="bg-[#2d2d2d] border border-[#3d3d3d] rounded p-2 text-sm flex items-center justify-between">
                  <div className="flex items-center gap-2 text-red-400">
                    <AlertTriangle size={16} />
                    <span>Urgent</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2">Start date</label>
                <div className="bg-[#2d2d2d] border border-[#3d3d3d] rounded p-2 text-sm text-gray-300">
                  11/04/2025
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2">Due date</label>
                <div className="bg-[#2d2d2d] border border-[#3d3d3d] rounded p-2 text-sm text-gray-300">
                  11/06/2025
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">Notes</label>
              <div className="text-sm text-gray-300 leading-relaxed bg-[#2d2d2d] p-4 rounded min-h-[100px] whitespace-pre-wrap">
                {task.description || "we need the design of the website in figma or whatever software you guys agree on..."}
              </div>
            </div>
          </div>
        </div>

        {/* Right Pane - AI Assistant */}
        <div className="flex-1 bg-[#0a0c10] flex flex-col relative overflow-hidden">
          {/* Subtle AI glow effect */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-[80px] pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600/10 rounded-full blur-[80px] pointer-events-none"></div>

          <header className="p-5 border-b border-[#2d3748] flex items-center justify-between z-10 bg-[#0a0c10]/80 backdrop-blur">
            <div className="flex items-center gap-2 text-planner-primary">
              <Sparkles size={18} />
              <h3 className="font-bold text-sm tracking-wide">01 AI Assistant</h3>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <button onClick={onClose} className="hover:text-white p-1 rounded-full hover:bg-red-500/20 transition-colors"><X size={18} /></button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-center z-10">
             <div className="w-24 h-24 mb-6 relative flex items-center justify-center">
               <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 rounded-full animate-pulse"></div>
               <Bot size={40} className="text-blue-400 relative z-10" />
             </div>
             <h4 className="font-bold text-lg text-white mb-2">How can I help you?</h4>
             <p className="text-sm text-gray-400 px-6 max-w-sm leading-relaxed">
               I can help explain this task, write boilerplate code, or guide you on the best approach for the selected technologies.
             </p>
          </div>

          <div className="p-5 border-t border-[#2d3748] bg-[#0a0c10] z-10">
             <div className="relative flex items-center">
               <input 
                 type="text" 
                 placeholder="Ask the AI about this task..." 
                 className="w-full bg-[#11131a] border border-[#3d4a60] rounded-xl py-3 pl-4 pr-12 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-inner transition-all"
               />
               <button className="absolute right-2 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">
                 <Send size={16} />
               </button>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};
