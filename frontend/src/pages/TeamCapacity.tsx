import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { api, type User } from "../lib/api";

const GRADIENTS = [
  "from-purple-600 to-purple-800",
  "from-purple-600 to-pink-600",
  "from-green-600 to-emerald-600",
  "from-orange-600 to-red-600",
  "from-indigo-600 to-purple-600",
  "from-purple-500 to-purple-700",
];

const MAX_TASKS_FULL = 8;

function getInitials(fullName: string | null, email: string): string {
  if (fullName) {
    return fullName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email.slice(0, 2).toUpperCase();
}

function computeCapacity(taskCount: number): number {
  return Math.min(Math.round((taskCount / MAX_TASKS_FULL) * 100), 100);
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  capacity: number;
  avatar: string;
  taskCount: number;
  gradient: string;
}

function mapUser(user: User, index: number): TeamMember {
  return {
    id: user.id,
    name: user.full_name ?? user.email,
    role: user.email,
    capacity: computeCapacity(user.task_count),
    avatar: getInitials(user.full_name, user.email),
    taskCount: user.task_count,
    gradient: GRADIENTS[index % GRADIENTS.length],
  };
}

export function TeamCapacity() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.users
      .list()
      .then(({ users }) => setMembers(users.map(mapUser)))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const overloaded = members.filter((m) => m.capacity > 90);
  const available = members.filter((m) => m.capacity <= 90);

  return (
    <div className="p-12">
      <div className="mb-12">
        <h2 className="text-5xl mb-3 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          Team & Capacity
        </h2>
        <p className="text-gray-500 text-lg">Real-time workload monitoring and task distribution</p>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-900/30 border border-red-500/50 rounded-xl text-red-300 text-sm">
          {error} — make sure the backend is running on port 5001
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center h-48 text-gray-500">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">Loading team...</p>
          </div>
        </div>
      )}

      {!loading && !error && members.length === 0 && (
        <div className="flex flex-col items-center justify-center h-48 text-gray-500">
          <p className="text-xl mb-2">No team members yet</p>
          <p className="text-sm">Team members will appear here once users are added to the system</p>
        </div>
      )}

      {overloaded.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 bg-gradient-to-r from-red-900/30 to-orange-900/30 border-2 border-red-500/50 rounded-3xl p-8 shadow-2xl shadow-red-500/20"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-red-600 rounded-2xl">
              <AlertCircle className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-2xl text-red-300 font-semibold">Capacity Alert</h3>
          </div>
          <p className="text-gray-200 text-lg mb-5">
            {overloaded.length} team member{overloaded.length > 1 ? "s are" : " is"} over 90% capacity. Consider
            redistributing tasks or adjusting deadlines.
          </p>
          <div className="flex flex-wrap gap-3">
            {overloaded.map((m) => (
              <span
                key={m.id}
                className="px-5 py-2 bg-gradient-to-r from-red-600 to-orange-600 rounded-full text-base text-white font-semibold shadow-lg"
              >
                {m.name} ({m.capacity}%)
              </span>
            ))}
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-10">
        {members.map((member, index) => (
          <motion.div
            key={member.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, type: "spring", stiffness: 100 }}
            whileHover={{ y: -8, scale: 1.02 }}
            className={`bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-2xl border-2 rounded-3xl p-8 transition-all duration-500 ${
              member.capacity > 90
                ? "border-red-500/50 hover:border-red-500/70 shadow-xl shadow-red-500/20"
                : "border-white/20 hover:border-white/30 shadow-xl"
            }`}
          >
            <div className="flex items-center gap-5 mb-8">
              <div
                className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${member.gradient} flex items-center justify-center shadow-2xl`}
              >
                <span className="text-2xl text-white font-bold">{member.avatar}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl mb-2 font-semibold truncate">{member.name}</h3>
                <p className="text-sm text-gray-400 truncate">{member.role}</p>
              </div>
            </div>

            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <span className="text-base text-gray-400 font-semibold">Capacity</span>
                <span
                  className={`text-lg font-bold ${
                    member.capacity > 90
                      ? "text-red-400"
                      : member.capacity > 75
                      ? "text-yellow-400"
                      : "text-green-400"
                  }`}
                >
                  {member.capacity}%
                </span>
              </div>
              <div className="h-4 bg-black/40 rounded-full overflow-hidden border border-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${member.capacity}%` }}
                  transition={{ delay: index * 0.1 + 0.3, duration: 1, ease: "easeOut" }}
                  className={`h-full rounded-full ${
                    member.capacity > 90
                      ? "bg-gradient-to-r from-red-600 to-orange-600 shadow-lg shadow-red-500/50"
                      : member.capacity > 75
                      ? "bg-gradient-to-r from-yellow-600 to-orange-600 shadow-lg shadow-yellow-500/50"
                      : "bg-gradient-to-r from-green-600 to-emerald-600 shadow-lg shadow-green-500/50"
                  }`}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle2 className="w-5 h-5 text-gray-400" />
                <span className="text-base text-gray-400 font-semibold">
                  Assigned Tasks ({member.taskCount})
                </span>
              </div>
              {member.taskCount === 0 ? (
                <p className="text-sm text-gray-600 italic">No tasks assigned</p>
              ) : (
                <div className="px-4 py-3 bg-white/10 rounded-xl text-base text-gray-200 border border-white/10">
                  {member.taskCount} task{member.taskCount !== 1 ? "s" : ""} in progress
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {members.length > 0 && (
        <div className="grid grid-cols-3 gap-8">
          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            className="bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-2xl border-2 border-white/20 rounded-3xl p-8 hover:border-purple-500/50 transition-all duration-300"
          >
            <div className="text-5xl mb-3 font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              {members.length}
            </div>
            <div className="text-gray-400 text-lg">Total Members</div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 border-2 border-green-500/50 rounded-3xl p-8 shadow-xl shadow-green-500/20 hover:border-green-500/70 transition-all duration-300"
          >
            <div className="text-5xl text-green-400 mb-3 font-bold">{available.length}</div>
            <div className="text-gray-300 text-lg">Available</div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            className="bg-gradient-to-br from-red-900/30 to-orange-900/30 border-2 border-red-500/50 rounded-3xl p-8 shadow-xl shadow-red-500/20 hover:border-red-500/70 transition-all duration-300"
          >
            <div className="text-5xl text-red-400 mb-3 font-bold">{overloaded.length}</div>
            <div className="text-gray-300 text-lg">Overloaded</div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
