import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { api, type Task } from "../lib/api";

type ViewMode = "day" | "week" | "month" | "year";

const TASK_COLORS = {
  backend: "bg-purple-600/90 border-purple-400/30",
  frontend: "bg-emerald-600/90 border-emerald-400/30",
  ui: "bg-violet-600/90 border-violet-400/30",
  critical: "bg-rose-600/90 border-rose-400/30",
} as const;

type TaskType = keyof typeof TASK_COLORS;

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface ScheduledTask {
  task: Task;
  start: Date;
  end: Date;
}

function getTaskType(task: Task): TaskType {
  const tech = (task.assigned_tech ?? []).join(" ").toLowerCase();
  const title = task.title.toLowerCase();
  if (title.includes("ui") || title.includes("design") || title.includes("ux")) return "ui";
  if (
    tech.includes("react") ||
    tech.includes("vue") ||
    tech.includes("css") ||
    title.includes("frontend") ||
    title.includes("component")
  )
    return "frontend";
  if (task.status === "Done") return "critical";
  return "backend";
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isTaskOnDate(item: ScheduledTask, date: Date): boolean {
  const day = startOfDay(date).getTime();
  return day >= startOfDay(item.start).getTime() && day <= startOfDay(item.end).getTime();
}

function startOfWeek(date: Date): Date {
  return addDays(startOfDay(date), -date.getDay());
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function buildSchedule(tasks: Task[]): ScheduledTask[] {
  const ordered = [...tasks].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.title.localeCompare(b.title));
  const firstDate = ordered[0]?.created_at ? startOfDay(new Date(ordered[0].created_at)) : startOfDay(new Date());
  let cursor = firstDate;

  return ordered.map((task) => {
    const duration = Math.max(1, Math.ceil(Number(task.estimated_days || 1)));
    const start = cursor;
    const end = addDays(start, duration - 1);
    cursor = addDays(end, 1);
    return { task, start, end };
  });
}

export function BoardCalendar() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.tasks
      .list()
      .then(({ tasks }) => setTasks(tasks))
      .finally(() => setLoading(false));
  }, []);

  const scheduledTasks = useMemo(() => buildSchedule(tasks), [tasks]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  function getTasksForDate(date: Date): ScheduledTask[] {
    return scheduledTasks.filter((item) => isTaskOnDate(item, date));
  }

  function getViewTitle(): string {
    if (viewMode === "day") {
      return currentDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    }
    if (viewMode === "week") {
      const start = startOfWeek(currentDate);
      const end = addDays(start, 6);
      return `${formatShortDate(start)} - ${formatShortDate(end)}, ${end.getFullYear()}`;
    }
    if (viewMode === "year") {
      return String(year);
    }
    return `${MONTH_NAMES[month]} ${year}`;
  }

  function navigate(direction: -1 | 1) {
    if (viewMode === "day") setCurrentDate(addDays(currentDate, direction));
    if (viewMode === "week") setCurrentDate(addDays(currentDate, direction * 7));
    if (viewMode === "month") setCurrentDate(new Date(year, month + direction, 1));
    if (viewMode === "year") setCurrentDate(new Date(year + direction, month, 1));
  }

  function TaskPill({ item, compact = false }: { item: ScheduledTask; compact?: boolean }) {
    return (
      <Link to={`/task/${item.task.project_id}`}>
        <motion.div
          whileHover={{ scale: 1.03, x: 2 }}
          className={`${TASK_COLORS[getTaskType(item.task)]} text-white ${
            compact ? "text-[10px] px-2 py-1" : "text-xs px-3 py-2"
          } rounded cursor-pointer font-medium border backdrop-blur-sm`}
          title={`${item.task.title} (${formatShortDate(item.start)} - ${formatShortDate(item.end)})`}
        >
          <span className="block truncate">{item.task.title}</span>
          {!compact && (
            <span className="block text-[10px] text-white/65">
              {formatShortDate(item.start)} - {formatShortDate(item.end)}
            </span>
          )}
        </motion.div>
      </Link>
    );
  }

  function renderDayView() {
    const dayTasks = getTasksForDate(currentDate);
    return (
      <div className="grid gap-4">
        <div className="rounded-xl border border-purple-500/30 bg-purple-900/10 p-5">
          <div className="text-sm uppercase tracking-wider text-purple-300">{DAY_NAMES[currentDate.getDay()]}</div>
          <div className="mt-1 text-3xl font-light">{currentDate.getDate()}</div>
        </div>
        {dayTasks.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center text-gray-500">
            No scheduled work for this day
          </div>
        ) : (
          dayTasks.map((item) => <TaskPill key={item.task.id} item={item} />)
        )}
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
          return (
            <div
              key={date.toISOString()}
              className={`min-h-[520px] rounded-xl border p-3 ${
                isToday ? "border-purple-500/50 bg-purple-900/10" : "border-white/10 bg-white/[0.02]"
              }`}
            >
              <div className="mb-4">
                <div className="text-xs uppercase tracking-wider text-gray-500">{DAY_NAMES[date.getDay()]}</div>
                <div className={isToday ? "text-purple-300" : "text-gray-200"}>{formatShortDate(date)}</div>
              </div>
              <div className="space-y-2">
                {dayTasks.map((item) => <TaskPill key={item.task.id} item={item} compact />)}
              </div>
            </div>
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
            <div key={day} className="text-center text-gray-500 text-xs uppercase tracking-wider py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-3">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const date = new Date(year, month, day);
            const dayTasks = getTasksForDate(date);
            const isToday = isCurrentMonth && today.getDate() === day;

            return (
              <motion.div
                key={day}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.004 }}
                className={`aspect-square border rounded-lg p-2 transition-all duration-200 relative overflow-hidden group ${
                  isToday
                    ? "border-purple-500/50 bg-purple-900/10"
                    : "border-white/10 hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.04]"
                }`}
              >
                <motion.div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className={`text-sm font-medium mb-1 relative z-10 ${isToday ? "text-purple-400" : "text-gray-300"}`}>
                  {day}
                </div>

                <div className="space-y-1 relative z-10">
                  {dayTasks.slice(0, 3).map((item) => (
                    <TaskPill key={item.task.id} item={item} compact />
                  ))}
                  {dayTasks.length > 3 && (
                    <div className="text-[9px] text-gray-500 px-2">+{dayTasks.length - 3} more</div>
                  )}
                </div>

                {isToday && (
                  <div className="absolute top-1 right-1 w-2 h-2 bg-purple-500 rounded-full shadow-lg shadow-purple-500/50" />
                )}
              </motion.div>
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
            (item) => item.start.getFullYear() === year && item.start.getMonth() === monthIndex
          );
          return (
            <div key={name} className="min-h-44 rounded-xl border border-white/10 bg-white/[0.02] p-4">
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
    <div className="flex-1 min-h-0 p-6 sm:p-8 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl mb-1 font-light">Board Calendar</h2>
          <p className="text-gray-400 text-sm">Project timeline and task schedule</p>
        </div>

        <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm border border-white/10 rounded-lg p-1">
          {(["day", "week", "month", "year"] as ViewMode[]).map((mode) => (
            <motion.button
              key={mode}
              onClick={() => setViewMode(mode)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`relative px-4 py-2 rounded-md transition-all duration-200 capitalize text-sm overflow-hidden ${
                viewMode === mode ? "text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              {viewMode === mode && (
                <motion.div
                  layoutId="activeViewMode"
                  className="absolute inset-0 bg-gradient-to-r from-purple-900 to-black"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10">{mode}</span>
            </motion.button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg transition-all duration-200 border border-white/10 hover:border-white/20 hover:bg-white/5"
        >
          <ChevronLeft className="w-5 h-5" />
        </motion.button>
        <h3 className="text-2xl font-light">
          {getViewTitle()}
        </h3>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate(1)}
          className="p-2 rounded-lg transition-all duration-200 border border-white/10 hover:border-white/20 hover:bg-white/5"
        >
          <ChevronRight className="w-5 h-5" />
        </motion.button>
      </div>

      <div className="flex-1 min-h-0 bg-white/2 backdrop-blur-sm border border-white/10 rounded-xl p-6 overflow-auto">
        {loading && (
          <div className="flex items-center justify-center h-32 text-gray-500">
            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mr-3" />
            Loading tasks...
          </div>
        )}

        {!loading && (
          <>
            {viewMode === "day" && renderDayView()}
            {viewMode === "week" && renderWeekView()}
            {viewMode === "month" && renderMonthView()}
            {viewMode === "year" && renderYearView()}
          </>
        )}
      </div>

      <div className="flex items-center gap-6 mt-6 px-4">
        <span className="text-xs text-gray-500">Task Types:</span>
        {(Object.entries(TASK_COLORS) as [TaskType, string][]).map(([type, classes]) => (
          <div key={type} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded ${classes.split(" ")[0]}`} />
            <span className="text-xs text-gray-400 capitalize">{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
