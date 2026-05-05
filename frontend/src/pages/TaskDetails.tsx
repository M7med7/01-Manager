import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Calendar as CalendarIcon, Paperclip, Send, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { api, type Project, type Task } from "../lib/api";

interface ChatMessage {
  role: "user" | "ai";
  content: string;
}

const AI_SUGGESTIONS = [
  {
    title: "Implementation Steps",
    content: `1. Break project into sprints with clear milestones\n2. Set up CI/CD pipeline early\n3. Implement core features first, then iterate\n4. Write tests alongside the implementation\n5. Do daily standups to track blockers\n6. Document APIs and decisions as you go`,
  },
  {
    title: "Recommended Tech Stack",
    content: `• TypeScript — type safety across the stack\n• React + Vite — fast frontend DX\n• Node.js + Express — lightweight API layer\n• PostgreSQL + Supabase — managed DB with auth\n• Docker — consistent dev/prod environments`,
  },
  {
    title: "Risk Mitigation",
    content: `• Identify blockers early with weekly reviews\n• Allocate 20% buffer time for unknowns\n• Prioritize critical path tasks first\n• Have rollback plans for major changes\n• Involve stakeholders in milestone reviews`,
  },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function computeDeadline(createdAt: string): string {
  const d = new Date(createdAt);
  d.setDate(d.getDate() + 30);
  return formatDate(d.toISOString());
}

export function TaskDetails() {
  const { taskId } = useParams<{ taskId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: "ai", content: "How can I help you with this project?" },
  ]);
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!taskId) return;
    api.projects
      .get(taskId)
      .then(({ project, tasks }) => {
        setProject(project);
        setTasks(tasks);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [taskId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSendMessage = async () => {
    if (!message.trim() || isSending) return;
    const userMsg = message.trim();
    setMessage("");
    setChatMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsSending(true);
    try {
      const { response } = await api.ai.chat({
        message: userMsg,
        context: project?.description,
      });
      setChatMessages((prev) => [...prev, { role: "ai", content: response }]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: "ai", content: "I'm having trouble connecting right now. Please try again." },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-12 flex flex-col items-center justify-center h-full text-center">
        <p className="text-red-400 mb-4">{error ?? "Project not found"}</p>
        <Link to="/" className="text-purple-400 hover:text-purple-300 underline text-sm">
          ← Back to Projects
        </Link>
      </div>
    );
  }

  const doneTasks = tasks.filter((t) => t.status === "Done").length;
  const progress = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0;

  return (
    <div className="p-12 h-full flex gap-8">
      {/* Left Panel */}
      <div className="flex-1 space-y-8 overflow-y-auto">
        <Link to="/">
          <motion.button
            whileHover={{ x: -5 }}
            className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors duration-300 text-lg"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Projects</span>
          </motion.button>
        </Link>

        <div>
          <h2 className="text-5xl mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            {project.name}
          </h2>
          <div className="flex items-center gap-4">
            <span
              className={`px-5 py-2 rounded-full text-base font-semibold ${
                project.status === "Completed"
                  ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-xl shadow-green-500/50"
                  : "bg-gradient-to-r from-purple-600 to-purple-900 text-white shadow-xl shadow-purple-500/50"
              }`}
            >
              {project.status}
            </span>
            <span className="px-5 py-2 rounded-full text-base font-semibold bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-xl shadow-gray-500/30">
              {progress}% complete
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            className="bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-2xl border border-white/20 rounded-2xl p-6 hover:border-purple-500/50 transition-all duration-300"
          >
            <div className="flex items-center gap-3 text-gray-400 mb-3">
              <CalendarIcon className="w-5 h-5" />
              <span className="text-base">Created</span>
            </div>
            <p className="text-2xl font-semibold">{formatDate(project.created_at)}</p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            className="bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-2xl border border-white/20 rounded-2xl p-6 hover:border-purple-500/50 transition-all duration-300"
          >
            <div className="flex items-center gap-3 text-gray-400 mb-3">
              <CalendarIcon className="w-5 h-5" />
              <span className="text-base">Target Date</span>
            </div>
            <p className="text-2xl font-semibold">{computeDeadline(project.created_at)}</p>
          </motion.div>
        </div>

        <div className="bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-2xl border border-white/20 rounded-2xl p-8">
          <h3 className="text-2xl mb-4 font-semibold">Description</h3>
          <p className="text-gray-300 text-lg leading-relaxed">{project.description}</p>
        </div>

        {tasks.length > 0 && (
          <div className="bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-2xl border border-white/20 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <Paperclip className="w-5 h-5 text-purple-400" />
              <h3 className="text-2xl font-semibold">Tasks ({tasks.length})</h3>
            </div>
            <div className="space-y-3">
              {tasks.map((task) => (
                <motion.div
                  key={task.id}
                  whileHover={{ scale: 1.01, x: 4 }}
                  className="flex items-center justify-between p-4 bg-white/10 rounded-xl hover:bg-white/20 transition-all duration-300 border border-white/10 hover:border-white/30"
                >
                  <span className="text-gray-200">{task.title}</span>
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-medium ${
                      task.status === "Done"
                        ? "bg-green-900/50 text-green-300"
                        : task.status === "In Progress"
                        ? "bg-purple-900/50 text-purple-300"
                        : "bg-white/10 text-gray-400"
                    }`}
                  >
                    {task.status}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Panel — AI Assistant */}
      <div className="w-[520px] bg-gradient-to-br from-purple-900/30 to-black/30 backdrop-blur-2xl border-2 border-purple-500/50 rounded-3xl flex flex-col overflow-hidden shadow-2xl shadow-purple-500/30 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent animate-pulse" />

        <div className="p-8 border-b border-purple-500/50 bg-gradient-to-r from-purple-600/20 to-black/20 relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="p-3 bg-gradient-to-br from-purple-600 to-purple-900 rounded-2xl shadow-xl shadow-purple-500/50"
            >
              <Sparkles className="w-7 h-7 text-white" />
            </motion.div>
            <h3 className="text-3xl font-semibold bg-gradient-to-r from-purple-300 to-white bg-clip-text text-transparent">
              AI Assistant
            </h3>
          </div>
          <p className="text-base text-gray-300">Intelligent guidance for your project</p>
        </div>

        <div className="p-8 space-y-4 border-b border-purple-500/30 relative z-10">
          <h4 className="text-base text-gray-300 font-semibold mb-4">AI Recommendations:</h4>
          {AI_SUGGESTIONS.map((suggestion, index) => (
            <motion.button
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.03, y: -2 }}
              onClick={() =>
                setChatMessages((prev) => [
                  ...prev,
                  { role: "user", content: `Tell me about: ${suggestion.title}` },
                  { role: "ai", content: suggestion.content },
                ])
              }
              className="w-full text-left p-5 bg-gradient-to-br from-white/10 to-white/5 border-2 border-purple-500/30 rounded-2xl hover:border-purple-400/60 hover:shadow-xl hover:shadow-purple-500/20 transition-all duration-300 group"
            >
              <div className="text-base mb-2 text-purple-300 group-hover:text-purple-200 font-semibold">
                {suggestion.title}
              </div>
              <pre className="text-sm text-gray-400 whitespace-pre-wrap overflow-hidden max-h-16 leading-relaxed">
                {suggestion.content.substring(0, 100)}...
              </pre>
            </motion.button>
          ))}
        </div>

        <div className="flex-1 p-8 overflow-y-auto space-y-5 relative z-10">
          {chatMessages.map((msg, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] p-5 rounded-2xl text-base ${
                  msg.role === "user"
                    ? "bg-gradient-to-br from-purple-600 to-purple-900 shadow-lg shadow-purple-500/30 text-white"
                    : "bg-gradient-to-br from-purple-600/60 to-pink-600/60 shadow-lg shadow-purple-500/20 text-white"
                }`}
              >
                <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
              </div>
            </motion.div>
          ))}
          {isSending && (
            <div className="flex justify-start">
              <div className="bg-white/10 rounded-2xl p-4">
                <div className="flex gap-1.5">
                  {[0, 0.2, 0.4].map((d) => (
                    <motion.div
                      key={d}
                      animate={{ scale: [1, 1.4, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: d }}
                      className="w-2 h-2 bg-purple-400 rounded-full"
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="p-6 border-t-2 border-purple-500/50 bg-black/30 relative z-10">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
              placeholder="Ask the AI about this project..."
              className="flex-1 px-6 py-4 bg-white/10 border-2 border-purple-500/40 rounded-2xl focus:outline-none focus:border-purple-400/70 text-white placeholder-gray-400 transition-all duration-300 text-base"
            />
            <motion.button
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleSendMessage}
              disabled={isSending}
              className="p-4 bg-gradient-to-r from-purple-600 to-purple-900 rounded-2xl hover:shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 disabled:opacity-50"
            >
              <Send className="w-6 h-6" />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
