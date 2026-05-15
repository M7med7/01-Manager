import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Calendar as CalendarIcon, ChevronDown, Sparkles, UserPlus, UserMinus, Users, CheckCircle2, Circle, Clock, Tag, LayoutGrid, List, Filter, AlertTriangle, BookmarkPlus, Download } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { api, type Project, type Task, type ProjectMember, type User } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { TaskDetailPanel } from "../components/TaskDetailPanel";
import { AddTaskForm } from "../components/AddTaskForm";
import { buildDependencyAwareSchedule } from "../lib/schedule";
import { exportProject, type ExportFormat } from "../lib/projectExport";

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

const KANBAN_COLUMNS = [
  { label: "Backlog", status: "Backlog", dot: "bg-gray-400" },
  { label: "To Do", status: "To Do", dot: "bg-sky-400" },
  { label: "In Progress", status: "In Progress", dot: "bg-purple-400" },
  { label: "Review", status: "In Review", dot: "bg-amber-400" },
  { label: "Done", status: "Done", dot: "bg-green-400" },
] as const;

type ProjectView = "list" | "kanban";

function recomputeBlockers(tasks: Task[]): Task[] {
  const statusById = new Map(tasks.map((task) => [task.id, task.status]));
  const titleById = new Map(tasks.map((task) => [task.id, task.title]));
  return tasks.map((task) => {
    const blockedBy = (task.blocked_by ?? []).map((item) => ({
      ...item,
      title: titleById.get(item.id) ?? item.title,
      status: statusById.get(item.id) ?? item.status,
    }));
    const unlocks = (task.unlocks ?? []).map((item) => ({
      ...item,
      title: titleById.get(item.id) ?? item.title,
      status: statusById.get(item.id) ?? item.status,
    }));
    const blockingCount = blockedBy.filter((item) => item.status !== "Done").length;
    return {
      ...task,
      blocked_by: blockedBy,
      unlocks,
      blocking_count: blockingCount,
      is_blocked: blockingCount > 0,
    };
  });
}

function blockedWarning(task: Task): string {
  const blockers = (task.blocked_by ?? []).filter((item) => item.status !== "Done");
  return `${task.title} is blocked by: ${blockers.map((item) => item.title).join(", ")}. Continue anyway?`;
}

function statusLabel(status: string): string {
  return status === "In Review" ? "Review" : status;
}

