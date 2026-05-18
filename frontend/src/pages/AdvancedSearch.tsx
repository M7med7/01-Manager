import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Bookmark, CalendarClock, Filter, Search, Star, X } from "lucide-react";
import { api, type Project, type SearchFilters, type SearchResult, type User } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

type SavedFilter = { id: string; name: string; filters: SearchFilters };

const STORAGE_KEY = "zeroone-saved-search-filters";

const quickFilters: Array<{ label: string; patch: SearchFilters }> = [
  { label: "My Tasks", patch: { my_tasks: true } },
  { label: "Overdue", patch: { overdue: true } },
  { label: "Blocked", patch: { blocked: true } },
  { label: "High Priority", patch: { high_priority: true } },
  { label: "Due This Week", patch: { due_this_week: true } },
];

function readSaved(): SavedFilter[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeSaved(filters: SavedFilter[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
}

function preview(value: string | null): string {
  if (!value) return "";
  return value.length > 180 ? `${value.slice(0, 180)}...` : value;
}

function metaText(result: SearchResult): string {
  const meta = result.meta ?? {};
  const parts = [
    typeof meta.status === "string" ? meta.status : null,
    typeof meta.priority === "string" ? meta.priority : null,
    typeof meta.assignee === "string" ? meta.assignee : null,
    meta.blocked ? "Blocked" : null,
    typeof meta.risk === "string" ? `${meta.risk} risk` : null,
  ].filter(Boolean);
  return parts.join(" • ");
}

export function AdvancedSearch() {
  const { session } = useAuth();
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState<SearchFilters>({
    q: params.get("q") ?? "",
    user_id: session?.user.id ?? null,
  });
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [saved, setSaved] = useState<SavedFilter[]>(readSaved());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.projects.list(), api.users.list()])
      .then(([projectData, userData]) => {
        setProjects(projectData.projects);
        setUsers(userData.users);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    setFilters((current) => ({ ...current, user_id: session?.user.id ?? null }));
  }, [session?.user.id]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      api.search
        .run(filters)
        .then((data) => {
          setResults(data.results);
          setTotal(data.total);
          const next = new URLSearchParams();
          if (filters.q) next.set("q", filters.q);
          setParams(next, { replace: true });
        })
        .catch((err) => setError(err instanceof Error ? err.message : "Search failed"))
        .finally(() => setLoading(false));
    }, 220);
    return () => window.clearTimeout(handle);
  }, [filters, setParams]);

  const activeFilterCount = useMemo(() => {
    return Object.entries(filters).filter(([key, value]) => key !== "q" && key !== "user_id" && value !== undefined && value !== "" && value !== false).length;
  }, [filters]);

  const update = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const applyQuick = (patch: SearchFilters) => {
    setFilters((current) => ({ ...current, ...patch }));
  };

  const clearFilters = () => {
    setFilters({ q: filters.q ?? "", user_id: session?.user.id ?? null });
  };

  const saveFilter = () => {
    const name = window.prompt("Saved filter name", filters.q ? `${filters.q} filter` : "My saved filter");
    if (!name) return;
    const next = [{ id: crypto.randomUUID(), name, filters }, ...saved].slice(0, 10);
    setSaved(next);
    writeSaved(next);
  };

  const removeSaved = (id: string) => {
    const next = saved.filter((item) => item.id !== id);
    setSaved(next);
    writeSaved(next);
  };

  return (
    <div className="min-h-full p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-purple-300">
            <Search className="h-4 w-4" />
            Global search
          </div>
          <h1 className="mt-2 text-3xl font-semibold text-white">Search Everything</h1>
          <p className="mt-2 text-sm text-gray-500">Find projects, tasks, comments, files, assignees, risks, and technologies.</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/45 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
            <input
              value={filters.q ?? ""}
              onChange={(e) => update("q", e.target.value)}
              placeholder="Search by task, project, comment, file, assignee, technology..."
              className="w-full rounded-2xl border border-white/10 bg-black/45 py-4 pl-12 pr-4 text-lg text-white outline-none placeholder-gray-600 focus:border-purple-500/50"
              autoFocus
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {quickFilters.map((item) => (
              <button key={item.label} onClick={() => applyQuick(item.patch)} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-300 hover:border-purple-500/40 hover:text-white">
                {item.label}
              </button>
            ))}
            <button onClick={saveFilter} className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-900/20 px-3 py-1.5 text-xs text-purple-200 hover:bg-purple-900/30">
              <Bookmark className="h-3.5 w-3.5" />
              Save filter
            </button>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-gray-400 hover:text-white">
                <X className="h-3.5 w-3.5" />
                Clear {activeFilterCount}
              </button>
            )}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-7">
            <select value={filters.status ?? ""} onChange={(e) => update("status", e.target.value)} className="rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-gray-200">
              <option value="">Any status</option>
              {["Backlog", "To Do", "In Progress", "In Review", "Done"].map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={filters.priority ?? ""} onChange={(e) => update("priority", e.target.value)} className="rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-gray-200">
              <option value="">Any priority</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            <select value={filters.assignee ?? ""} onChange={(e) => update("assignee", e.target.value)} className="rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-gray-200">
              <option value="">Any assignee</option>
              <option value="unassigned">Unassigned</option>
              {users.map((user) => <option key={user.id} value={user.id}>{user.full_name ?? user.email}</option>)}
            </select>
            <select value={filters.project_id ?? ""} onChange={(e) => update("project_id", e.target.value)} className="rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-gray-200">
              <option value="">Any project</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
            <select value={filters.risk ?? ""} onChange={(e) => update("risk", e.target.value)} className="rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-gray-200">
              <option value="">Any risk</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            <select value={filters.due ?? ""} onChange={(e) => update("due", e.target.value)} className="rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-gray-200">
              <option value="">Any due date</option>
              <option value="overdue">Overdue</option>
              <option value="week">Due this week</option>
            </select>
            <input value={filters.tech ?? ""} onChange={(e) => update("tech", e.target.value)} placeholder="Tech/tag" className="rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-gray-200 outline-none placeholder-gray-600 focus:border-purple-500/50" />
          </div>
        </div>

        {saved.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-300">
              <Star className="h-4 w-4 text-purple-300" />
              Saved filters
            </div>
            <div className="flex flex-wrap gap-2">
              {saved.map((item) => (
                <span key={item.id} className="inline-flex items-center overflow-hidden rounded-full border border-white/10 bg-white/5 text-xs text-gray-300">
                  <button onClick={() => setFilters({ ...item.filters, user_id: session?.user.id ?? null })} className="px-3 py-1.5 hover:bg-purple-900/30">{item.name}</button>
                  <button onClick={() => removeSaved(item.id)} className="border-l border-white/10 px-2 py-1.5 text-gray-500 hover:text-red-300"><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-black/45">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-purple-300" />
              <h2 className="font-semibold text-white">Results</h2>
            </div>
            <div className="text-xs text-gray-500">{loading ? "Searching..." : `${total} found`}</div>
          </div>

          {error && <div className="m-4 rounded-xl border border-red-500/30 bg-red-900/20 p-3 text-sm text-red-200">{error}</div>}

          {!loading && results.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              <CalendarClock className="mx-auto mb-3 h-8 w-8 text-gray-700" />
              No matching work found.
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {results.map((result) => (
                <Link key={`${result.type}-${result.id}`} to={result.url} className="block p-5 transition-colors hover:bg-white/[0.03]">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-purple-500/30 bg-purple-900/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-purple-200">{result.matched}</span>
                        <span className="text-xs text-gray-500">{result.project_name}</span>
                      </div>
                      <div className="truncate text-base font-semibold text-white">{result.title}</div>
                      {result.subtitle && <p className="mt-1 line-clamp-2 text-sm text-gray-500">{preview(result.subtitle)}</p>}
                    </div>
                    <div className="shrink-0 text-xs text-gray-500 md:text-right">{metaText(result)}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
