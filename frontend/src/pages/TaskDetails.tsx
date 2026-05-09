import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Calendar as CalendarIcon, ChevronDown, Sparkles, UserPlus, UserMinus, Users, CheckCircle2, Circle, Clock, Tag } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { api, type Project, type Task, type ProjectMember, type User } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { TaskDetailPanel } from "../components/TaskDetailPanel";
import { AddTaskForm } from "../components/AddTaskForm";

interface ScheduleInfo { start: Date; end: Date; }

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
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

const PRIORITY_COLORS: Record<string, string> = {
  High: "border-red-500/40 bg-red-900/30 text-red-300",
  Medium: "border-yellow-500/40 bg-yellow-900/30 text-yellow-300",
  Low: "border-green-500/40 bg-green-900/30 text-green-300",
};

function buildSchedule(tasks: Task[]): Map<string, ScheduleInfo> {
  const ordered = [...tasks].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const map = new Map<string, ScheduleInfo>();
  const anchor = ordered[0]?.created_at ? new Date(ordered[0].created_at) : new Date();
  let cursor = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());

  for (const t of ordered) {
    const days = Math.max(1, Math.ceil(Number(t.estimated_days || 1)));
    const start = new Date(cursor);
    const end = new Date(cursor);
    end.setDate(end.getDate() + days - 1);
    map.set(t.id, { start, end });
    cursor = new Date(end);
    cursor.setDate(cursor.getDate() + 1);
  }
  return map;
}

