import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Loader2, Users } from "lucide-react";
import { motion } from "motion/react";
import { api, type User } from "../lib/api";
import { mapLocalTeamMemberToUser, readLocalTeamMembers } from "../lib/localTeamMembers";

export function CreateProject() {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandDescription, setExpandDescription] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    duration: "",
    duration_unit: "Weeks",
  });
  const [users, setUsers] = useState<User[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  useEffect(() => {
    api.users
      .list()
      .then(({ users }) => {
        const localUsers = readLocalTeamMembers().map(mapLocalTeamMemberToUser);
        const existingIds = new Set(users.map((user) => user.id));
        setUsers([...users, ...localUsers.filter((user) => !existingIds.has(user.id))]);
      })
      .catch(() => setUsers(readLocalTeamMembers().map(mapLocalTeamMemberToUser)));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMembers.length === 0) {
      setError("Select at least one team member before generating the project plan");
      return;
    }
    setIsGenerating(true);
    setError(null);
    try {
      await api.ai.generate({ ...formData, team_members: selectedMembers, expand_description: expandDescription });
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate project plan");
      setIsGenerating(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const toggleMember = (userId: string) => {
    setSelectedMembers((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]
    );
  };

  return (
    <div className="min-h-full px-12 py-10 flex justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-3xl"
      >
        <div className="mb-12 flex items-center justify-between gap-6">
          <div>
            <h2 className="text-5xl mb-3 bg-linear-to-r from-white via-purple-100 to-purple-200 bg-clip-text text-transparent font-bold">
              Create New Project
            </h2>
            <p className="text-gray-400 text-xl">AI-powered execution plan generation</p>
          </div>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-purple-400/30 bg-purple-900/30 shadow-lg shadow-purple-500/20">
            <Sparkles className="w-7 h-7 text-purple-200" />
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-xl text-red-300 text-sm"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="block text-lg text-gray-300 mb-3 font-semibold">Project Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="e.g., E-Commerce Platform"
              className="w-full px-6 py-5 bg-linear-to-br from-white/10 to-white/5 border-2 border-white/20 rounded-2xl focus:outline-none focus:border-purple-500/70 focus:shadow-2xl focus:shadow-purple-500/30 text-white placeholder-gray-500 transition-all duration-300 hover:border-white/30 text-lg"
            />
          </div>

          <div>
            <label className="block text-lg text-gray-300 mb-3 font-semibold">
              Project Description
              <span className="ml-3 text-purple-400 font-normal">(AI will analyze this)</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows={5}
              placeholder="Describe your project goals, features, and requirements. The more details you provide, the better AI can plan your project..."
              className="w-full px-6 py-5 bg-linear-to-br from-white/10 to-white/5 border-2 border-white/20 rounded-2xl focus:outline-none focus:border-purple-500/70 focus:shadow-2xl focus:shadow-purple-500/30 text-white placeholder-gray-500 transition-all duration-300 hover:border-white/30 resize-none text-lg leading-relaxed"
            />
            <label className="mt-4 flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5 shrink-0">
                <input
                  type="checkbox"
                  checked={expandDescription}
                  onChange={(e) => setExpandDescription(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-5 h-5 rounded border-2 border-white/20 bg-white/5 peer-checked:border-purple-500 peer-checked:bg-purple-600 transition-all flex items-center justify-center">
                  {expandDescription && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                </div>
              </div>
              <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors leading-5">
                <span className="text-white font-medium">Enhance description with AI</span> — AI will rewrite your description as a polished project summary. Uncheck to use your exact wording as-is.
              </span>
            </label>
            <div className="mt-3 flex items-center gap-3 text-sm text-gray-400">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>AI will generate: Timeline, Sprints, Tasks, Cost Estimation, Feasibility Analysis</span>
            </div>
          </div>

          <div>
            <label className="block text-lg text-gray-300 mb-3 font-semibold">Expected Duration</label>
            <div className="flex gap-4">
              <input
                type="number"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                required
                min="1"
                placeholder="8"
                className="w-full px-6 py-5 bg-linear-to-br from-white/10 to-white/5 border-2 border-white/20 rounded-2xl focus:outline-none focus:border-purple-500/70 text-white placeholder-gray-500 transition-all duration-300 hover:border-white/30 text-lg"
              />
              <select
                name="duration_unit"
                value={formData.duration_unit}
                onChange={handleChange}
                className="w-48 px-6 py-5 bg-linear-to-br from-white/10 to-white/5 border-2 border-white/20 rounded-2xl focus:outline-none focus:border-purple-500/70 text-white transition-all duration-300 hover:border-white/30 text-lg appearance-none cursor-pointer"
                style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1.25rem center', backgroundSize: '1rem' }}
              >
                <option value="Weeks" className="bg-gray-900">Weeks</option>
                <option value="Months" className="bg-gray-900">Months</option>
                <option value="Years" className="bg-gray-900">Years</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-4 mb-3">
              <label className="block text-lg text-gray-300 font-semibold">Assign Team Members</label>
              <span className="text-sm text-gray-500">{selectedMembers.length} selected</span>
            </div>
            {users.length === 0 ? (
              <div className="rounded-2xl border-2 border-white/10 bg-white/3 p-6 text-gray-500">
                No team members found. Add people in the Team tab first.
              </div>
            ) : (
              <div className="grid gap-3">
                {users.map((user) => {
                  const isSelected = selectedMembers.includes(user.id);
                  const displayName = user.full_name ?? user.email;
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => toggleMember(user.id)}
                      className={`flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all ${isSelected
                        ? "border-purple-500/70 bg-purple-900/25"
                        : "border-white/10 bg-white/3 hover:border-white/25"
                        }`}
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-purple-600 to-purple-900 text-sm font-bold text-white">
                        {displayName
                          .split(" ")
                          .map((part) => part[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-white">{displayName}</div>
                        <div className="truncate text-sm text-gray-500">{user.email}</div>
                      </div>
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-full border ${isSelected ? "border-purple-400 bg-purple-500" : "border-white/20"
                          }`}
                      >
                        {isSelected && <Users className="h-3.5 w-3.5 text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            <div className="mt-3 flex items-center gap-3 text-sm text-gray-400">
              <Users className="w-4 h-4 text-purple-400" />
              <span>AI will distribute generated tasks across the selected team members.</span>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-linear-to-br from-purple-900/30 to-black/30 border-2 border-purple-500/50 rounded-3xl p-8 shadow-2xl shadow-purple-500/20 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-linear-to-br from-purple-500/5 to-transparent animate-pulse" />
            <div className="flex items-start gap-6 relative z-10">
              <div className="p-4 bg-linear-to-br from-purple-600 to-purple-900 rounded-2xl shadow-xl shadow-purple-500/50">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="mb-3 text-2xl font-semibold bg-linear-to-r from-purple-300 to-white bg-clip-text text-transparent">
                  AI-Powered Planning
                </h4>
                <p className="text-base text-gray-300 leading-relaxed mb-5">
                  Our AI will analyze your project and automatically create:
                </p>
                <ul className="space-y-4 text-base text-gray-200">
                  {[
                    { color: "bg-purple-400 shadow-purple-400/50", text: "Complete project timeline with milestones" },
                    { color: "bg-purple-400 shadow-purple-400/50", text: "Sprint breakdown with daily tasks" },
                    { color: "bg-green-400 shadow-green-400/50", text: "Cost estimation and resource allocation" },
                    { color: "bg-yellow-400 shadow-yellow-400/50", text: "Feasibility insights and risk analysis" },
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${item.color} shadow-lg`} />
                      {item.text}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>

          <motion.button
            type="submit"
            disabled={isGenerating}
            whileHover={!isGenerating ? { y: -2 } : {}}
            whileTap={!isGenerating ? { scale: 0.98 } : {}}
            className={`w-full py-7 rounded-3xl text-xl font-bold transition-all duration-300 relative overflow-hidden border ${isGenerating
              ? "bg-black/40 border-white/5 cursor-not-allowed text-white/40"
              : "bg-black/80 border-white/10 text-white"
              }`}
          >
            {!isGenerating && (
              <motion.div
                className="absolute inset-0 rounded-3xl pointer-events-none"
                style={{ background: "linear-gradient(135deg, rgba(88,28,135,0.7) 0%, rgba(0,0,0,0.9) 50%, rgba(255,255,255,0.15) 100%)" }}
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            )}
            {isGenerating ? (
              <span className="flex items-center justify-center gap-4 relative z-10">
                <Loader2 className="w-7 h-7 animate-spin" />
                <span>AI is generating your project plan...</span>
              </span>
            ) : (
              <span className="flex items-center justify-center gap-4 relative z-10">
                <Sparkles className="w-7 h-7" />
                <span>Generate Project Plan</span>
              </span>
            )}
          </motion.button>
        </form>

        {isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-10 bg-linear-to-br from-white/5 to-white/2 border-2 border-purple-500/30 rounded-3xl p-8 space-y-5"
          >
            {[
              { label: "Analyzing project requirements", delay: 0 },
              { label: "Generating timeline and milestones", delay: 0.8 },
              { label: "Creating sprint breakdown", delay: 1.6 },
              { label: "Calculating cost estimation", delay: 2.4 },
            ].map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: step.delay }}
                className="flex items-center gap-4 text-lg text-gray-300"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full shrink-0"
                />
                <span>{step.label}</span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
