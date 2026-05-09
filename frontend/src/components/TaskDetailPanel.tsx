import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Calendar as CalendarIcon, CheckCircle2, Circle, Send, Sparkles, Tag, User as UserIcon, Clock } from "lucide-react";
import { api, type Task, type ProjectMember } from "../lib/api";

interface ChatMessage { role: "user" | "ai"; content: string; }

interface ScheduleInfo { start: Date; end: Date; }

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
  onComplete: (taskId: string, completed: boolean) => void;
  onBack: () => void;
}

export function TaskDetailPanel({ task, schedule, members, projectDesc, currentUserId, onComplete, onBack }: Props) {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>([
    { role: "ai", content: `How can I help you with "${task.title}"?` },
  ]);
  const [sending, setSending] = useState(false);
  const chatEnd = useRef<HTMLDivElement>(null);
  const isDone = task.status === "Done";
  const priority = PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES.Medium;
  const { summary, steps } = parseSteps(task.description);
  const assignee = members.find(m => m.user_id === task.assigned_to);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);
  useEffect(() => {
    setChat([{ role: "ai", content: `How can I help you with "${task.title}"?` }]);
  }, [task.id, task.title]);

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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-5 border-b border-purple-500/30 bg-linear-to-r from-purple-600/12 to-black/20">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-3 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to AI Assistant
        </button>
        <h3 className="text-xl font-semibold text-white mb-3 leading-snug">{task.title}</h3>
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

      {/* Detail scroll area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5">
        {/* Schedule */}
        {schedule && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
            <CalendarIcon className="w-4 h-4 text-purple-400 shrink-0" />
            <div className="text-sm">
              <span className="text-gray-400">Schedule: </span>
              <span className="text-white">{formatDate(schedule.start)} → {formatDate(schedule.end)}</span>
            </div>
          </div>
        )}

        {/* Priority + Days */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${priority.bg} ${priority.text}`}>
            {priority.label}
          </span>
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

        {/* Chat */}
        <div className="pt-2 border-t border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-semibold text-gray-300">AI Chat — {task.title}</span>
          </div>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {chat.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] p-3 rounded-xl text-sm ${m.role === "user"
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
        </div>
      </div>

      {/* Chat input */}
      <div className="p-4 border-t border-purple-500/30 bg-black/45">
        <div className="flex items-center gap-2">
          <input
            value={message} onChange={e => setMessage(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMsg()}
            placeholder={`Ask about "${task.title}"...`}
            className="min-w-0 flex-1 px-3 py-2.5 bg-white/[0.07] border border-purple-500/35 rounded-xl focus:outline-none focus:border-purple-400/70 text-white placeholder-gray-500 text-sm"
          />
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={sendMsg} disabled={sending}
            className="h-10 w-10 shrink-0 flex items-center justify-center bg-linear-to-r from-purple-600 to-purple-900 rounded-xl disabled:opacity-50">
            <Send className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