export function TaskDetails() {
  const { taskId } = useParams<{ taskId: string }>();
  const { session } = useAuth();
  const currentUserId = session?.user.id;

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberActionId, setMemberActionId] = useState<string | null>(null);
  const [assignDropdownId, setAssignDropdownId] = useState<string | null>(null);
  const [assigningTaskId, setAssigningTaskId] = useState<string | null>(null);
  const [completionError, setCompletionError] = useState<string | null>(null);

  useEffect(() => {
    if (!taskId) return;
    Promise.all([api.projects.get(taskId), api.users.list()])
      .then(([pd, ud]) => {
        setProject(pd.project);
        setTasks(pd.tasks);
        setMembers(pd.members ?? []);
        setAllUsers(ud.users);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [taskId]);

  const scheduleMap = buildSchedule(tasks);
  const doneTasks = tasks.filter((t) => t.status === "Done").length;
  const progress = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0;
  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;

  const handleAddMember = async (userId: string) => {
    if (!taskId) return;
    setMemberActionId(userId);
    try {
      await api.projects.addMember(taskId, userId);
      const u = allUsers.find((x) => x.id === userId);
      if (u) setMembers((p) => [...p, { user_id: userId, role: "Member", id: u.id, email: u.email, full_name: u.full_name, avatar_url: u.avatar_url }]);
      setShowAddMember(false);
    } catch { /* silent */ } finally { setMemberActionId(null); }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!taskId) return;
    setMemberActionId(userId);
    try {
      await api.projects.removeMember(taskId, userId);
      setMembers((p) => p.filter((m) => m.user_id !== userId));
    } catch { /* silent */ } finally { setMemberActionId(null); }
  };

  const handleAssignTask = async (tid: string, userId: string | null) => {
    setAssigningTaskId(tid);
    try {
      await api.tasks.assign(tid, userId);
      setTasks((p) => p.map((t) => t.id === tid ? { ...t, assigned_to: userId } : t));
    } catch { /* silent */ } finally { setAssigningTaskId(null); setAssignDropdownId(null); }
  };

  const handleCompleteTask = async (tid: string, completed: boolean) => {
    const prev = tasks;
    setTasks((p) => p.map((t) => t.id === tid ? {
      ...t,
      status: completed ? "Done" : "To Do",
      completed_by: completed ? (currentUserId ?? null) : null,
      completed_at: completed ? new Date().toISOString() : null,
      completer_name: completed ? (session?.user.user_metadata?.full_name ?? session?.user.email ?? null) : null,
    } : t));
    try {
      await api.tasks.complete(tid, completed, currentUserId);
    } catch (err) {
      setTasks(prev);
      console.error("Task completion error:", err instanceof Error ? err.message : err);
      setCompletionError("Failed to update task. Please try again.");
      setTimeout(() => setCompletionError(null), 4000);
    }
  };

  const handleTaskCreated = (task: Task) => {
    setTasks((p) => [...p, task]);
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
        <Link to="/" className="text-purple-400 hover:text-purple-300 underline text-sm">← Back to Projects</Link>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 p-4 sm:p-6 lg:p-10 xl:p-12 flex flex-col lg:flex-row gap-6 lg:gap-8 overflow-hidden">
      {/* Left Panel — Project info + scrollable task list */}
      <div className="min-w-0 min-h-0 flex-1 space-y-6 overflow-y-auto pr-1 lg:pr-2">
        <Link to="/">
          <motion.button whileHover={{ x: -5 }} className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors text-lg">
            <ArrowLeft className="w-5 h-5" /><span>Back to Projects</span>
          </motion.button>
        </Link>

        <div className="min-w-0">
          <h2 className="text-4xl xl:text-5xl mb-4 bg-linear-to-r from-white to-gray-400 bg-clip-text text-transparent wrap-break-word leading-tight">{project.name}</h2>
          <div className="flex flex-wrap items-center gap-4">
            <span className={`px-5 py-2 rounded-full text-base font-semibold ${project.status === "Completed" ? "bg-linear-to-r from-green-600 to-emerald-600 text-white shadow-xl shadow-green-500/50" : "bg-linear-to-r from-purple-600 to-purple-900 text-white shadow-xl shadow-purple-500/50"}`}>{project.status}</span>
            <span className="px-5 py-2 rounded-full text-base font-semibold bg-linear-to-r from-gray-600 to-gray-700 text-white shadow-xl shadow-gray-500/30">{progress}% complete</span>
          </div>
        </div>

        {/* Project info cards */}
        <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6">
          <motion.div whileHover={{ y: -3 }} className="min-w-0 bg-linear-to-br from-white/7 to-white/2 backdrop-blur-2xl border border-white/20 rounded-2xl p-6 hover:border-purple-500/50 transition-all">
            <div className="flex items-center gap-3 text-gray-400 mb-3"><CalendarIcon className="w-5 h-5" /><span className="text-base">Created</span></div>
            <p className="text-2xl font-semibold">{formatDate(project.created_at)}</p>
          </motion.div>
          <motion.div whileHover={{ y: -3 }} className="min-w-0 bg-linear-to-br from-white/7 to-white/2 backdrop-blur-2xl border border-white/20 rounded-2xl p-6 hover:border-purple-500/50 transition-all">
            <div className="flex items-center gap-3 text-gray-400 mb-3"><CalendarIcon className="w-5 h-5" /><span className="text-base">Progress</span></div>
            <div className="flex items-center gap-4">
              <p className="text-2xl font-semibold">{doneTasks}/{tasks.length} tasks</p>
              <div className="flex-1 h-3 bg-black/40 rounded-full overflow-hidden border border-white/10">
                <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1, ease: "easeOut" }} className="h-full rounded-full bg-linear-to-r from-purple-600 to-purple-400" />
              </div>
            </div>
          </motion.div>
        </div>

        <div className="min-w-0 bg-linear-to-br from-white/7 to-white/2 backdrop-blur-2xl border border-white/20 rounded-2xl p-8">
          <h3 className="text-2xl mb-4 font-semibold">Description</h3>
          <p className="text-gray-300 text-lg leading-relaxed">{project.description}</p>
        </div>

        {/* Team Members */}
        <div className="min-w-0 bg-linear-to-br from-white/7 to-white/2 backdrop-blur-2xl border border-white/20 rounded-2xl p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3"><Users className="w-5 h-5 text-purple-400" /><h3 className="text-2xl font-semibold">Team ({members.length})</h3></div>
            <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }} onClick={() => setShowAddMember((v) => !v)} className="flex items-center gap-2 rounded-xl border border-purple-500/40 bg-purple-900/30 px-4 py-2 text-sm font-semibold text-white hover:border-purple-400/70 hover:bg-purple-800/40 transition-all">
              <UserPlus className="h-4 w-4" /> Add member
            </motion.button>
          </div>

          <AnimatePresence>
            {showAddMember && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mb-5 rounded-xl border border-purple-500/30 bg-black/50 p-4">
                {availableToAdd.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-2">All users are already on this project.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {availableToAdd.map((user) => (
                      <button key={user.id} onClick={() => handleAddMember(user.id)} disabled={memberActionId === user.id} className="flex w-full items-center gap-3 rounded-lg border border-white/10 bg-white/3 px-3 py-2.5 text-left hover:border-purple-500/40 hover:bg-purple-900/20 transition-all disabled:opacity-50">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-purple-600 to-purple-800 text-xs font-bold text-white">{getInitials(user.full_name, user.email)}</div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm text-white">{user.full_name ?? user.email}</div>
                          <div className="truncate text-xs text-gray-500">{user.email}</div>
                        </div>
                        {memberActionId === user.id ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" /> : <UserPlus className="h-4 w-4 text-purple-400" />}
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
              {members.map((member, i) => (
                <motion.div key={member.user_id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/3 p-3 group">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br ${GRADIENTS[i % GRADIENTS.length]} text-sm font-bold text-white`}>{getInitials(member.full_name, member.email)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-white">{member.full_name ?? member.email}</div>
                    <div className="truncate text-xs text-gray-500">{member.role}</div>
                  </div>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleRemoveMember(member.user_id)} disabled={memberActionId === member.user_id} className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-gray-600 opacity-0 group-hover:opacity-100 hover:border-red-500/40 hover:bg-red-900/20 hover:text-red-400 transition-all disabled:opacity-30" aria-label={`Remove ${member.full_name ?? member.email}`}>
                    {memberActionId === member.user_id ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-red-400 border-t-transparent" /> : <UserMinus className="h-3.5 w-3.5" />}
                  </motion.button>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Tasks Section — scrollable list */}
        <div className="min-w-0 bg-linear-to-br from-white/7 to-white/2 backdrop-blur-2xl border border-white/20 rounded-2xl p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-purple-400" />
              <h3 className="text-2xl font-semibold">Tasks ({tasks.length})</h3>
            </div>
            <AddTaskForm projectId={taskId!} members={members} onCreated={handleTaskCreated} />
          </div>
          {completionError && (
            <p className="text-sm text-red-400 mb-2">{completionError}</p>
          )}

          {tasks.length === 0 ? (
            <p className="text-sm text-gray-600 italic">No tasks yet. Add a task or generate them with AI.</p>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {tasks.map((task) => {
                const assignee = members.find((m) => m.user_id === task.assigned_to);
                const isDone = task.status === "Done";
                const isSelected = selectedTaskId === task.id;
                const sched = scheduleMap.get(task.id);
                const prio = PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.Medium;
                const isDropdownOpen = assignDropdownId === task.id;

                return (
                  <div key={task.id} className="relative">
                    <motion.div
                      whileHover={{ y: -2 }}
                      onClick={() => setSelectedTaskId(isSelected ? null : task.id)}
                      className={`cursor-pointer p-4 rounded-xl border transition-all duration-200 ${isSelected ? "border-purple-500/60 bg-purple-900/20 shadow-lg shadow-purple-500/10" : isDone ? "border-green-500/20 bg-green-900/10 hover:border-green-500/40" : "border-white/10 bg-white/5 hover:border-white/20"}`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const canComplete = task.assigned_to !== null && task.assigned_to === currentUserId;
                            if (canComplete) handleCompleteTask(task.id, !isDone);
                          }}
                          title={task.assigned_to !== currentUserId ? "Only the assigned user can complete this task" : undefined}
                          className="mt-0.5 shrink-0"
                        >
                          {isDone
                            ? <CheckCircle2 className="w-5 h-5 text-green-400" />
                            : <Circle className={`w-5 h-5 transition-colors ${task.assigned_to === currentUserId ? "text-gray-500 hover:text-purple-400" : "text-gray-700 cursor-not-allowed"}`} />
                          }
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className={`text-sm font-medium mb-1 ${isDone ? "line-through text-gray-500" : "text-white"}`}>{task.title}</div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${prio}`}>{task.priority}</span>
                            <span className="flex items-center gap-1 text-[10px] text-gray-400"><Clock className="w-3 h-3" />{task.estimated_days}d</span>
                            {(task.assigned_tech ?? []).slice(0, 2).map((t) => (
                              <span key={t} className="px-2 py-0.5 rounded text-[10px] bg-purple-900/30 border border-purple-500/20 text-purple-300">{t}</span>
                            ))}
                            {(task.assigned_tech ?? []).length > 2 && <span className="text-[10px] text-gray-500">+{task.assigned_tech.length - 2}</span>}
                            {sched && <span className="text-[10px] text-gray-500">{sched.start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} → {sched.end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
                          </div>
                          {isDone && task.completer_name && <div className="text-[10px] text-green-400/70 mt-1">✓ by {task.completer_name}</div>}
                        </div>

                        {/* Assign button */}
                        <button onClick={(e) => { e.stopPropagation(); setAssignDropdownId(isDropdownOpen ? null : task.id); }} disabled={assigningTaskId === task.id} className="flex items-center gap-1.5 shrink-0 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-gray-400 hover:border-purple-500/40 hover:bg-purple-900/20 hover:text-purple-300 transition-all disabled:opacity-40">
                          {assigningTaskId === task.id ? (
                            <div className="h-3 w-3 animate-spin rounded-full border border-purple-400 border-t-transparent" />
                          ) : assignee ? (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-linear-to-br from-purple-600 to-purple-800 text-[10px] font-bold text-white">{getInitials(assignee.full_name, assignee.email)}</div>
                          ) : (
                            <UserPlus className="h-3 w-3" />
                          )}
                          <span>{assignee ? (assignee.full_name ?? assignee.email).split(" ")[0] : "Assign"}</span>
                          <ChevronDown className={`h-3 w-3 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
                        </button>
                      </div>
                    </motion.div>

                    <AnimatePresence>
                      {isDropdownOpen && (
                        <motion.div initial={{ opacity: 0, y: -4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.97 }} transition={{ duration: 0.12 }} className="absolute right-0 top-full mt-1 z-20 w-52 rounded-xl border border-white/10 bg-black/90 backdrop-blur-xl shadow-2xl overflow-hidden">
                          {members.length === 0 ? (
                            <p className="px-4 py-3 text-xs text-gray-500">No members on this project yet.</p>
                          ) : (
                            <div className="p-1.5 space-y-0.5">
                              {assignee && (
                                <button onClick={() => handleAssignTask(task.id, null)} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors">
                                  <UserMinus className="h-3.5 w-3.5 shrink-0" /> Unassign
                                </button>
                              )}
                              {members.map((m) => (
                                <button key={m.user_id} onClick={() => handleAssignTask(task.id, m.user_id)} className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs transition-colors ${m.user_id === task.assigned_to ? "bg-purple-900/30 text-purple-300" : "text-gray-300 hover:bg-white/5"}`}>
                                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-purple-600 to-purple-800 text-[10px] font-bold text-white">{getInitials(m.full_name, m.email)}</div>
                                  <span className="truncate">{m.full_name ?? m.email}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel — Task Detail or AI Assistant */}
      <div className="w-full h-[500px] lg:h-auto lg:w-[400px] xl:w-[440px] shrink-0 min-h-0 bg-linear-to-br from-purple-950/35 to-black/45 backdrop-blur-2xl border border-purple-500/45 rounded-2xl flex flex-col overflow-hidden shadow-xl shadow-purple-500/20 relative">
        <div className="absolute inset-0 bg-linear-to-br from-purple-500/5 to-transparent pointer-events-none" />

        {selectedTask ? (
          <TaskDetailPanel
            task={selectedTask}
            schedule={scheduleMap.get(selectedTask.id) ?? null}
            members={members}
            projectDesc={project.description}
            currentUserId={currentUserId}
            onComplete={handleCompleteTask}
            onBack={() => setSelectedTaskId(null)}
          />
        ) : (
          /* Default AI Assistant view */
          <div className="flex flex-col h-full relative z-10">
            <div className="p-5 border-b border-purple-500/30 bg-linear-to-r from-purple-600/12 to-black/20">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-purple-600 to-purple-900 shadow-lg shadow-purple-500/25">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-2xl font-semibold bg-linear-to-r from-purple-300 to-white bg-clip-text text-transparent">AI Assistant</h3>
              </div>
              <p className="text-sm text-gray-400">Select a task to view details and chat with AI</p>
            </div>

            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-900/30 border border-purple-500/20 flex items-center justify-center">
                  <Tag className="w-8 h-8 text-purple-400/60" />
                </div>
                <div>
                  <p className="text-gray-300 font-medium mb-1">No task selected</p>
                  <p className="text-sm text-gray-500">Click on any task from the list to view its details, implementation steps, and chat with AI about it.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
