import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { api } from "../lib/api";

export function CreateProject() {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    duration: "",
    headcount: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setError(null);
    try {
      await api.ai.generate(formData);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate project plan");
      setIsGenerating(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
            <h2 className="text-5xl mb-3 bg-gradient-to-r from-white via-purple-100 to-purple-200 bg-clip-text text-transparent font-bold">
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
            {error} — make sure the backend is running on port 5001
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
              className="w-full px-6 py-5 bg-gradient-to-br from-white/10 to-white/5 border-2 border-white/20 rounded-2xl focus:outline-none focus:border-purple-500/70 focus:shadow-2xl focus:shadow-purple-500/30 text-white placeholder-gray-500 transition-all duration-300 hover:border-white/30 text-lg"
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
              className="w-full px-6 py-5 bg-gradient-to-br from-white/10 to-white/5 border-2 border-white/20 rounded-2xl focus:outline-none focus:border-purple-500/70 focus:shadow-2xl focus:shadow-purple-500/30 text-white placeholder-gray-500 transition-all duration-300 hover:border-white/30 resize-none text-lg leading-relaxed"
            />
            <div className="mt-3 flex items-center gap-3 text-sm text-gray-400">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>AI will generate: Timeline, Sprints, Tasks, Cost Estimation, Feasibility Analysis</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div>
              <label className="block text-lg text-gray-300 mb-3 font-semibold">Expected Duration (weeks)</label>
              <input
                type="number"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                required
                min="1"
                placeholder="8"
                className="w-full px-6 py-5 bg-gradient-to-br from-white/10 to-white/5 border-2 border-white/20 rounded-2xl focus:outline-none focus:border-purple-500/70 text-white placeholder-gray-500 transition-all duration-300 hover:border-white/30 text-lg"
              />
            </div>
            <div>
              <label className="block text-lg text-gray-300 mb-3 font-semibold">Assigned Headcount</label>
              <input
                type="number"
                name="headcount"
                value={formData.headcount}
                onChange={handleChange}
                required
                min="1"
                placeholder="5"
                className="w-full px-6 py-5 bg-gradient-to-br from-white/10 to-white/5 border-2 border-white/20 rounded-2xl focus:outline-none focus:border-purple-500/70 text-white placeholder-gray-500 transition-all duration-300 hover:border-white/30 text-lg"
              />
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-purple-900/30 to-black/30 border-2 border-purple-500/50 rounded-3xl p-8 shadow-2xl shadow-purple-500/20 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent animate-pulse" />
            <div className="flex items-start gap-6 relative z-10">
              <div className="p-4 bg-gradient-to-br from-purple-600 to-purple-900 rounded-2xl shadow-xl shadow-purple-500/50">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="mb-3 text-2xl font-semibold bg-gradient-to-r from-purple-300 to-white bg-clip-text text-transparent">
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
            className={`w-full py-7 rounded-3xl text-xl font-bold transition-all duration-300 relative overflow-hidden border ${
              isGenerating
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
            className="mt-10 bg-gradient-to-br from-white/5 to-white/[0.02] border-2 border-purple-500/30 rounded-3xl p-8 space-y-5"
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
                  className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full flex-shrink-0"
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
