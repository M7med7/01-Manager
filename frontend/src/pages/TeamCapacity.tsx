import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertCircle, AlertTriangle, CheckCircle2, FolderOpen, Plus, Trash2, X } from "lucide-react";
import { api, type User } from "../lib/api";
import { readLocalTeamMembers, saveLocalTeamMember, removeLocalTeamMember, type StoredTeamMember } from "../lib/localTeamMembers";
import { useAuth } from "../contexts/AuthContext";

const GRADIENTS = [
  "from-purple-600 to-purple-800",
  "from-purple-600 to-pink-600",
  "from-green-600 to-emerald-600",
  "from-orange-600 to-red-600",
  "from-indigo-600 to-purple-600",
  "from-purple-500 to-purple-700",
];

const MAX_STORY_POINTS = 40;

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

function computeCapacity(storyPoints: number): number {
  return Math.min(Math.round((storyPoints / MAX_STORY_POINTS) * 100), 100);
}

interface CompletedTaskInfo {
  id: string;
  title: string;
  project_name: string | null;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  phone?: string;
  capacity: number;
  storyPoints: number;
  avatar: string;
  taskCount: number;
  projectCount: number;
  completedCount: number;
  completedTasks: CompletedTaskInfo[];
  gradient: string;
  isLocal: boolean;
}

interface MemberFormData {
  fullName: string;
  email: string;
  phone: string;
}

function mapUser(user: User, index: number): TeamMember {
  const sp = user.total_estimated_days ?? 0;
  return {
    id: user.id,
    name: user.full_name ?? user.email,
    role: user.email,
    phone: user.phone ?? undefined,
    storyPoints: sp,
    capacity: computeCapacity(sp),
    avatar: getInitials(user.full_name, user.email),
    taskCount: user.task_count,
    projectCount: user.project_count,
    completedCount: user.completed_count ?? 0,
    completedTasks: (user.completed_tasks ?? []).map((t) => ({
      id: t.id,
      title: t.title,
      project_name: t.project_name,
    })),
    gradient: GRADIENTS[index % GRADIENTS.length],
    isLocal: false,
  };
}

function mapStoredMember(member: StoredTeamMember, index: number): TeamMember {
  return {
    id: member.id,
    name: member.full_name,
    role: member.email,
    phone: member.phone,
    storyPoints: 0,
    capacity: 0,
    avatar: getInitials(member.full_name, member.email),
    taskCount: member.task_count,
    projectCount: 0,
    completedCount: 0,
    completedTasks: [],
    gradient: GRADIENTS[index % GRADIENTS.length],
    isLocal: true,
  };
}

