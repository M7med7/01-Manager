import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Clock, Users } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "../components/Button";
import { api, type Project } from "../lib/api";

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

export function ProjectsDashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.projects
      .list()
      .then(({ projects }) => setProjects(projects))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

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
          {error} — make sure the backend is running on port 5001
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
            >
              <Link to={`/task/${project.id}`}>
                <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:border-purple-900/50 hover:shadow-lg hover:shadow-purple-900/10 transition-all duration-300 group cursor-pointer h-full flex flex-col relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-900/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  <div className="absolute top-4 right-4 text-sm font-medium text-white/40">
                    {String(index + 1).padStart(2, "0")}
                  </div>

                  <div className="mb-3 relative z-10">
                    <h3 className="text-lg mb-1 group-hover:text-white transition-colors duration-300">
                      {project.name}
                    </h3>
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
                        className={`h-full bg-gradient-to-r ${gradient} rounded-full`}
                      />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
