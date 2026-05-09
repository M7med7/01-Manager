export interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  team_count: number;
  progress: number;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  estimated_days: number;
  assigned_tech: string[];
  assigned_to: string | null;
  completed_by: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  project_name?: string;
  completer_name?: string | null;
}

export interface UserCompletedTask {
  id: string;
  title: string;
  project_name: string | null;
}

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  task_count: number;
  project_count: number;
  completed_count: number;
  completed_tasks: UserCompletedTask[];
}

export interface ProjectMember {
  user_id: string;
  role: string;
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

const BASE_URL = `${import.meta.env.VITE_API_URL ?? 'http://localhost:5001'}/api`;

async function attempt<T>(path: string, options: RequestInit | undefined, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      ...options,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      let message = `Request failed (${res.status})`;
      try {
        const parsed = JSON.parse(body);
        if (parsed.error) message = parsed.error;
      } catch {
        if (body) message = body;
      }
      throw new Error(message);
    }
    return res.json();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('__timeout__');
    }
    if (error instanceof TypeError) {
      throw new Error('Could not reach the server. Make sure the backend is running.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function request<T>(path: string, options?: RequestInit, timeoutMs = 20_000): Promise<T> {
  // AI requests already have a 120s timeout — no retry needed.
  // Regular requests retry up to 2 times (3s apart) to survive Render cold starts.
  const maxRetries = timeoutMs >= 100_000 ? 0 : 2;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await attempt<T>(path, options, timeoutMs);
    } catch (err) {
      const isTimeout = err instanceof Error && err.message === '__timeout__';
      if (isTimeout && i < maxRetries) {
        await new Promise<void>((r) => setTimeout(r, 3_000));
        continue;
      }
      if (isTimeout) throw new Error('Request timed out. Please try again.');
      throw err;
    }
  }
  throw new Error('Request timed out. Please try again.');
}

export const api = {
  projects: {
    list: () => request<{ projects: Project[] }>('/projects'),
    get: (id: string) =>
      request<{ project: Project; tasks: Task[]; members: ProjectMember[] }>(`/projects/${id}`),
    delete: (id: string) =>
      request<{ success: boolean }>(`/projects/${id}`, { method: 'DELETE' }),
    addMember: (projectId: string, userId: string) =>
      request<{ success: boolean }>(`/projects/${projectId}/members`, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      }),
    removeMember: (projectId: string, userId: string) =>
      request<{ success: boolean }>(`/projects/${projectId}/members/${userId}`, {
        method: 'DELETE',
      }),
  },
  tasks: {
    list: () => request<{ tasks: Task[] }>('/tasks'),
    get: (id: string) => request<{ task: Task }>(`/tasks/${id}`),
    create: (data: {
      project_id: string;
      title: string;
      description?: string;
      priority?: string;
      assigned_to?: string | null;
      estimated_days: number;
      assigned_tech?: string[];
    }) =>
      request<{ task: Task }>('/tasks', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    assign: (taskId: string, assignedTo: string | null) =>
      request<{ success: boolean }>(`/tasks/${taskId}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({ assigned_to: assignedTo }),
      }),
    complete: (taskId: string, completed: boolean, completedBy?: string) =>
      request<{ success: boolean }>(`/tasks/${taskId}/complete`, {
        method: 'PATCH',
        body: JSON.stringify({ completed, completed_by: completedBy }),
      }),
  },
  users: {
    list: () => request<{ users: User[] }>('/users'),
    update: (id: string, data: { full_name: string }) =>
      request<{ success: boolean }>(`/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/users/${id}`, { method: 'DELETE' }),
  },
  ai: {
    generate: (data: { name: string; description: string; duration: string; team_members: string[] }) =>
      request<{ success: boolean; project_id: string }>('/ai/generate', {
        method: 'POST',
        body: JSON.stringify(data),
      }, 120_000),
    chat: (data: { message: string; context?: string }) =>
      request<{ response: string }>('/ai/chat', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
};
