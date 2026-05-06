import { Link } from "react-router-dom";

const projects = [
  {
    name: "ZeroOne Manager Redesign",
    description: "Refresh the planning dashboard and project workspace.",
    completion: 45,
  },
  {
    name: "Takamul Platform Backend",
    description: "Build core APIs and database integrations.",
    completion: 80,
  },
];

export function Projects() {
  return (
    <div className="p-8 text-white">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-light">Projects</h1>
        <Link to="/new" className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-medium">
          New Project
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {projects.map((project) => (
          <article key={project.name} className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="mb-2 text-lg font-semibold">{project.name}</h2>
            <p className="mb-4 text-sm text-gray-400">{project.description}</p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Completion</span>
              <span>{project.completion}%</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
