import { useState, useEffect } from "react";
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

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  function getTasksForDay(day: number): Task[] {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return tasks.filter((t) => t.created_at.startsWith(dateStr));
  }

  return (
    <div className="p-8 h-full flex flex-col">
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
          onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
          className="p-2 rounded-lg transition-all duration-200 border border-white/10 hover:border-white/20 hover:bg-white/5"
        >
          <ChevronLeft className="w-5 h-5" />
        </motion.button>
        <h3 className="text-2xl font-light">
          {MONTH_NAMES[month]} {year}
        </h3>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
          className="p-2 rounded-lg transition-all duration-200 border border-white/10 hover:border-white/20 hover:bg-white/5"
        >
          <ChevronRight className="w-5 h-5" />
        </motion.button>
      </div>

      <div className="flex-1 bg-white/[0.02] backdrop-blur-sm border border-white/10 rounded-xl p-6 overflow-auto">
        {loading && (
          <div className="flex items-center justify-center h-32 text-gray-500">
            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mr-3" />
            Loading tasks...
          </div>
        )}

        {!loading && (
          <>
            <div className="grid grid-cols-7 gap-3 mb-4">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
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
                const dayTasks = getTasksForDay(day);
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
                      {dayTasks.slice(0, 3).map((task) => (
                        <Link key={task.id} to={`/task/${task.project_id}`}>
                          <motion.div
                            whileHover={{ scale: 1.05, x: 2 }}
                            className={`${TASK_COLORS[getTaskType(task)]} text-white text-[10px] px-2 py-1 rounded cursor-pointer font-medium border backdrop-blur-sm`}
                            title={task.title}
                          >
                            {task.title.length > 10 ? task.title.substring(0, 10) + "…" : task.title}
                          </motion.div>
                        </Link>
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
