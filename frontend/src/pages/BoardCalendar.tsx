import { useState, useEffect, useMemo, useRef } from "react";
import { ChevronLeft, ChevronRight, User, Sparkles, AlertTriangle, Calendar, RefreshCw, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router-dom";
import { api, type Task, type Project } from "../lib/api";
import { buildDependencyAwareSchedule } from "../lib/schedule";
import { useAuth } from "../contexts/AuthContext";
import {
  type ScheduledTask,
  projectColors,
  dayLoad,
  buildConflictMap,
  startOfDayMs,
  OVERLOAD_THRESHOLD,
} from "../lib/calendarUtils";

type ViewMode = "day" | "week" | "month" | "year";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
function addDays(date: Date, days: number): Date {
  const d = new Date(date); d.setDate(d.getDate() + days); return d;
}
function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function isTaskOnDate(item: ScheduledTask, date: Date): boolean {
  const d = startOfDayMs(date);
  return d >= startOfDayMs(item.start) && d <= startOfDayMs(item.end);
}
function startOfWeek(date: Date): Date {
  return addDays(startOfDay(date), -date.getDay());
}
function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function buildSchedule(tasks: Task[], projectDurations: Map<string, number>): ScheduledTask[] {
  const map = buildDependencyAwareSchedule(tasks, projectDurations);
  return tasks
    .map((task): ScheduledTask | null => {
      const s = map.get(task.id);
      if (!s) return null;
      return {
        task,
        start: s.start,
        end: s.end,
        ...(s.hasDependencyWarning !== undefined ? { hasDependencyWarning: s.hasDependencyWarning } : {}),
      };
    })
    .filter((x): x is ScheduledTask => x !== null);
}

export function BoardCalendar() {
  const { session } = useAuth();
  const currentUserId = session?.user.id ?? null;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectDurations, setProjectDurations] = useState<Map<string, number>>(new Map());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [myScheduleOnly, setMyScheduleOnly] = useState(false);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [calConnected, setCalConnected] = useState(false);
  const previousTasksRef = useRef<Task[]>([]);

  useEffect(() => {
    Promise.all([api.tasks.list(), api.projects.list()])
      .then(([{ tasks: t }, { projects }]) => {
        setTasks(t);
        previousTasksRef.current = t;
        const map = new Map<string, number>();
        (projects as Project[]).forEach((p) => { if (p.duration_weeks) map.set(p.id, p.duration_weeks); });
        setProjectDurations(map);
      })
      .finally(() => setLoading(false));

    if (currentUserId) {
      api.calendar.status(currentUserId)
        .then(({ connections }) => setCalConnected(connections.some((c) => c.sync_enabled)))
        .catch(() => {});
    }
  }, [currentUserId]);

  const projectOptions = useMemo(() => {
    const seen = new Map<string, string>();
    tasks.forEach((t) => {
      if (t.project_id && !seen.has(t.project_id))
        seen.set(t.project_id, t.project_name ?? t.project_id);
    });
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [tasks]);

  const scheduledTasks = useMemo(() => {
    let filtered = selectedProjectId ? tasks.filter((t) => t.project_id === selectedProjectId) : tasks;
    if (myScheduleOnly && currentUserId)
      filtered = filtered.filter((t) => t.assigned_to === currentUserId);
    return buildSchedule(filtered, projectDurations);
  }, [tasks, selectedProjectId, myScheduleOnly, currentUserId, projectDurations]);

  const conflictMap = useMemo(() => buildConflictMap(scheduledTasks), [scheduledTasks]);

  const depWarningIds = useMemo(
    () => new Set(scheduledTasks.filter((s) => s.hasDependencyWarning).map((s) => s.task.id)),
    [scheduledTasks]
  );

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  function getTasksForDate(date: Date): ScheduledTask[] {
    return scheduledTasks.filter((item) => isTaskOnDate(item, date));
  }

  function getViewTitle(): string {
    if (viewMode === "day")
      return currentDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    if (viewMode === "week") {
      const s = startOfWeek(currentDate);
      const e = addDays(s, 6);
      return `${formatShortDate(s)} – ${formatShortDate(e)}, ${e.getFullYear()}`;
    }
    if (viewMode === "year") return String(year);
    return `${MONTH_NAMES[month]} ${year}`;
  }

  function navigate(direction: -1 | 1) {
    if (viewMode === "day") setCurrentDate(addDays(currentDate, direction));
    if (viewMode === "week") setCurrentDate(addDays(currentDate, direction * 7));
    if (viewMode === "month") setCurrentDate(new Date(year, month + direction, 1));
    if (viewMode === "year") setCurrentDate(new Date(year + direction, month, 1));
  }

  async function handleDrop(date: Date) {
    if (!draggingTaskId) return;
    const item = scheduledTasks.find((s) => s.task.id === draggingTaskId);
    if (!item) return;

    const durationMs = item.end.getTime() - item.start.getTime();
    const newStart = startOfDay(date);
    const newEnd = new Date(newStart.getTime() + durationMs);
    const fmt = (d: Date) => d.toISOString().split("T")[0];

    const snapshot = [...tasks];
    setTasks((prev) =>
      prev.map((t) =>
        t.id === draggingTaskId ? { ...t, start_date: fmt(newStart), end_date: fmt(newEnd) } : t
      )
    );
    setDraggingTaskId(null);
    setDragOverDate(null);
    setSavingIds((prev) => new Set(prev).add(draggingTaskId));

    try {
      await api.tasks.updateSchedule(draggingTaskId, {
        start_date: fmt(newStart),
        end_date: fmt(newEnd),
        ...(currentUserId && { user_id: currentUserId }),
      });
    } catch {
      setTasks(snapshot);
    } finally {
      setSavingIds((prev) => { const next = new Set(prev); next.delete(draggingTaskId!); return next; });
    }
  }

  async function getAiSuggestion() {
    setAiLoading(true);
    setShowAiPanel(true);
    const summary = scheduledTasks
      .slice(0, 20)
      .map((s) => `"${s.task.title}" (${formatShortDate(s.start)}→${formatShortDate(s.end)}, status: ${s.task.status}${s.hasDependencyWarning ? ", DEP WARNING" : ""}${conflictMap.has(s.task.id) ? ", CONFLICT" : ""})`)
      .join("\n");
    try {
      const { response } = await api.ai.chat({
        message: `Review this project schedule and give 3 specific, actionable optimization suggestions to reduce conflicts, balance workload, and improve delivery confidence. Be concise.\n\nSchedule:\n${summary}`,
      });
      setAiSuggestion(response);
    } catch {
      setAiSuggestion("Could not load suggestion. Please try again.");
    } finally {
      setAiLoading(false);
    }
  }

  function TaskPill({ item, compact = false }: { item: ScheduledTask; compact?: boolean }) {
    const colors = projectColors(item.task.project_id ?? "default");
    const isBlocked = item.task.is_blocked;
    const hasConflict = conflictMap.has(item.task.id);
    const hasDepWarn = depWarningIds.has(item.task.id);
    const isSaving = savingIds.has(item.task.id);
    const isDragging = draggingTaskId === item.task.id;

    return (
      <Link to={`/task/${item.task.id}`}>
        <motion.div
          draggable
          onDragStart={(e) => { e.stopPropagation(); setDraggingTaskId(item.task.id); }}
          onDragEnd={() => { setDraggingTaskId(null); setDragOverDate(null); }}
          whileHover={{ scale: 1.03, x: 1 }}
          className={[
            colors.bg,
            "text-white font-medium border backdrop-blur-sm cursor-grab active:cursor-grabbing transition-all",
            compact ? "text-[10px] px-2 py-1 rounded" : "text-xs px-3 py-2 rounded-lg",
            isBlocked ? `border-dashed border-2 ${colors.border} opacity-70` : `border ${colors.border}`,
            hasConflict ? "ring-2 ring-yellow-400/70" : "",
            hasDepWarn ? "ring-2 ring-orange-400/70" : "",
            isSaving ? "opacity-40" : "",
            isDragging ? "opacity-30 scale-95" : "",
          ].filter(Boolean).join(" ")}
          title={[
            item.task.title,
            `${formatShortDate(item.start)} – ${formatShortDate(item.end)}`,
            isBlocked ? "⚠ Blocked" : "",
            hasConflict ? `⚡ ${conflictMap.get(item.task.id)}` : "",
            hasDepWarn ? "🔗 Starts before a blocker finishes" : "",
          ].filter(Boolean).join(" · ")}
        >
          <span className="block truncate">{item.task.title}</span>
          {!compact && (
            <span className="block text-[10px] opacity-70">
              {formatShortDate(item.start)} – {formatShortDate(item.end)}
            </span>
          )}
        </motion.div>
      </Link>
    );
  }

  function DayCell({ date, children, className = "" }: { date: Date; children: React.ReactNode; className?: string }) {
    const dateKey = date.toISOString().split("T")[0];
    const isDragOver = dragOverDate === dateKey;
    return (
      <div
        className={`${className} ${isDragOver ? "ring-2 ring-purple-400/60 bg-purple-900/20" : ""} transition-all`}
        onDragOver={(e) => { e.preventDefault(); setDragOverDate(dateKey); }}
        onDragLeave={() => setDragOverDate((prev) => prev === dateKey ? null : prev)}
        onDrop={(e) => { e.preventDefault(); handleDrop(date); }}
      >
        {children}
      </div>
    );
  }

  function renderDayView() {
    const dayTasks = getTasksForDate(currentDate);
    const load = dayLoad(currentDate, scheduledTasks);
    return (
      <div className="grid gap-4">
        <div className={`rounded-xl border p-5 ${load >= OVERLOAD_THRESHOLD ? "border-amber-500/40 bg-amber-900/10" : "border-purple-500/30 bg-purple-900/10"}`}>
          <div className="text-sm uppercase tracking-wider text-purple-300">{DAY_NAMES[currentDate.getDay()]}</div>
          <div className="mt-1 text-3xl font-light">{currentDate.getDate()}</div>
          {load >= OVERLOAD_THRESHOLD && <div className="mt-1 text-xs text-amber-400">⚠ Overloaded — {load} tasks</div>}
        </div>
        {dayTasks.length === 0
          ? <div className="rounded-xl border border-white/10 bg-white/2 p-8 text-center text-gray-500">No scheduled work for this day</div>
          : dayTasks.map((item) => <TaskPill key={item.task.id} item={item} />)}
      </div>
    );
  }

  function renderWeekView() {
    const weekStart = startOfWeek(currentDate);
    return (
      <div className="grid grid-cols-7 gap-3 min-w-[900px]">
        {Array.from({ length: 7 }).map((_, i) => {
          const date = addDays(weekStart, i);
          const dayTasks = getTasksForDate(date);
          const isToday = isSameDay(today, date);
          const load = dayLoad(date, scheduledTasks);
          const overloaded = load >= OVERLOAD_THRESHOLD;
          return (
            <DayCell
              key={date.toISOString()}
              date={date}
              className={`min-h-[520px] rounded-xl border p-3 ${
                overloaded ? "border-amber-500/40 bg-amber-900/8" :
                isToday ? "border-purple-500/50 bg-purple-900/10" :
                "border-white/10 bg-white/2"
              }`}
            >
              <div className="mb-4">
                <div className="text-xs uppercase tracking-wider text-gray-500">{DAY_NAMES[date.getDay()]}</div>
                <div className={isToday ? "text-purple-300" : overloaded ? "text-amber-300" : "text-gray-200"}>{formatShortDate(date)}</div>
                {overloaded && <div className="text-[10px] text-amber-500 mt-0.5">{load} tasks</div>}
              </div>
              <div className="space-y-2">
                {dayTasks.map((item) => <TaskPill key={item.task.id} item={item} compact />)}
              </div>
            </DayCell>
          );
        })}
      </div>
    );
  }

  function renderMonthView() {
    return (
      <>
        <div className="grid grid-cols-7 gap-3 mb-4">
          {DAY_NAMES.map((day) => (
            <div key={day} className="text-center text-gray-500 text-xs uppercase tracking-wider py-2">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-3">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} className="aspect-square" />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const date = new Date(year, month, day);
            const dayTasks = getTasksForDate(date);
            const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
            const load = dayLoad(date, scheduledTasks);
            const overloaded = load >= OVERLOAD_THRESHOLD;
            return (
              <DayCell
                key={day}
                date={date}
                className={`aspect-square border rounded-lg p-2 relative overflow-hidden group transition-all duration-200 ${
                  overloaded ? "border-amber-500/40 bg-amber-900/8" :
                  isToday ? "border-purple-500/50 bg-purple-900/10" :
                  "border-white/10 hover:border-white/20 bg-white/2 hover:bg-white/4"
                }`}
              >
                <motion.div className="absolute inset-0 bg-linear-to-br from-purple-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className={`text-sm font-medium mb-1 relative z-10 ${isToday ? "text-purple-400" : overloaded ? "text-amber-400" : "text-gray-300"}`}>
                  {day}
                  {overloaded && <span className="ml-1 text-[9px] text-amber-500">●</span>}
                </div>
                <div className="space-y-1 relative z-10">
                  {dayTasks.slice(0, 3).map((item) => <TaskPill key={item.task.id} item={item} compact />)}
                  {dayTasks.length > 3 && <div className="text-[9px] text-gray-500 px-1">+{dayTasks.length - 3} more</div>}
                </div>
                {isToday && <div className="absolute top-1 right-1 w-2 h-2 bg-purple-500 rounded-full shadow-lg shadow-purple-500/50" />}
              </DayCell>
            );
          })}
        </div>
      </>
    );
  }

  function renderYearView() {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {MONTH_NAMES.map((name, monthIndex) => {
          const monthTasks = scheduledTasks.filter(
            (s) => s.start.getFullYear() === year && s.start.getMonth() === monthIndex
          );
          return (
            <div key={name} className="min-h-44 rounded-xl border border-white/10 bg-white/2 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-lg font-light">{name}</h4>
                <span className="text-xs text-gray-500">{monthTasks.length} tasks</span>
              </div>
              <div className="space-y-2">
                {monthTasks.slice(0, 4).map((item) => <TaskPill key={item.task.id} item={item} compact />)}
                {monthTasks.length === 0 && <p className="text-sm text-gray-600">No scheduled work</p>}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 p-6 sm:p-8 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-3xl mb-1 font-light">Board Calendar</h2>
          <p className="text-gray-400 text-sm">Project timeline and task schedule</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {currentUserId && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setMyScheduleOnly((v) => !v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                myScheduleOnly
                  ? "border-purple-500/60 bg-purple-900/25 text-purple-200"
                  : "border-white/10 bg-white/3 text-gray-400 hover:text-gray-300 hover:border-white/20"
              }`}
            >
              <User className="w-4 h-4" /> My Schedule
            </motion.button>
          )}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={getAiSuggestion}
            disabled={aiLoading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/3 text-sm text-gray-400 hover:text-gray-300 hover:border-white/20 transition-all disabled:opacity-50"
          >
            {aiLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            AI Optimize
          </motion.button>
          <select
            value={selectedProjectId ?? ""}
            onChange={(e) => setSelectedProjectId(e.target.value || null)}
            className="rounded-lg border border-white/10 bg-black/40 backdrop-blur-sm px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-purple-500/50 transition-colors"
          >
            <option value="">All Projects</option>
            {projectOptions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm border border-white/10 rounded-lg p-1">
            {(["day", "week", "month", "year"] as ViewMode[]).map((mode) => (
              <motion.button
                key={mode}
                onClick={() => setViewMode(mode)}
                whileTap={{ scale: 0.98 }}
                className={`relative px-3 py-1.5 rounded-md transition-all duration-200 capitalize text-sm overflow-hidden ${viewMode === mode ? "text-white" : "text-gray-400 hover:text-white"}`}
              >
                {viewMode === mode && (
                  <motion.div layoutId="activeViewMode" className="absolute inset-0 bg-linear-to-r from-purple-900 to-black" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />
                )}
                <span className="relative z-10">{mode}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Banners */}
      <AnimatePresence>
        {conflictMap.size > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="mb-4 flex items-center gap-3 rounded-xl border border-yellow-500/30 bg-yellow-900/15 px-4 py-3 text-sm text-yellow-300"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 text-yellow-400" />
            <span><strong>{conflictMap.size}</strong> task{conflictMap.size > 1 ? "s have" : " has"} scheduling conflicts — same assignee with overlapping dates.</span>
          </motion.div>
        )}
        {depWarningIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="mb-4 flex items-center gap-3 rounded-xl border border-orange-500/30 bg-orange-900/15 px-4 py-3 text-sm text-orange-300"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 text-orange-400" />
            <span><strong>{depWarningIds.size}</strong> task{depWarningIds.size > 1 ? "s start" : " starts"} before a dependency finishes — dependency order may be violated.</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Panel */}
      <AnimatePresence>
        {showAiPanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="mb-4 rounded-xl border border-purple-500/30 bg-purple-900/15 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-purple-300 mb-2">
                <Sparkles className="w-4 h-4" /> AI Schedule Optimization
              </div>
              <button onClick={() => setShowAiPanel(false)} className="text-gray-500 hover:text-gray-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            {aiLoading
              ? <div className="flex items-center gap-2 text-sm text-gray-400"><RefreshCw className="w-4 h-4 animate-spin" /> Analyzing schedule…</div>
              : <p className="text-sm text-gray-300 whitespace-pre-line leading-relaxed">{aiSuggestion}</p>
            }
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nav */}
      <div className="flex items-center justify-between mb-5">
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate(-1)} className="p-2 rounded-lg border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all">
          <ChevronLeft className="w-5 h-5" />
        </motion.button>
        <h3 className="text-2xl font-light">{getViewTitle()}</h3>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate(1)} className="p-2 rounded-lg border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all">
          <ChevronRight className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Calendar area */}
      <div className="flex-1 min-h-0 bg-white/2 backdrop-blur-sm border border-white/10 rounded-xl p-6 overflow-auto">
        {loading
          ? <div className="flex items-center justify-center h-32 text-gray-500"><div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mr-3" />Loading tasks...</div>
          : <>
              {viewMode === "day" && renderDayView()}
              {viewMode === "week" && renderWeekView()}
              {viewMode === "month" && renderMonthView()}
              {viewMode === "year" && renderYearView()}
            </>
        }
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-5 px-1">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-gray-500">Projects:</span>
          {projectOptions.slice(0, 6).map((p) => {
            const c = projectColors(p.id);
            return (
              <button key={p.id} onClick={() => setSelectedProjectId(selectedProjectId === p.id ? null : p.id)} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors">
                <span className={`w-2.5 h-2.5 rounded-full ${c.dot} ${selectedProjectId === p.id ? "ring-2 ring-white/40" : ""}`} />
                {p.name}
              </button>
            );
          })}
        </div>
        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="inline-block w-4 h-0.5 border-b-2 border-dashed border-gray-500" /> Blocked
          </div>
          <div className="flex items-center gap-1.5 text-xs text-yellow-600"><span className="w-2 h-2 rounded-full bg-yellow-400/70 ring-1 ring-yellow-400/60" /> Conflict</div>
          <div className="flex items-center gap-1.5 text-xs text-orange-600"><span className="w-2 h-2 rounded-full bg-orange-400/70 ring-1 ring-orange-400/60" /> Dep. warning</div>
          <div className="flex items-center gap-1.5 text-xs text-amber-600"><span className="w-2 h-2 rounded-full bg-amber-400" /> Overloaded day</div>
          <div className={`flex items-center gap-1.5 text-xs ${calConnected ? "text-emerald-400" : "text-gray-600"}`}>
            <Calendar className="w-3.5 h-3.5" />
            {calConnected ? "Calendar synced" : "No calendar sync"}
          </div>
        </div>
      </div>
    </div>
  );
}
