import { useState } from "react";
import { motion } from "motion/react";
import { AlertTriangle, ChevronDown } from "lucide-react";
import type { Task } from "../lib/api";
import type { TeamMember } from "../lib/teamUtils";
import { skillGapDetection } from "../lib/teamUtils";

interface SkillGapPanelProps {
  members: TeamMember[];
  tasks: Task[];
}

export function SkillGapPanel({ members, tasks }: SkillGapPanelProps) {
  const [open, setOpen] = useState(false);
  const gaps = skillGapDetection(members, tasks);

  if (gaps.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-900/8 overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-4 p-5 text-left"
      >
        <div className="p-2.5 bg-amber-900/40 rounded-xl border border-amber-500/30 shrink-0">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-amber-300">Skill Gap Detected</h3>
          <p className="text-sm text-gray-400 mt-0.5">
            {gaps.length} skill{gaps.length > 1 ? "s" : ""} required by active tasks but not covered by any team member
          </p>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-3 border-t border-amber-500/15">
          {gaps.map(({ skill, tasks: taskTitles }) => (
            <div key={skill} className="rounded-xl bg-black/30 border border-white/8 p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm font-semibold text-amber-300 capitalize">{skill}</span>
                <span className="text-xs text-gray-500">
                  needed by {taskTitles.length} task{taskTitles.length > 1 ? "s" : ""}
                </span>
              </div>
              <div className="space-y-1">
                {taskTitles.slice(0, 3).map((t) => (
                  <div key={t} className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="w-1 h-1 rounded-full bg-gray-600 shrink-0" />
                    {t}
                  </div>
                ))}
                {taskTitles.length > 3 && (
                  <div className="text-xs text-gray-600">+{taskTitles.length - 3} more</div>
                )}
              </div>
            </div>
          ))}
          <p className="text-xs text-gray-600 pt-1">
            Consider hiring for these skills or upskilling existing team members.
          </p>
        </div>
      )}
    </motion.div>
  );
}
