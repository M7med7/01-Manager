import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Clock, Users, Trash2, AlertTriangle, X, Activity, FileText } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "../components/Button";
import { api, type Project } from "../lib/api";
import { riskStyle } from "../lib/riskScoring";

const COLORS = ["blue", "purple", "green", "red"] as const;
type Color = typeof COLORS[number];

const colorMap: Record<Color, string> = {
  blue: "from-purple-700 to-purple-900",
  purple: "from-purple-600 to-purple-800",
  green: "from-purple-500 to-purple-700",
  red: "from-purple-800 to-black",
};

function formatDeadline(createdAt: string): string {
  const d = new Date(createdAt);
  d.setDate(d.getDate() + 30);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function healthText(project: Project): string {
  if (project.health_score === undefined) return "Health pending";
  return `${project.health_score}% health`;
}

function ConfirmDeleteModal({
  projectName,
  onConfirm,
  onCancel,
  deleting,
}: {
  projectName: string;
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
            <h3 className="text-lg font-semibold text-white">Delete project?</h3>
            <p className="mt-1 text-sm text-gray-400">
              <span className="font-semibold text-white">"{projectName}"</span> and all its tasks will be permanently deleted.
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
            {deleting ? "Deleting…" : "Delete project"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export function ProjectsDashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    api.projects
      .list()
      .then(({ projects }) => setProjects(projects))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async () => {
    if (!confirmId) return;
    setDeletingId(confirmId);
    try {
      await api.projects.delete(confirmId);
      setProjects((prev) => prev.filter((p) => p.id !== confirmId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete project");
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  };

  const confirmProject = confirmId ? projects.find((p) => p.id === confirmId) : null;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl mb-2 font-light">Projects</h2>
          <p className="text-gray-400 text-sm">AI-powered execution plans</p>
        </div>
        <Button onClick={() => navigate("/create")}>+ New Project</Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-xl text-red-300 text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center h-48 text-gray-500">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">Loading projects...</p>
          </div>
        </div>
      )}

      {!loading && !error && projects.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <p className="text-xl mb-2">No projects yet</p>
          <p className="text-sm mb-6">Create your first AI-generated project plan</p>
          <Button onClick={() => navigate("/create")}>+ New Project</Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {projects.map((project, index) => {
          const color = COLORS[index % COLORS.length];
          const gradient = colorMap[color];

          return (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              whileHover={{ y: -4 }}
              className="group"
            >
              <div className="relative">
                <Link to={`/task/${project.id}`}>
                  <div className="bg-white/3 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:border-purple-900/50 hover:shadow-lg hover:shadow-purple-900/10 transition-all duration-300 cursor-pointer h-full flex flex-col relative overflow-hidden">
                    <div className="absolute inset-0 bg-linear-to-br from-purple-900/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    <div className="absolute top-4 right-4 text-sm font-medium text-white/40">
                      {String(index + 1).padStart(2, "0")}
                    </div>

                    <div className="mb-3 relative z-10">
                      <h3 className="text-lg mb-1 group-hover:text-white transition-colors duration-300">
                        {project.name}
                      </h3>
                      {project.risk_level && (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className={`rounded-lg border px-2 py-1 text-[11px] font-semibold ${riskStyle(project.risk_level)}`}>
                            {project.risk_level} risk
                          </span>
                          <span className="text-[11px] text-gray-500">{healthText(project)}</span>
                        </div>
                      )}
                    </div>

                    <p className="text-gray-500 text-sm mb-4 flex-1 leading-relaxed relative z-10">
                      {project.description}
                    </p>

                    <div className="flex items-center gap-4 mb-4 text-xs text-gray-600 relative z-10">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3 h-3" />
                        <span>{project.team_count ?? 0}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        <span>{formatDeadline(project.created_at)}</span>
                      </div>
                    </div>

                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-600">Progress</span>
                        <span className="text-xs text-white">{project.progress ?? 0}%</span>
                      </div>
                      <div className="h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${project.progress ?? 0}%` }}
                          transition={{ delay: index * 0.08 + 0.3, duration: 0.8, ease: "easeOut" }}
                          className={`h-full bg-linear-to-r ${gradient} rounded-full`}
                        />
                      </div>
                      {project.risk_reasons && project.risk_reasons.length > 0 && (
                        <p className="mt-3 line-clamp-2 text-xs text-gray-500">
                          Risk: {project.risk_reasons.slice(0, 2).join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>

                {/* Delete button — appears on card hover */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmId(project.id);
                  }}
                  className="absolute top-3 left-3 z-20 flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-black/60 text-gray-500 opacity-0 group-hover:opacity-100 hover:border-red-500/50 hover:bg-red-900/30 hover:text-red-400 transition-all duration-200"
                  aria-label={`Delete ${project.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>

                {/* Health button — appears on card hover */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    navigate(`/project/${project.id}/health`);
                  }}
                  className="absolute top-3 left-14 z-20 flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-black/60 px-2.5 text-gray-500 opacity-0 group-hover:opacity-100 hover:border-purple-500/50 hover:bg-purple-900/30 hover:text-purple-300 transition-all duration-200 text-[11px] font-medium"
                  aria-label={`Health dashboard for ${project.name}`}
                >
                  <Activity className="h-3.5 w-3.5" />
                  Health
                </button>

                {/* Report button — appears on card hover */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    navigate(`/project/${project.id}/report`);
                  }}
                  className="absolute top-3 left-26 z-20 flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-black/60 px-2.5 text-gray-500 opacity-0 group-hover:opacity-100 hover:border-purple-500/50 hover:bg-purple-900/30 hover:text-purple-300 transition-all duration-200 text-[11px] font-medium"
                  aria-label={`Weekly report for ${project.name}`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Report
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {confirmProject && (
          <ConfirmDeleteModal
            projectName={confirmProject.name}
            onConfirm={handleDelete}
            onCancel={() => setConfirmId(null)}
            deleting={deletingId !== null}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
