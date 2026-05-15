import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Calendar as CalendarIcon, CheckCircle2, Circle, Pencil, Send, Sparkles, Tag, User as UserIcon, Clock, Check, X, AlertTriangle, Link2, Plus, Paperclip, Image as ImageIcon, MessageSquare, History, Upload, Trash2 } from "lucide-react";
import { api, type Task, type ProjectMember, type TaskComment, type TaskAttachment, type TaskActivity } from "../lib/api";

interface ChatMessage { role: "user" | "ai"; content: string; }

interface ScheduleInfo { start: Date; end: Date; hasDependencyWarning?: boolean; warning?: string; }

const PRIORITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  High: { bg: "bg-red-900/40 border-red-500/40", text: "text-red-300", label: "🔴 High" },
  Medium: { bg: "bg-yellow-900/40 border-yellow-500/40", text: "text-yellow-300", label: "🟡 Medium" },
  Low: { bg: "bg-green-900/40 border-green-500/40", text: "text-green-300", label: "🟢 Low" },
};

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function parseSteps(desc: string | null): { summary: string; steps: string[] } {
  if (!desc) return { summary: "", steps: [] };
  const parts = desc.split(/\nSteps:\n|\nsteps:\n/i);
  const summary = (parts[0] ?? "").trim();
  const steps = parts[1]
    ? parts[1].split("\n").map(s => s.replace(/^\d+\.\s*/, "").trim()).filter(Boolean)
    : [];
  return { summary, steps };
}

interface Props {
  task: Task;
  schedule: ScheduleInfo | null;
  members: ProjectMember[];
  projectDesc?: string;
  currentUserId?: string;
  allTasks?: Task[];
  onComplete: (taskId: string, completed: boolean) => void;
  onTaskUpdated?: (updated: Task) => void;
  onAddDependency?: (taskId: string, dependsOnTaskId: string) => Promise<void>;
  onRemoveDependency?: (taskId: string, dependsOnTaskId: string) => Promise<void>;
  onBack: () => void;
}

function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function displayUser(user?: { full_name: string | null; email: string } | null): string {
  return user?.full_name ?? user?.email ?? "Someone";
}

function formatCompactDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function fileSizeLabel(size: number | null): string {
  if (!size) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function wouldCreateCycle(taskId: string, blockerId: string, tasks: Task[]): boolean {
  const graph = new Map<string, string[]>();
  for (const item of tasks) {
    for (const dep of item.blocked_by ?? []) {
      if (!graph.has(dep.id)) graph.set(dep.id, []);
      graph.get(dep.id)!.push(item.id);
    }
  }
  if (!graph.has(blockerId)) graph.set(blockerId, []);
  graph.get(blockerId)!.push(taskId);

  const seen = new Set<string>();
  const stack = [taskId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === blockerId) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    stack.push(...(graph.get(current) ?? []));
  }
  return false;
}