function startOfToday(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
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
  const [view, setView] = useState<ProjectView>("list");
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [filters, setFilters] = useState({
    assignee: "all",
    priority: "all",
    status: "all",
    overdueOnly: false,
  });

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

  const scheduleMap = buildDependencyAwareSchedule(tasks);
  const doneTasks = tasks.filter((t) => t.status === "Done").length;
  const progress = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0;
  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;
  const blockedTasks = tasks.filter((t) => t.is_blocked);
  const todayStart = startOfToday();

  const isOverdue = (task: Task) => {
    if (task.status === "Done") return false;
    const sched = scheduleMap.get(task.id);
    if (!sched) return false;
    return sched.end < todayStart;
  };

  const filteredTasks = tasks.filter((task) => {
    if (filters.assignee !== "all" && (task.assigned_to ?? "unassigned") !== filters.assignee) return false;
    if (filters.priority !== "all" && task.priority !== filters.priority) return false;
    if (filters.status !== "all" && task.status !== filters.status) return false;
    if (filters.overdueOnly && !isOverdue(task)) return false;
    return true;
  });

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  };

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
      await api.tasks.assign(tid, userId, currentUserId);
      setTasks((p) => p.map((t) => t.id === tid ? { ...t, assigned_to: userId, latest_activity_at: new Date().toISOString() } : t));
    } catch { /* silent */ } finally { setAssigningTaskId(null); setAssignDropdownId(null); }
  };

  const handleCompleteTask = async (tid: string, completed: boolean) => {
    const target = tasks.find((t) => t.id === tid);
    if (completed && target?.is_blocked && !window.confirm(blockedWarning(target))) return;
    const prev = tasks;
    setTasks((p) => recomputeBlockers(p.map((t) => t.id === tid ? {
      ...t,
      status: completed ? "Done" : "To Do",
      completed_by: completed ? (currentUserId ?? null) : null,
      completed_at: completed ? new Date().toISOString() : null,
      completer_name: completed ? (session?.user.user_metadata?.full_name ?? session?.user.email ?? null) : null,
      latest_activity_at: new Date().toISOString(),
    } : t)));
    try {
      await api.tasks.complete(tid, completed, currentUserId);
    } catch (err) {
      setTasks(prev);
      console.error("Task completion error:", err instanceof Error ? err.message : err);
      setCompletionError("Failed to update task. Please try again.");
      setTimeout(() => setCompletionError(null), 4000);
    }
  };

  const handleTaskUpdated = (updated: Task) => {
    setTasks((p) => recomputeBlockers(p.map((t) => (t.id === updated.id ? updated : t))));
  };

  const handleStatusChange = async (tid: string, nextStatus: string) => {
    const task = tasks.find((t) => t.id === tid);
    if (!task || task.status === nextStatus) return;
    if ((nextStatus === "In Progress" || nextStatus === "Done") && task.is_blocked && !window.confirm(blockedWarning(task))) {
      setDraggingTaskId(null);
      setDragOverStatus(null);
      return;
    }

    const prev = tasks;
    const nextCompletedAt = nextStatus === "Done" ? new Date().toISOString() : null;
    const nextCompletedBy = nextStatus === "Done" ? (currentUserId ?? null) : null;
    const nextCompleterName = nextStatus === "Done" ? (session?.user.user_metadata?.full_name ?? session?.user.email ?? null) : null;

    setTasks((p) => recomputeBlockers(
      p.map((t) =>
        t.id === tid
          ? {
              ...t,
              status: nextStatus,
              completed_at: nextCompletedAt,
              completed_by: nextCompletedBy,
              completer_name: nextCompleterName,
            }
          : t
      )
    )
    );

    try {
      const result = await api.tasks.updateStatus(tid, nextStatus, currentUserId);
      setTasks((p) => recomputeBlockers(
        p.map((t) =>
          t.id === tid
            ? {
                ...t,
                status: result.status,
                completed_at: result.completed_at ?? null,
                completed_by: result.completed_by ?? null,
                completer_name: result.status === "Done" ? nextCompleterName : null,
                latest_activity_at: new Date().toISOString(),
              }
            : t
        )
      )
      );
      showToast(`Moved to ${statusLabel(result.status)}`);
    } catch (err) {
      setTasks(prev);
      setCompletionError(err instanceof Error ? err.message : "Failed to update task status");
      setTimeout(() => setCompletionError(null), 4000);
    } finally {
      setDraggingTaskId(null);
      setDragOverStatus(null);
    }
  };

  const handleTaskCreated = (task: Task) => {
    setTasks((p) => [...p, task]);
  };

  const handleAddDependency = async (targetTaskId: string, blockerTaskId: string) => {
    await api.tasks.addDependency(targetTaskId, blockerTaskId);
    setTasks((current) => {
      const target = current.find((task) => task.id === targetTaskId);
      const blocker = current.find((task) => task.id === blockerTaskId);
      if (!target || !blocker) return current;
      return recomputeBlockers(current.map((task) => {
        if (task.id === targetTaskId) {
          const exists = (task.blocked_by ?? []).some((item) => item.id === blockerTaskId);
          return exists ? task : { ...task, blocked_by: [...(task.blocked_by ?? []), { id: blocker.id, title: blocker.title, status: blocker.status }] };
        }
        if (task.id === blockerTaskId) {
          const exists = (task.unlocks ?? []).some((item) => item.id === targetTaskId);
          return exists ? task : { ...task, unlocks: [...(task.unlocks ?? []), { id: target.id, title: target.title, status: target.status }] };
        }
        return task;
      }));
    });
    showToast("Blocker added");
  };

  const handleRemoveDependency = async (targetTaskId: string, blockerTaskId: string) => {
    await api.tasks.removeDependency(targetTaskId, blockerTaskId);
    setTasks((current) => recomputeBlockers(current.map((task) => {
      if (task.id === targetTaskId) {
        return { ...task, blocked_by: (task.blocked_by ?? []).filter((item) => item.id !== blockerTaskId) };
      }
      if (task.id === blockerTaskId) {
        return { ...task, unlocks: (task.unlocks ?? []).filter((item) => item.id !== targetTaskId) };
      }
      return task;
    })));
    showToast("Blocker removed");
  };

  const handleSaveTemplate = async () => {
    if (!project || savingTemplate) return;
    const name = window.prompt("Template name", `${project.name} Template`);
    if (name === null) return;

    setSavingTemplate(true);
    try {
      await api.templates.saveFromProject(project.id, {
        name: name.trim() || `${project.name} Template`,
        created_by: currentUserId ?? null,
      });
      showToast("Template saved");
    } catch (err) {
      setCompletionError(err instanceof Error ? err.message : "Failed to save template");
      setTimeout(() => setCompletionError(null), 4000);
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleExport = (format: ExportFormat) => {
    if (!project) return;
    exportProject({ project, tasks, members, scheduleMap }, format);
    setShowExportMenu(false);
    showToast(`Exported ${format.toUpperCase()}`);
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
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            className="fixed right-6 top-20 z-50 rounded-xl border border-green-500/30 bg-green-950/90 px-4 py-3 text-sm font-semibold text-green-200 shadow-xl shadow-green-500/10 backdrop-blur-xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Left Panel — Project info + scrollable task list */}
      <div className="min-w-0 min-h-0 flex-1 space-y-6 overflow-y-auto pr-1 lg:pr-2">
        <Link to="/">
          <motion.button whileHover={{ x: -5 }} className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors text-lg">
            <ArrowLeft className="w-5 h-5" /><span>Back to Projects</span>
          </motion.button>
        </Link>

        <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <h2 className="text-4xl xl:text-5xl mb-4 bg-linear-to-r from-white to-gray-400 bg-clip-text text-transparent wrap-break-word leading-tight">{project.name}</h2>
            <div className="flex flex-wrap items-center gap-4">
              <span className={`px-5 py-2 rounded-full text-base font-semibold ${project.status === "Completed" ? "bg-linear-to-r from-green-600 to-emerald-600 text-white shadow-xl shadow-green-500/50" : "bg-linear-to-r from-purple-600 to-purple-900 text-white shadow-xl shadow-purple-500/50"}`}>{project.status}</span>
              <span className="px-5 py-2 rounded-full text-base font-semibold bg-linear-to-r from-gray-600 to-gray-700 text-white shadow-xl shadow-gray-500/30">{progress}% complete</span>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <div className="relative">
              <motion.button
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowExportMenu((value) => !value)}
                className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:border-purple-400/50 hover:bg-purple-900/20"
              >
                <Download className="h-4 w-4" />
                Export
              </motion.button>
              <AnimatePresence>
                {showExportMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                    className="absolute right-0 top-12 z-30 w-44 overflow-hidden rounded-xl border border-white/10 bg-black/90 p-1 shadow-2xl shadow-black/40 backdrop-blur-xl"
                  >
                    {[
                      { label: "PDF report", value: "pdf" },
                      { label: "Word report", value: "docx" },
                      { label: "CSV tasks", value: "csv" },
                      { label: "Excel workbook", value: "xlsx" },
                    ].map((item) => (
                      <button
                        key={item.value}
                        onClick={() => handleExport(item.value as ExportFormat)}
                        className="block w-full rounded-lg px-3 py-2.5 text-left text-sm text-gray-300 transition-colors hover:bg-purple-900/35 hover:text-white"
                      >
                        {item.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleSaveTemplate}
              disabled={savingTemplate}
              className="flex items-center justify-center gap-2 rounded-xl border border-purple-500/40 bg-purple-900/30 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:border-purple-400/70 hover:bg-purple-800/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingTemplate ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-300 border-t-transparent" /> : <BookmarkPlus className="h-4 w-4" />}
              Save as template
            </motion.button>
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

        {blockedTasks.length > 0 && (
          <div className="min-w-0 rounded-2xl border border-red-500/30 bg-red-950/20 p-5">
            <div className="mb-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-300" />
              <h3 className="text-xl font-semibold text-red-100">Blocked Work</h3>
              <span className="rounded-full border border-red-500/30 bg-red-900/30 px-2 py-0.5 text-xs text-red-200">{blockedTasks.length}</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {blockedTasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => setSelectedTaskId(task.id)}
                  className="rounded-xl border border-red-500/20 bg-black/25 p-3 text-left transition-colors hover:border-red-400/50"
                >
                  <div className="truncate text-sm font-semibold text-white">{task.title}</div>
                  <div className="mt-2 text-xs text-red-200">
                    Blocked by {(task.blocked_by ?? []).filter((item) => item.status !== "Done").map((item) => item.title).join(", ")}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tasks Section — list + Kanban */}
        <div className="min-w-0 bg-linear-to-br from-white/7 to-white/2 backdrop-blur-2xl border border-white/20 rounded-2xl p-8">
          <div className="flex flex-col gap-4 mb-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-purple-400" />
              <h3 className="text-2xl font-semibold">Tasks ({tasks.length})</h3>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex rounded-xl border border-white/10 bg-black/30 p-1">
                <button
                  onClick={() => setView("list")}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${view === "list" ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"}`}
                >
                  <List className="h-3.5 w-3.5" /> List
                </button>
                <button
                  onClick={() => setView("kanban")}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${view === "kanban" ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"}`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" /> Kanban
                </button>
              </div>
              <AddTaskForm projectId={taskId!} members={members} onCreated={handleTaskCreated} />
            </div>
          </div>

          <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-black/25 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
              <Filter className="h-3.5 w-3.5" /> Filters
            </div>
            <select
              value={filters.assignee}
              onChange={(e) => setFilters((current) => ({ ...current, assignee: e.target.value }))}
              className="rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-xs text-gray-300 outline-none focus:border-purple-500/50"
            >
              <option value="all">All assignees</option>
              <option value="unassigned">Unassigned</option>
              {members.map((member) => (
                <option key={member.user_id} value={member.user_id}>{member.full_name ?? member.email}</option>
              ))}
            </select>
            <select
              value={filters.priority}
              onChange={(e) => setFilters((current) => ({ ...current, priority: e.target.value }))}
              className="rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-xs text-gray-300 outline-none focus:border-purple-500/50"
            >
              <option value="all">All priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            <select
              value={filters.status}
              onChange={(e) => setFilters((current) => ({ ...current, status: e.target.value }))}
              className="rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-xs text-gray-300 outline-none focus:border-purple-500/50"
            >
              <option value="all">All statuses</option>
              {KANBAN_COLUMNS.map((column) => (
                <option key={column.status} value={column.status}>{column.label}</option>
              ))}
            </select>
            <label className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${filters.overdueOnly ? "border-red-500/40 bg-red-900/20 text-red-300" : "border-white/10 bg-black/30 text-gray-400 hover:text-gray-300"}`}>
              <input
                type="checkbox"
                checked={filters.overdueOnly}
                onChange={(e) => setFilters((current) => ({ ...current, overdueOnly: e.target.checked }))}
                className="h-3.5 w-3.5 accent-purple-500"
              />
              Overdue
            </label>
          </div>

          {completionError && (
            <p className="text-sm text-red-400 mb-2">{completionError}</p>
          )}

          {tasks.length === 0 ? (
            <p className="text-sm text-gray-600 italic">No tasks yet. Add a task or generate them with AI.</p>
          ) : filteredTasks.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-white/3 px-4 py-6 text-center text-sm text-gray-500">No tasks match these filters.</p>
          ) : view === "kanban" ? (
            <div className="overflow-x-auto pb-2">
              <div className="grid min-w-[1120px] grid-cols-5 gap-4">
                {KANBAN_COLUMNS.map((column) => {
                  const columnTasks = filteredTasks.filter((task) => task.status === column.status);
                  const isTarget = dragOverStatus === column.status;

                  return (
                    <div
                      key={column.status}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverStatus(column.status);
                      }}
                      onDragLeave={() => setDragOverStatus(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        const tid = e.dataTransfer.getData("text/task-id") || draggingTaskId;
                        if (tid) handleStatusChange(tid, column.status);
                      }}
                      className={`min-h-[420px] rounded-2xl border p-3 transition-all ${isTarget ? "border-purple-400/70 bg-purple-900/20 shadow-lg shadow-purple-500/15" : "border-white/10 bg-black/25"}`}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${column.dot}`} />
                          <h4 className="text-sm font-semibold text-gray-200">{column.label}</h4>
                        </div>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-gray-500">{columnTasks.length}</span>
                      </div>

                      {columnTasks.length === 0 ? (
                        <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/3 text-xs text-gray-600">
                          Drop tasks here
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {columnTasks.map((task) => {
                            const assignee = members.find((m) => m.user_id === task.assigned_to);
                            const sched = scheduleMap.get(task.id);
                            const prio = PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.Medium;
                            const overdue = isOverdue(task);
                            const isDragging = draggingTaskId === task.id;
                            const scheduleWarning = sched?.hasDependencyWarning;
                            const latest = task.latest_activity_at ? new Date(task.latest_activity_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null;

                            return (
                              <motion.div
                                key={task.id}
                                draggable
                                onDragStart={(e) => {
                                  const dragEvent = e as unknown as React.DragEvent<HTMLDivElement>;
                                  setDraggingTaskId(task.id);
                                  dragEvent.dataTransfer.setData("text/task-id", task.id);
                                  dragEvent.dataTransfer.effectAllowed = "move";
                                }}
                                onDragEnd={() => {
                                  setDraggingTaskId(null);
                                  setDragOverStatus(null);
                                }}
                                whileHover={{ y: -2 }}
                                onClick={() => setSelectedTaskId(task.id)}
                                className={`cursor-grab rounded-xl border bg-black/45 p-3 shadow-sm transition-all active:cursor-grabbing ${isDragging ? "scale-[0.98] border-purple-400/60 opacity-60" : selectedTaskId === task.id ? "border-purple-500/60 shadow-purple-500/10" : "border-white/10 hover:border-white/25"}`}
                              >
                                <div className="mb-3 flex items-start justify-between gap-2">
                                  <h5 className={`text-sm font-medium leading-snug ${task.status === "Done" ? "text-gray-500 line-through" : "text-white"}`}>{task.title}</h5>
                                  <span className={`shrink-0 rounded border px-2 py-0.5 text-[10px] font-semibold ${prio}`}>{task.priority}</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-[10px] text-gray-500">
                                  {task.is_blocked && <span className="rounded-md border border-red-500/30 bg-red-900/30 px-2 py-1 text-red-200">Blocked</span>}
                                  {scheduleWarning && <span className="rounded-md border border-yellow-500/30 bg-yellow-900/30 px-2 py-1 text-yellow-200">Schedule warning</span>}
                                  <span className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-1"><Clock className="h-3 w-3" />{task.estimated_days}d</span>
                                  {sched && (
                                    <span className={`rounded-md px-2 py-1 ${overdue ? "bg-red-900/30 text-red-300" : "bg-white/5 text-gray-500"}`}>
                                      Due {sched.end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                    </span>
                                  )}
                                  <span className="rounded-md bg-purple-900/20 px-2 py-1 text-purple-300">{project.name}</span>
                                  {latest && <span className="rounded-md bg-white/5 px-2 py-1 text-gray-500">Activity {latest}</span>}
                                </div>
                                <div className="mt-3 flex items-center justify-between gap-3">
                                  <div className="min-w-0 text-xs text-gray-400">
                                    {assignee ? (
                                      <span className="flex items-center gap-2 truncate">
                                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-purple-600 to-purple-800 text-[10px] font-bold text-white">{getInitials(assignee.full_name, assignee.email)}</span>
                                        <span className="truncate">{assignee.full_name ?? assignee.email}</span>
                                      </span>
                                    ) : (
                                      <span className="text-gray-600">Unassigned</span>
                                    )}
                                  </div>
                                  {task.status === "Done" && <CheckCircle2 className="h-4 w-4 shrink-0 text-green-400" />}
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {filteredTasks.map((task) => {
                const assignee = members.find((m) => m.user_id === task.assigned_to);
                const isDone = task.status === "Done";
                const isSelected = selectedTaskId === task.id;
                const sched = scheduleMap.get(task.id);
                const prio = PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.Medium;
                const isDropdownOpen = assignDropdownId === task.id;
                const scheduleWarning = sched?.hasDependencyWarning;
                const latest = task.latest_activity_at ? new Date(task.latest_activity_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null;

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
                            {task.is_blocked && <span className="px-2 py-0.5 rounded text-[10px] font-semibold border border-red-500/40 bg-red-900/30 text-red-300">Blocked</span>}
                            {scheduleWarning && <span className="px-2 py-0.5 rounded text-[10px] font-semibold border border-yellow-500/40 bg-yellow-900/30 text-yellow-300">Schedule warning</span>}
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${prio}`}>{task.priority}</span>
                            <span className="flex items-center gap-1 text-[10px] text-gray-400"><Clock className="w-3 h-3" />{task.estimated_days}d</span>
                            {(task.assigned_tech ?? []).slice(0, 2).map((t) => (
                              <span key={t} className="px-2 py-0.5 rounded text-[10px] bg-purple-900/30 border border-purple-500/20 text-purple-300">{t}</span>
                            ))}
                            {(task.assigned_tech ?? []).length > 2 && <span className="text-[10px] text-gray-500">+{task.assigned_tech.length - 2}</span>}
                            {sched && <span className="text-[10px] text-gray-500">{sched.start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} → {sched.end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
                            {latest && <span className="text-[10px] text-gray-500">Activity {latest}</span>}
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
      <div className="w-full h-[60vh] lg:h-auto lg:w-[400px] xl:w-[440px] shrink-0 min-h-0 bg-linear-to-br from-purple-950/35 to-black/45 backdrop-blur-2xl border border-purple-500/45 rounded-2xl flex flex-col overflow-hidden shadow-xl shadow-purple-500/20 relative">
        <div className="absolute inset-0 bg-linear-to-br from-purple-500/5 to-transparent pointer-events-none" />

        {selectedTask ? (
          <TaskDetailPanel
            key={selectedTask.id}
            task={selectedTask}
            schedule={scheduleMap.get(selectedTask.id) ?? null}
            members={members}
            projectDesc={project.description}
            currentUserId={currentUserId}
            onComplete={handleCompleteTask}
            onTaskUpdated={handleTaskUpdated}
            allTasks={tasks}
            onAddDependency={handleAddDependency}
            onRemoveDependency={handleRemoveDependency}
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