function ConfirmDeleteModal({
  memberName,
  onConfirm,
  onCancel,
  deleting,
}: {
  memberName: string;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        className="w-full max-w-md rounded-2xl border border-red-500/40 bg-black/90 p-6 shadow-2xl shadow-red-500/20"
      >
        <div className="mb-5 flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-900/50 border border-red-500/40">
            <AlertTriangle className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Remove member?</h3>
            <p className="mt-1 text-sm text-gray-400">
              <span className="font-semibold text-white">"{memberName}"</span> will be removed from the system.
            </p>
          </div>
          <button
            onClick={onCancel}
            className="ml-auto rounded-lg border border-white/10 p-1.5 text-gray-400 hover:text-white hover:bg-white/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-gray-300 hover:bg-white/5 hover:text-white disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="rounded-xl bg-red-600 hover:bg-red-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-500/20 disabled:opacity-40 transition-colors"
          >
            {deleting ? "Removing…" : "Remove member"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export function TeamCapacity() {
  const { session } = useAuth();
  const currentUserId = session?.user.id;
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [formData, setFormData] = useState<MemberFormData>({ fullName: "", email: "", phone: "" });
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchMembers = () => {
      api.users
        .list()
        .then(({ users }) => {
          const apiMembers = users.map(mapUser);
          const storedMembers = readLocalTeamMembers().map((member, index) =>
            mapStoredMember(member, apiMembers.length + index)
          );
          setMembers([...apiMembers, ...storedMembers]);
        })
        .catch((err: Error) => setError(err.message))
        .finally(() => setLoading(false));
    };

    fetchMembers();

    const handleVisibility = () => { if (!document.hidden) fetchMembers(); };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('userProfileUpdated', fetchMembers);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('userProfileUpdated', fetchMembers);
    };
  }, []);

  const overloaded = members.filter((m) => m.capacity > 90);
  const available = members.filter((m) => m.capacity <= 90);
  const totalCompleted = members.reduce((sum, m) => sum + m.completedCount, 0);

  const handleAddMember = (e: { preventDefault(): void }) => {
    e.preventDefault();
    const storedMember: StoredTeamMember = {
      id: `local-${Date.now()}`,
      full_name: formData.fullName.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      created_at: new Date().toISOString(),
      task_count: 0,
    };
    const newMember: TeamMember = {
      id: storedMember.id,
      name: storedMember.full_name,
      role: storedMember.email,
      phone: storedMember.phone,
      storyPoints: 0,
      capacity: 0,
      avatar: getInitials(storedMember.full_name, storedMember.email),
      taskCount: 0,
      projectCount: 0,
      completedCount: 0,
      completedTasks: [],
      gradient: GRADIENTS[members.length % GRADIENTS.length],
      isLocal: true,
    };

    saveLocalTeamMember(storedMember);
    setMembers((current) => [...current, newMember]);
    setFormData({ fullName: "", email: "", phone: "" });
    setIsAddMemberOpen(false);
  };

  const handleDelete = async () => {
    if (!confirmId) return;
    const member = members.find((m) => m.id === confirmId);
    if (!member) return;

    setDeletingId(confirmId);
    try {
      if (member.isLocal) {
        removeLocalTeamMember(confirmId);
      } else {
        await api.users.delete(confirmId);
      }
      setMembers((prev) => prev.filter((m) => m.id !== confirmId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  };

  const confirmMember = confirmId ? members.find((m) => m.id === confirmId) : null;

  return (
    <div className="p-12">
      <div className="mb-12 flex items-start justify-between gap-6">
        <div>
          <h2 className="text-5xl mb-3 bg-linear-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Team & Capacity
          </h2>
          <p className="text-gray-500 text-lg">Real-time workload monitoring and task distribution</p>
        </div>
        <motion.button
          type="button"
          onClick={() => setIsAddMemberOpen(true)}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          className="inline-flex items-center gap-3 rounded-xl border border-purple-500/40 bg-purple-900/30 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/15 hover:border-purple-400/70 hover:bg-purple-800/40 transition-all"
        >
          <Plus className="h-4 w-4" />
          Add Member
        </motion.button>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-900/30 border border-red-500/50 rounded-xl text-red-300 text-sm">
          {error}
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
          className="mb-10 bg-linear-to-r from-red-900/30 to-orange-900/30 border-2 border-red-500/50 rounded-3xl p-8 shadow-2xl shadow-red-500/20"
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
                className="px-5 py-2 bg-linear-to-r from-red-600 to-orange-600 rounded-full text-base text-white font-semibold shadow-lg"
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
            className={`relative bg-linear-to-br from-white/7 to-white/2 backdrop-blur-2xl border-2 rounded-3xl p-8 transition-all duration-500 group ${
              member.capacity > 90
                ? "border-red-500/50 hover:border-red-500/70 shadow-xl shadow-red-500/20"
                : "border-white/20 hover:border-white/30 shadow-xl"
            }`}
          >
            {/* Delete button — hidden for the signed-in user (match by ID or email) */}
            {member.id !== currentUserId && member.role !== session?.user.email && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmId(member.id);
                }}
                className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-black/60 text-gray-500 opacity-0 group-hover:opacity-100 hover:border-red-500/50 hover:bg-red-900/30 hover:text-red-400 transition-all duration-200"
                aria-label={`Remove ${member.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}

            <div className="flex items-center gap-5 mb-8">
              <div
                className={`w-20 h-20 rounded-2xl bg-linear-to-br ${member.gradient} flex items-center justify-center shadow-2xl`}
              >
                <span className="text-2xl text-white font-bold">{member.avatar}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl mb-2 font-semibold truncate">{member.name}</h3>
                <p className="text-sm text-gray-400 truncate">{member.role}</p>
                {member.phone && <p className="text-sm text-gray-500 truncate">{member.phone}</p>}
              </div>
            </div>

            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <span className="text-base text-gray-400 font-semibold">Capacity</span>
                <div className="text-right">
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
                  <span className="ml-2 text-xs text-gray-500">{member.storyPoints} / {MAX_STORY_POINTS} SP</span>
                </div>
              </div>
              <div className="h-4 bg-black/40 rounded-full overflow-hidden border border-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${member.capacity}%` }}
                  transition={{ delay: index * 0.1 + 0.3, duration: 1, ease: "easeOut" }}
                  className={`h-full rounded-full ${
                    member.capacity > 90
                      ? "bg-linear-to-r from-red-600 to-orange-600 shadow-lg shadow-red-500/50"
                      : member.capacity > 75
                      ? "bg-linear-to-r from-yellow-600 to-orange-600 shadow-lg shadow-yellow-500/50"
                      : "bg-linear-to-r from-green-600 to-emerald-600 shadow-lg shadow-green-500/50"
                  }`}
                />
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <FolderOpen className="w-5 h-5 text-gray-400" />
                  <span className="text-base text-gray-400 font-semibold">
                    Projects ({member.projectCount})
                  </span>
                </div>
                {member.projectCount === 0 ? (
                  <p className="text-sm text-gray-600 italic">Not assigned to any project</p>
                ) : (
                  <div className="px-4 py-3 bg-purple-900/20 rounded-xl text-base text-purple-300 border border-purple-500/20">
                    {member.projectCount} project{member.projectCount !== 1 ? "s" : ""} assigned
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <span className="text-base text-gray-400 font-semibold">
                    Completed ({member.completedCount})
                  </span>
                </div>
                {member.completedCount === 0 ? (
                  <p className="text-sm text-gray-600 italic">No tasks completed yet</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {member.completedTasks.map((ct) => (
                      <div key={ct.id} className="flex items-start gap-2 px-3 py-2 bg-green-900/15 rounded-lg border border-green-500/15">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-400 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm text-gray-200 truncate">{ct.title}</div>
                          {ct.project_name && <div className="text-[10px] text-gray-500 truncate">{ct.project_name}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-3 mb-3">
                  <FolderOpen className="w-5 h-5 text-gray-400" />
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
            </div>
          </motion.div>
        ))}
      </div>

      {members.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <motion.div whileHover={{ scale: 1.05, y: -5 }} className="bg-linear-to-br from-white/7 to-white/2 backdrop-blur-2xl border-2 border-white/20 rounded-3xl p-8 hover:border-purple-500/50 transition-all duration-300">
            <div className="text-5xl mb-3 font-bold bg-linear-to-r from-white to-gray-400 bg-clip-text text-transparent">{members.length}</div>
            <div className="text-gray-400 text-lg">Total Members</div>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05, y: -5 }} className="bg-linear-to-br from-green-900/30 to-emerald-900/30 border-2 border-green-500/50 rounded-3xl p-8 shadow-xl shadow-green-500/20 hover:border-green-500/70 transition-all duration-300">
            <div className="text-5xl text-green-400 mb-3 font-bold">{available.length}</div>
            <div className="text-gray-300 text-lg">Available</div>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05, y: -5 }} className="bg-linear-to-br from-red-900/30 to-orange-900/30 border-2 border-red-500/50 rounded-3xl p-8 shadow-xl shadow-red-500/20 hover:border-red-500/70 transition-all duration-300">
            <div className="text-5xl text-red-400 mb-3 font-bold">{overloaded.length}</div>
            <div className="text-gray-300 text-lg">Overloaded</div>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05, y: -5 }} className="bg-linear-to-br from-purple-900/30 to-purple-900/10 border-2 border-purple-500/50 rounded-3xl p-8 shadow-xl shadow-purple-500/20 hover:border-purple-500/70 transition-all duration-300">
            <div className="text-5xl text-purple-400 mb-3 font-bold">{totalCompleted}</div>
            <div className="text-gray-300 text-lg">Tasks Done</div>
          </motion.div>
        </div>
      )}

      {isAddMemberOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-lg rounded-2xl border border-purple-500/40 bg-black/90 p-6 shadow-2xl shadow-purple-500/20"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-semibold text-white">Add Team Member</h3>
                <p className="mt-1 text-sm text-gray-500">Create a local team profile for capacity planning.</p>
              </div>
              <button type="button" onClick={() => setIsAddMemberOpen(false)} className="rounded-lg border border-white/10 p-2 text-gray-400 hover:text-white hover:bg-white/5" aria-label="Close add member form">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-300">Full Name</label>
                <input type="text" required value={formData.fullName} onChange={(e) => setFormData((current) => ({ ...current, fullName: e.target.value }))} placeholder="e.g., Sarah Khan" className="w-full rounded-xl border border-white/15 bg-white/6 px-4 py-3 text-white placeholder-gray-600 outline-none transition-colors focus:border-purple-400/70" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-300">Email</label>
                <input type="email" required value={formData.email} onChange={(e) => setFormData((current) => ({ ...current, email: e.target.value }))} placeholder="name@example.com" className="w-full rounded-xl border border-white/15 bg-white/6 px-4 py-3 text-white placeholder-gray-600 outline-none transition-colors focus:border-purple-400/70" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-300">Phone Number</label>
                <input type="tel" required value={formData.phone} onChange={(e) => setFormData((current) => ({ ...current, phone: e.target.value }))} placeholder="+966 5X XXX XXXX" className="w-full rounded-xl border border-white/15 bg-white/6 px-4 py-3 text-white placeholder-gray-600 outline-none transition-colors focus:border-purple-400/70" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsAddMemberOpen(false)} className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-gray-300 hover:bg-white/5 hover:text-white">Cancel</button>
                <button type="submit" className="rounded-xl bg-linear-to-r from-purple-600 to-purple-900 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/20">Add Member</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <AnimatePresence>
        {confirmMember && (
          <ConfirmDeleteModal
            memberName={confirmMember.name}
            onConfirm={handleDelete}
            onCancel={() => setConfirmId(null)}
            deleting={deletingId !== null}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