export function TaskDetailPanel({
  task,
  schedule,
  members,
  projectDesc,
  currentUserId,
  allTasks = [],
  onComplete,
  onTaskUpdated,
  onAddDependency,
  onRemoveDependency,
  onBack
}: Props) {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>([
    { role: "ai", content: `How can I help you with "${task.title}"?` },
  ]);
  const [sending, setSending] = useState(false);
  const [chatHeight, setChatHeight] = useState(220);
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [schedStart, setSchedStart] = useState("");
  const [schedEnd, setSchedEnd] = useState("");
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [selectedBlockerId, setSelectedBlockerId] = useState("");
  const [dependencyError, setDependencyError] = useState<string | null>(null);
  const [savingDependency, setSavingDependency] = useState<string | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [activity, setActivity] = useState<TaskActivity[]>([]);
  const [collabLoading, setCollabLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [savingComment, setSavingComment] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [collabError, setCollabError] = useState<string | null>(null);
  const [savingPriority, setSavingPriority] = useState(false);
  const chatEnd = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);

  const openScheduleEdit = () => {
    setSchedStart(task.start_date ?? (schedule ? toDateInput(schedule.start) : ""));
    setSchedEnd(task.end_date ?? (schedule ? toDateInput(schedule.end) : ""));
    setEditingSchedule(true);
  };

  const saveSchedule = async () => {
    if (!schedStart || !schedEnd) return;
    setSavingSchedule(true);
    try {
      const start = new Date(schedStart);
      const end = new Date(schedEnd);
      const estimatedDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1);
      await api.tasks.updateSchedule(task.id, { start_date: schedStart, end_date: schedEnd, estimated_days: estimatedDays, user_id: currentUserId ?? null });
      onTaskUpdated?.({ ...task, start_date: schedStart, end_date: schedEnd, estimated_days: estimatedDays, latest_activity_at: new Date().toISOString() });
      setEditingSchedule(false);
    } catch {
      // leave edit open on error
    } finally {
      setSavingSchedule(false);
    }
  };

  const startDrag = (clientY: number) => {
    dragRef.current = { startY: clientY, startHeight: chatHeight };

    const onMove = (ev: MouseEvent | TouchEvent) => {
      if (!dragRef.current) return;
      const y = ev instanceof MouseEvent ? ev.clientY : ev.touches[0].clientY;
      const delta = dragRef.current.startY - y; // drag up → bigger chat
      setChatHeight(Math.max(120, Math.min(440, dragRef.current.startHeight + delta)));
    };
    const onUp = () => {
      dragRef.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onUp);
  };
  const isDone = task.status === "Done";
  const priority = PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES.Medium;
  const { summary, steps } = parseSteps(task.description);
  const assignee = members.find(m => m.user_id === task.assigned_to);
  const unfinishedBlockers = (task.blocked_by ?? []).filter((item) => item.status !== "Done");
  const availableBlockers = allTasks.filter((item) => (
    item.id !== task.id &&
    item.project_id === task.project_id &&
    !(task.blocked_by ?? []).some((dep) => dep.id === item.id) &&
    !wouldCreateCycle(task.id, item.id, allTasks)
  ));

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);
  useEffect(() => {
    api.tasks.collaboration(task.id)
      .then((data) => {
        setComments(data.comments);
        setAttachments(data.attachments);
        setActivity(data.activity);
      })
      .catch((err) => setCollabError(err instanceof Error ? err.message : "Failed to load collaboration"))
      .finally(() => setCollabLoading(false));
  }, [task.id]);

  const sendMsg = async () => {
    if (!message.trim() || sending) return;
    const msg = message.trim();
    setMessage("");
    setChat(p => [...p, { role: "user", content: msg }]);
    setSending(true);
    try {
      const ctx = `Task: ${task.title}\nTech: ${(task.assigned_tech ?? []).join(", ")}\nDescription: ${task.description ?? ""}\nProject: ${projectDesc ?? ""}`;
      const { response } = await api.ai.chat({ message: msg, context: ctx });
      setChat(p => [...p, { role: "ai", content: response }]);
    } catch {
      setChat(p => [...p, { role: "ai", content: "I'm having trouble connecting. Please try again." }]);
    } finally { setSending(false); }
  };

  const addBlocker = async () => {
    if (!selectedBlockerId || !onAddDependency) return;
    setSavingDependency(selectedBlockerId);
    setDependencyError(null);
    try {
      await onAddDependency(task.id, selectedBlockerId);
      setSelectedBlockerId("");
    } catch (err) {
      setDependencyError(err instanceof Error ? err.message : "Could not add blocker");
    } finally {
      setSavingDependency(null);
    }
  };

  const removeBlocker = async (blockerId: string) => {
    if (!onRemoveDependency) return;
    setSavingDependency(blockerId);
    setDependencyError(null);
    try {
      await onRemoveDependency(task.id, blockerId);
    } catch (err) {
      setDependencyError(err instanceof Error ? err.message : "Could not remove blocker");
    } finally {
      setSavingDependency(null);
    }
  };

  const mentionedUserIds = (text: string): string[] => {
    const lower = text.toLowerCase();
    return members
      .filter((member) => {
        const name = (member.full_name ?? "").toLowerCase();
        const emailName = member.email.split("@")[0].toLowerCase();
        return (name && lower.includes(`@${name}`)) || lower.includes(`@${emailName}`);
      })
      .map((member) => member.user_id);
  };

  const addComment = async () => {
    if (!commentText.trim() || savingComment) return;
    setSavingComment(true);
    setCollabError(null);
    try {
      const { comment } = await api.tasks.addComment(task.id, {
        user_id: currentUserId ?? null,
        content: commentText.trim(),
        mentioned_user_ids: mentionedUserIds(commentText),
      });
      setComments((current) => [...current, comment]);
      setActivity((current) => [{ id: `local-${Date.now()}`, task_id: task.id, user_id: currentUserId ?? null, activity_type: "comment_added", summary: "Added a comment", metadata: {}, created_at: new Date().toISOString() }, ...current]);
      onTaskUpdated?.({ ...task, latest_activity_at: new Date().toISOString() });
      setCommentText("");
    } catch (err) {
      setCollabError(err instanceof Error ? err.message : "Could not add comment");
    } finally {
      setSavingComment(false);
    }
  };

  const saveCommentEdit = async (commentId: string) => {
    if (!editingText.trim()) return;
    setSavingComment(true);
    try {
      const { comment } = await api.tasks.updateComment(task.id, commentId, { user_id: currentUserId ?? null, content: editingText.trim() });
      setComments((current) => current.map((item) => item.id === commentId ? comment : item));
      setEditingCommentId(null);
      setEditingText("");
    } catch (err) {
      setCollabError(err instanceof Error ? err.message : "Could not edit comment");
    } finally {
      setSavingComment(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    await api.tasks.deleteComment(task.id, commentId, currentUserId ?? null);
    setComments((current) => current.filter((item) => item.id !== commentId));
  };

  const uploadAttachment = async (file: File) => {
    setUploadingAttachment(true);
    setCollabError(null);
    try {
      const { attachment } = await api.tasks.uploadAttachment(task.id, file, currentUserId ?? null);
      setAttachments((current) => [attachment, ...current]);
      setActivity((current) => [{ id: `local-${Date.now()}`, task_id: task.id, user_id: currentUserId ?? null, activity_type: "file_uploaded", summary: `Uploaded ${file.name}`, metadata: {}, created_at: new Date().toISOString() }, ...current]);
      onTaskUpdated?.({ ...task, latest_activity_at: new Date().toISOString() });
    } catch (err) {
      setCollabError(err instanceof Error ? err.message : "Could not upload file");
    } finally {
      setUploadingAttachment(false);
    }
  };

  const updatePriority = async (priorityValue: string) => {
    if (priorityValue === task.priority) return;
    setSavingPriority(true);
    setCollabError(null);
    try {
      await api.tasks.updatePriority(task.id, priorityValue, currentUserId ?? null);
      onTaskUpdated?.({ ...task, priority: priorityValue, latest_activity_at: new Date().toISOString() });
      setActivity((current) => [{ id: `local-${Date.now()}`, task_id: task.id, user_id: currentUserId ?? null, activity_type: "priority_changed", summary: `Changed priority to ${priorityValue}`, metadata: {}, created_at: new Date().toISOString() }, ...current]);
    } catch (err) {
      setCollabError(err instanceof Error ? err.message : "Could not update priority");
    } finally {
      setSavingPriority(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-5 border-b border-purple-500/30 bg-linear-to-r from-purple-600/12 to-black/20">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-3 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to AI Assistant
        </button>
        <h3 className="text-xl font-semibold text-white mb-3 leading-snug">{task.title}</h3>
        {task.is_blocked && (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-900/20 px-3 py-2 text-xs text-red-100">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-300" />
            <span>Blocked by {unfinishedBlockers.map((item) => item.title).join(", ")}</span>
          </div>
        )}
        {(() => {
          const canComplete = task.assigned_to !== null && task.assigned_to === currentUserId;
          return (
            <motion.button
              whileHover={canComplete ? { scale: 1.02 } : {}}
              whileTap={canComplete ? { scale: 0.97 } : {}}
              onClick={() => canComplete && onComplete(task.id, !isDone)}
              title={!canComplete ? "Only the assigned user can complete this task" : undefined}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${isDone
                ? "bg-green-900/40 border-green-500/50 text-green-300 hover:bg-green-900/60"
                : canComplete
                  ? "bg-white/5 border-white/15 text-gray-300 hover:border-purple-500/50 hover:bg-purple-900/20"
                  : "bg-white/5 border-white/10 text-gray-600 cursor-not-allowed"
              }`}
            >
              {isDone ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
              {isDone ? "Completed" : "Mark Complete"}
            </motion.button>
          );
        })()}
      </div>

      {/* Task detail scroll area — independent from chat */}
      <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5">
        {/* Schedule */}
        {(schedule || task.start_date) && (
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            {editingSchedule ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                  <CalendarIcon className="w-3.5 h-3.5 text-purple-400" /> Edit timeframe
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <input type="date" value={schedStart} onChange={e => setSchedStart(e.target.value)}
                    className="flex-1 min-w-0 px-2 py-1.5 bg-black/40 border border-purple-500/40 rounded-lg text-sm text-white focus:outline-none focus:border-purple-400" />
                  <span className="text-gray-500 text-xs">→</span>
                  <input type="date" value={schedEnd} onChange={e => setSchedEnd(e.target.value)}
                    className="flex-1 min-w-0 px-2 py-1.5 bg-black/40 border border-purple-500/40 rounded-lg text-sm text-white focus:outline-none focus:border-purple-400" />
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setEditingSchedule(false)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-gray-400 hover:text-white transition-colors">
                    <X className="w-3 h-3" /> Cancel
                  </button>
                  <button onClick={saveSchedule} disabled={savingSchedule || !schedStart || !schedEnd}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs text-white font-semibold transition-colors disabled:opacity-50">
                    {savingSchedule ? <div className="w-3 h-3 border border-white/50 border-t-white rounded-full animate-spin" /> : <Check className="w-3 h-3" />}
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <CalendarIcon className="w-4 h-4 text-purple-400 shrink-0" />
                  <div className="flex-1 text-sm">
                    <span className="text-gray-400">Schedule: </span>
                    <span className="text-white">
                      {schedule ? `${formatDate(schedule.start)} → ${formatDate(schedule.end)}` : `${task.start_date} → ${task.end_date}`}
                    </span>
                  </div>
                  <button onClick={openScheduleEdit} className="shrink-0 p-1 rounded-md text-gray-500 hover:text-purple-300 hover:bg-purple-900/30 transition-colors" title="Edit schedule">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
                {schedule?.hasDependencyWarning && (
                  <div className="flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-900/20 px-3 py-2 text-xs text-yellow-100">
                    <AlertTriangle className="h-3.5 w-3.5 text-yellow-300" />
                    {schedule.warning ?? "Schedule warning"}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Priority + Days */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${priority.bg} ${priority.text}`}>
            {priority.label}
          </span>
          <select
            value={task.priority}
            onChange={(e) => updatePriority(e.target.value)}
            disabled={savingPriority}
            className="rounded-lg border border-white/10 bg-black/35 px-2 py-1.5 text-xs text-gray-300 outline-none focus:border-purple-500/60 disabled:opacity-40"
          >
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-white/5 border border-white/10 text-gray-300">
            <Clock className="w-3 h-3" /> {task.estimated_days}d
          </span>
        </div>

        {/* Assignee */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
          <UserIcon className="w-4 h-4 text-purple-400 shrink-0" />
          <span className="text-sm text-gray-300">
            {assignee ? (assignee.full_name ?? assignee.email) : "Unassigned"}
          </span>
        </div>

        {/* Dependencies */}
        <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-300">
            <Link2 className="h-4 w-4 text-purple-400" /> Blocked by
          </div>
          {(task.blocked_by ?? []).length === 0 ? (
            <p className="text-xs text-gray-600">No blockers</p>
          ) : (
            <div className="space-y-2">
              {(task.blocked_by ?? []).map((blocker) => (
                <div key={blocker.id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/25 px-3 py-2">
                  <span className={`h-2 w-2 rounded-full ${blocker.status === "Done" ? "bg-green-400" : "bg-red-400"}`} />
                  <span className="min-w-0 flex-1 truncate text-sm text-gray-200">{blocker.title}</span>
                  <span className="text-[10px] text-gray-500">{blocker.status}</span>
                  <button
                    onClick={() => removeBlocker(blocker.id)}
                    disabled={savingDependency === blocker.id}
                    className="rounded-md p-1 text-gray-500 hover:bg-red-900/30 hover:text-red-300 disabled:opacity-40"
                    aria-label={`Remove blocker ${blocker.title}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <select
              value={selectedBlockerId}
              onChange={(e) => setSelectedBlockerId(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-xs text-gray-300 outline-none focus:border-purple-500/60"
            >
              <option value="">Add blocker...</option>
              {availableBlockers.map((item) => (
                <option key={item.id} value={item.id}>{item.title}</option>
              ))}
            </select>
            <button
              onClick={addBlocker}
              disabled={!selectedBlockerId || savingDependency === selectedBlockerId}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-600 text-white transition-colors hover:bg-purple-500 disabled:opacity-40"
              aria-label="Add blocker"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {dependencyError && <p className="text-xs text-red-300">{dependencyError}</p>}

          <div className="border-t border-white/10 pt-3">
            <div className="mb-2 text-sm font-semibold text-gray-300">Unlocks</div>
            {(task.unlocks ?? []).length === 0 ? (
              <p className="text-xs text-gray-600">No dependent tasks</p>
            ) : (
              <div className="space-y-2">
                {(task.unlocks ?? []).map((item) => (
                  <div key={item.id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-gray-200">
                    <span className={`h-2 w-2 rounded-full ${item.status === "Done" ? "bg-green-400" : "bg-purple-400"}`} />
                    <span className="min-w-0 flex-1 truncate">{item.title}</span>
                    <span className="text-[10px] text-gray-500">{item.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tech */}
        {(task.assigned_tech ?? []).length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2 text-sm text-gray-400"><Tag className="w-3.5 h-3.5" /> Tech Stack</div>
            <div className="flex flex-wrap gap-2">
              {task.assigned_tech.map(t => (
                <span key={t} className="px-3 py-1 rounded-lg text-xs bg-purple-900/30 border border-purple-500/30 text-purple-300">{t}</span>
              ))}
            </div>
          </div>
        )}

        {/* Description + Steps */}
        {(summary || steps.length > 0) && (
          <div className="space-y-3">
            {summary && <p className="text-sm text-gray-300 leading-relaxed">{summary}</p>}
            {steps.length > 0 && (
              <div className="space-y-2">
                <span className="text-sm font-semibold text-gray-400">Implementation Steps</span>
                {steps.map((s, i) => (
                  <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-white/3 border border-white/5 text-sm text-gray-300">
                    <span className="shrink-0 flex items-center justify-center w-5 h-5 rounded-md bg-purple-900/50 text-[10px] font-bold text-purple-300">{i + 1}</span>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Completed by */}
        {isDone && task.completed_at && (
          <div className="p-3 rounded-xl bg-green-900/20 border border-green-500/20 text-sm text-green-300">
            ✓ Completed{task.completer_name ? ` by ${task.completer_name}` : ""} on {formatDate(new Date(task.completed_at))}
          </div>
        )}

        {/* Human collaboration */}
        <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-200">
              <MessageSquare className="h-4 w-4 text-purple-400" /> Comments
            </div>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-xs text-gray-300 hover:border-purple-500/40">
              {uploadingAttachment ? <div className="h-3 w-3 animate-spin rounded-full border border-purple-400 border-t-transparent" /> : <Upload className="h-3.5 w-3.5" />}
              Attach
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadAttachment(file);
                  e.target.value = "";
                }}
              />
            </label>
          </div>

          {collabError && <p className="rounded-lg border border-red-500/30 bg-red-900/20 px-3 py-2 text-xs text-red-200">{collabError}</p>}

          <div className="space-y-2">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              rows={3}
              placeholder='Write a comment... use @name to mention someone'
              className="w-full resize-none rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-purple-500/50"
            />
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 text-[10px] text-gray-600">
                {members.slice(0, 3).map((m) => `@${(m.full_name ?? m.email.split("@")[0]).split(" ")[0]}`).join("  ")}
              </div>
              <button
                onClick={addComment}
                disabled={!commentText.trim() || savingComment}
                className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-500 disabled:opacity-40"
              >
                {savingComment ? "Posting..." : "Comment"}
              </button>
            </div>
          </div>

          {collabLoading ? (
            <p className="py-4 text-center text-xs text-gray-500">Loading comments...</p>
          ) : comments.length === 0 ? (
            <p className="rounded-lg border border-dashed border-white/10 py-4 text-center text-xs text-gray-600">No human comments yet</p>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => {
                const isOwn = comment.user_id && comment.user_id === currentUserId;
                const isEditing = editingCommentId === comment.id;
                return (
                  <div key={comment.id} className="rounded-xl border border-white/10 bg-black/25 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-gray-200">{displayUser(comment.users)}</div>
                        <div className="text-[10px] text-gray-600">{formatCompactDate(comment.created_at)}{comment.edited_at ? " · edited" : ""}</div>
                      </div>
                      {isOwn && (
                        <div className="flex items-center gap-1">
                          <button onClick={() => { setEditingCommentId(comment.id); setEditingText(comment.content); }} className="rounded-md p-1 text-gray-500 hover:bg-white/10 hover:text-white">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => deleteComment(comment.id)} className="rounded-md p-1 text-gray-500 hover:bg-red-900/30 hover:text-red-300">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea value={editingText} onChange={(e) => setEditingText(e.target.value)} rows={2} className="w-full resize-none rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-purple-500/50" />
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setEditingCommentId(null)} className="text-xs text-gray-500 hover:text-white">Cancel</button>
                          <button onClick={() => saveCommentEdit(comment.id)} className="rounded-md bg-purple-600 px-2.5 py-1 text-xs text-white">Save</button>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-300">{comment.content}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {attachments.length > 0 && (
            <div className="border-t border-white/10 pt-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-300">
                <Paperclip className="h-4 w-4 text-purple-400" /> Attachments
              </div>
              <div className="grid gap-2">
                {attachments.map((file) => (
                  <a key={file.id} href={file.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/25 p-2 hover:border-purple-500/40">
                    {file.is_image ? (
                      <img src={file.file_url} alt={file.file_name} className="h-10 w-10 rounded-md object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white/5"><ImageIcon className="h-4 w-4 text-gray-400" /></div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-gray-200">{file.file_name}</div>
                      <div className="text-[10px] text-gray-600">{fileSizeLabel(file.file_size)} · {formatCompactDate(file.created_at)}</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {activity.length > 0 && (
            <div className="border-t border-white/10 pt-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-300">
                <History className="h-4 w-4 text-purple-400" /> Activity
              </div>
              <div className="space-y-2">
                {activity.slice(0, 8).map((item) => (
                  <div key={item.id} className="flex gap-2 text-xs text-gray-400">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400/70" />
                    <div className="min-w-0">
                      <span className="text-gray-300">{displayUser(item.users)}</span> {item.summary}
                      <div className="text-[10px] text-gray-600">{formatCompactDate(item.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Chat — resizable section, drag the handle up/down to resize */}
      <div className="shrink-0 flex flex-col" style={{ height: chatHeight }}>
        {/* Drag handle */}
        <div
          onMouseDown={e => startDrag(e.clientY)}
          onTouchStart={e => startDrag(e.touches[0].clientY)}
          className="shrink-0 flex flex-col items-center justify-center h-4 cursor-ns-resize border-t border-purple-500/30 hover:border-purple-400/60 group transition-colors select-none"
        >
          <div className="flex gap-1 mt-0.5">
            <div className="w-6 h-0.5 rounded-full bg-purple-500/40 group-hover:bg-purple-400/80 transition-colors" />
            <div className="w-3 h-0.5 rounded-full bg-purple-500/25 group-hover:bg-purple-400/50 transition-colors" />
          </div>
        </div>

        {/* Chat header */}
        <div className="flex items-center gap-2 px-4 pt-2 pb-2 shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-xs font-semibold text-gray-400 truncate">AI Chat — {task.title}</span>
        </div>

        {/* Messages — scroll independently */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 space-y-2 pb-2">
          {chat.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[88%] p-2.5 rounded-xl text-sm ${m.role === "user"
                ? "bg-linear-to-br from-purple-600 to-purple-900 text-white"
                : "bg-white/[0.07] border border-white/10 text-gray-100"
              }`}>
                <pre className="whitespace-pre-wrap font-sans leading-relaxed">{m.content}</pre>
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-white/10 rounded-xl p-3 flex gap-1.5">
                {[0, 0.2, 0.4].map(d => (
                  <motion.div key={d} animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 0.8, repeat: Infinity, delay: d }} className="w-2 h-2 bg-purple-400 rounded-full" />
                ))}
              </div>
            </div>
          )}
          <div ref={chatEnd} />
        </div>

        {/* Input — always at bottom */}
        <div className="shrink-0 p-3 border-t border-purple-500/20 bg-black/45">
          <div className="flex items-center gap-2">
            <input
              value={message} onChange={e => setMessage(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMsg()}
              placeholder={`Ask about "${task.title}"...`}
              className="min-w-0 flex-1 px-3 py-2 bg-white/[0.07] border border-purple-500/35 rounded-xl focus:outline-none focus:border-purple-400/70 text-white placeholder-gray-500 text-sm"
            />
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={sendMsg} disabled={sending}
              className="h-9 w-9 shrink-0 flex items-center justify-center bg-linear-to-r from-purple-600 to-purple-900 rounded-xl disabled:opacity-50">
              <Send className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
