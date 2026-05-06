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
  estimated_days: number;
  assigned_tech: string[];
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  project_name?: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  task_count: number;
}

const BASE_URL = 'http://localhost:5001/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      ...options,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`API error ${res.status}: ${body}`);
    }
    return res.json();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('API request timed out', { cause: error });
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export const api = {
  projects: {
    list: () => request<{ projects: Project[] }>('/projects'),
    get: (id: string) => request<{ project: Project; tasks: Task[] }>(`/projects/${id}`),
  },
  tasks: {
    list: () => request<{ tasks: Task[] }>('/tasks'),
  },
  users: {
    list: () => request<{ users: User[] }>('/users'),
  },
  ai: {
    generate: (data: { name: string; description: string; duration: string; headcount: string }) =>
      request<{ success: boolean; project_id: string }>('/ai/generate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    chat: (data: { message: string; context?: string }) =>
      request<{ response: string }>('/ai/chat', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
};
