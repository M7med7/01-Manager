import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Calendar as CalendarIcon, Paperclip, Send, Sparkles, UserPlus, UserMinus, Users } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { api, type Project, type Task, type ProjectMember, type User } from "../lib/api";

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

function getInitials(name: string | null, email: string): string {
  if (name) return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  return email.slice(0, 2).toUpperCase();
}

const GRADIENTS = [
  "from-purple-600 to-purple-800",
  "from-purple-600 to-pink-600",
  "from-green-600 to-emerald-600",
  "from-orange-600 to-red-600",
  "from-indigo-600 to-purple-600",
];

export function TaskDetails() {
  const { taskId } = useParams<{ taskId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Chat state
  const [message, setMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: "ai", content: "How can I help you with this project?" },
  ]);
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Team management state
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberActionId, setMemberActionId] = useState<string | null>(null);

  useEffect(() => {
    if (!taskId) return;
    Promise.all([
      api.projects.get(taskId),
      api.users.list(),
    ])
      .then(([projectData, usersData]) => {
        setProject(projectData.project);
        setTasks(projectData.tasks);
        setMembers(projectData.members ?? []);
        setAllUsers(usersData.users);
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
      const { response } = await api.ai.chat({ message: userMsg, context: project?.description });
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

  const handleAddMember = async (userId: string) => {
    if (!taskId) return;
    setMemberActionId(userId);
    try {
      await api.projects.addMember(taskId, userId);
      const addedUser = allUsers.find((u) => u.id === userId);
      if (addedUser) {
        setMembers((prev) => [
          ...prev,
          { user_id: userId, role: "Member", id: addedUser.id, email: addedUser.email, full_name: addedUser.full_name, avatar_url: addedUser.avatar_url },
        ]);
      }
      setShowAddMember(false);
    } catch {
      // silently fail — user stays in list
    } finally {
      setMemberActionId(null);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!taskId) return;
    setMemberActionId(userId);
    try {
      await api.projects.removeMember(taskId, userId);
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
    } catch {
      // silently fail
    } finally {
      setMemberActionId(null);
    }
  };

  const assignedIds = new Set(members.map((m) => m.user_id));
  const availableToAdd = allUsers.filter((u) => !assignedIds.has(u.id));

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
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
    <div className="h-full min-h-0 p-4 sm:p-6 lg:p-10 xl:p-12 flex flex-col lg:flex-row gap-6 lg:gap-8 overflow-hidden">
      {/* Left Panel */}
      <div className="min-w-0 min-h-0 flex-1 space-y-8 overflow-y-auto pr-1 lg:pr-2">
        <Link to="/">
          <motion.button
            whileHover={{ x: -5 }}
            className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors duration-300 text-lg"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Projects</span>
          </motion.button>
        </Link>

        <div className="min-w-0">
          <h2 className="text-4xl xl:text-5xl mb-4 bg-linear-to-r from-white to-gray-400 bg-clip-text text-transparent wrap-break-word leading-tight">
            {project.name}
          </h2>
          <div className="flex flex-wrap items-center gap-4">
            <span
              className={`px-5 py-2 rounded-full text-base font-semibold ${
                project.status === "Completed"
                  ? "bg-linear-to-r from-green-600 to-emerald-600 text-white shadow-xl shadow-green-500/50"
                  : "bg-linear-to-r from-purple-600 to-purple-900 text-white shadow-xl shadow-purple-500/50"
              }`}
            >
              {project.status}
            </span>
            <span className="px-5 py-2 rounded-full text-base font-semibold bg-linear-to-r from-gray-600 to-gray-700 text-white shadow-xl shadow-gray-500/30">
              {progress}% complete
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6">
          <motion.div
            whileHover={{ y: -3 }}
            className="min-w-0 bg-linear-to-br from-white/7 to-white/2 backdrop-blur-2xl border border-white/20 rounded-2xl p-6 hover:border-purple-500/50 transition-all duration-300"
          >
            <div className="flex items-center gap-3 text-gray-400 mb-3">
              <CalendarIcon className="w-5 h-5" />
              <span className="text-base">Created</span>
            </div>
            <p className="text-2xl font-semibold wrap-break-word">{formatDate(project.created_at)}</p>
          </motion.div>

          <motion.div
            whileHover={{ y: -3 }}
            className="min-w-0 bg-linear-to-br from-white/7 to-white/2 backdrop-blur-2xl border border-white/20 rounded-2xl p-6 hover:border-purple-500/50 transition-all duration-300"
          >
            <div className="flex items-center gap-3 text-gray-400 mb-3">
              <CalendarIcon className="w-5 h-5" />
              <span className="text-base">Target Date</span>
            </div>
            <p className="text-2xl font-semibold wrap-break-word">{computeDeadline(project.created_at)}</p>
          </motion.div>
        </div>

        <div className="min-w-0 bg-linear-to-br from-white/7 to-white/2 backdrop-blur-2xl border border-white/20 rounded-2xl p-8">
          <h3 className="text-2xl mb-4 font-semibold">Description</h3>
          <p className="text-gray-300 text-lg leading-relaxed">{project.description}</p>
        </div>

        {/* Team Members */}
        <div className="min-w-0 bg-linear-to-br from-white/7 to-white/2 backdrop-blur-2xl border border-white/20 rounded-2xl p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-purple-400" />
              <h3 className="text-2xl font-semibold">Team ({members.length})</h3>
            </div>
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowAddMember((v) => !v)}
              className="flex items-center gap-2 rounded-xl border border-purple-500/40 bg-purple-900/30 px-4 py-2 text-sm font-semibold text-white hover:border-purple-400/70 hover:bg-purple-800/40 transition-all"
            >
              <UserPlus className="h-4 w-4" />
              Add member
            </motion.button>
          </div>

          {/* Add member dropdown */}
          <AnimatePresence>
            {showAddMember && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mb-5 rounded-xl border border-purple-500/30 bg-black/50 p-4"
              >
                {availableToAdd.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-2">All users are already on this project.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {availableToAdd.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleAddMember(user.id)}
                        disabled={memberActionId === user.id}
                        className="flex w-full items-center gap-3 rounded-lg border border-white/10 bg-white/3 px-3 py-2.5 text-left hover:border-purple-500/40 hover:bg-purple-900/20 transition-all disabled:opacity-50"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-purple-600 to-purple-800 text-xs font-bold text-white">
                          {getInitials(user.full_name, user.email)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm text-white">{user.full_name ?? user.email}</div>
                          <div className="truncate text-xs text-gray-500">{user.email}</div>
                        </div>
                        {memberActionId === user.id ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
                        ) : (
                          <UserPlus className="h-4 w-4 text-purple-400" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {members.length === 0 ? (
            <p className="text-sm text-gray-600 italic">No team members assigned yet.</p>
          ) : (
            <div className="space-y-3">
              {members.map((member, i) => {
                const displayName = member.full_name ?? member.email;
                return (
                  <motion.div
                    key={member.user_id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/3 p-3 group"
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br ${GRADIENTS[i % GRADIENTS.length]} text-sm font-bold text-white`}
                    >
                      {getInitials(member.full_name, member.email)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-white">{displayName}</div>
                      <div className="truncate text-xs text-gray-500">{member.role}</div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleRemoveMember(member.user_id)}
                      disabled={memberActionId === member.user_id}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-gray-600 opacity-0 group-hover:opacity-100 hover:border-red-500/40 hover:bg-red-900/20 hover:text-red-400 transition-all disabled:opacity-30"
                      aria-label={`Remove ${displayName}`}
                    >
                      {memberActionId === member.user_id ? (
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
                      ) : (
                        <UserMinus className="h-3.5 w-3.5" />
                      )}
                    </motion.button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {tasks.length > 0 && (
          <div className="min-w-0 bg-linear-to-br from-white/7 to-white/2 backdrop-blur-2xl border border-white/20 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <Paperclip className="w-5 h-5 text-purple-400" />
              <h3 className="text-2xl font-semibold">Tasks ({tasks.length})</h3>
            </div>
            <div className="space-y-3">
              {tasks.map((task) => (
                <motion.div
                  key={task.id}
                  whileHover={{ scale: 1.01, x: 4 }}
                  className="flex items-center justify-between gap-4 p-4 bg-white/10 rounded-xl hover:bg-white/20 transition-all duration-300 border border-white/10 hover:border-white/30"
                >
                  <span className="min-w-0 text-gray-200 wrap-break-word">{task.title}</span>
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-medium shrink-0 ${
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

      {/* Right Panel — AI Assistant
          Mobile (stacked): explicit h-[420px] — never ambiguous across browsers.
          Desktop (lg+): h-auto with flex stretch fills the row height automatically. */}
      <div className="w-full h-[420px] lg:h-auto lg:w-[400px] xl:w-[440px] shrink-0 min-h-0 bg-linear-to-br from-purple-950/35 to-black/45 backdrop-blur-2xl border border-purple-500/45 rounded-2xl flex flex-col overflow-hidden shadow-xl shadow-purple-500/20 relative">
        <div className="absolute inset-0 bg-linear-to-br from-purple-500/5 to-transparent" />

        <div className="p-5 border-b border-purple-500/30 bg-linear-to-r from-purple-600/12 to-black/20 relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-purple-600 to-purple-900 shadow-lg shadow-purple-500/25">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-2xl font-semibold bg-linear-to-r from-purple-300 to-white bg-clip-text text-transparent">
              AI Assistant
            </h3>
          </div>
          <p className="text-sm text-gray-400">Intelligent guidance for your project</p>
        </div>

        <div className="p-5 space-y-3 border-b border-purple-500/20 relative z-10">
          <h4 className="text-sm text-gray-300 font-semibold">AI Recommendations</h4>
          {AI_SUGGESTIONS.map((suggestion, index) => (
            <motion.button
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -1 }}
              onClick={() =>
                setChatMessages((prev) => [
                  ...prev,
                  { role: "user", content: `Tell me about: ${suggestion.title}` },
                  { role: "ai", content: suggestion.content },
                ])
              }
              className="w-full text-left p-4 bg-white/4 border border-purple-500/25 rounded-xl hover:border-purple-400/50 hover:bg-purple-500/10 transition-all duration-300 group"
            >
              <div className="text-sm mb-1.5 text-purple-300 group-hover:text-purple-200 font-semibold">
                {suggestion.title}
              </div>
              <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">
                {suggestion.content.replace(/\n/g, " ").substring(0, 120)}...
              </p>
            </motion.button>
          ))}
        </div>

        <div className="flex-1 min-h-0 p-5 overflow-y-auto space-y-4 relative z-10">
          {chatMessages.map((msg, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[88%] p-4 rounded-xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-linear-to-br from-purple-600 to-purple-900 shadow-lg shadow-purple-500/25 text-white"
                    : "bg-white/[0.07] border border-white/10 text-gray-100"
                }`}
              >
                <pre className="whitespace-pre-wrap font-sans leading-relaxed">{msg.content}</pre>
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

        <div className="p-5 border-t border-purple-500/30 bg-black/45 relative z-10">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
              placeholder="Ask the AI about this project..."
              className="min-w-0 flex-1 px-4 py-3 bg-white/[0.07] border border-purple-500/35 rounded-xl focus:outline-none focus:border-purple-400/70 text-white placeholder-gray-500 transition-all duration-300 text-sm"
            />
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleSendMessage}
              disabled={isSending}
              className="h-12 w-12 shrink-0 flex items-center justify-center bg-linear-to-r from-purple-600 to-purple-900 rounded-xl hover:shadow-lg hover:shadow-purple-500/40 transition-all duration-300 disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
