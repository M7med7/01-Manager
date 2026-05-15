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
  duration_weeks?: number | null;
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
  start_date?: string | null;
  end_date?: string | null;
  created_at: string;
  updated_at: string;
  project_name?: string;
  completer_name?: string | null;
  blocked_by?: TaskDependencyRef[];
  unlocks?: TaskDependencyRef[];
  is_blocked?: boolean;
  blocking_count?: number;
  latest_activity_at?: string | null;
}

export interface CollaborationUser {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string | null;
  content: string;
  edited_at: string | null;
  created_at: string;
  updated_at: string;
  users?: CollaborationUser | null;
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  uploaded_by: string | null;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  is_image: boolean;
  created_at: string;
  users?: CollaborationUser | null;
}

export interface TaskActivity {
  id: string;
  task_id: string;
  user_id: string | null;
  activity_type: string;
  summary: string;
  metadata: Record<string, unknown>;
  created_at: string;
  users?: CollaborationUser | null;
}

export interface NotificationPreferences {
  assignments: boolean;
  mentions: boolean;
  comments: boolean;
  status_changes: boolean;
  due_reminders: boolean;
  overdue_alerts: boolean;
  project_risk: boolean;
}

export interface AppNotification {
  id: string;
  user_id: string;
  actor_id: string | null;
  task_id: string | null;
  project_id: string | null;
  notification_type: string;
  message: string;
  link_path: string | null;
  read_at: string | null;
  created_at: string;
  tasks?: { title: string; project_id: string | null } | null;
  projects?: { name: string } | null;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  phases: string[];
  recommended_technologies: string[];
  task_blueprints?: Array<Record<string, unknown>>;
  source_project_id?: string | null;
  is_custom?: boolean;
}

export interface TaskDependencyRef {
  id: string;
  title: string;
  status: string;
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
  phone?: string | null;
  created_at: string;
  task_count: number;
  project_count: number;
  completed_count: number;
  completed_tasks: { id: string; title: string; project_name: string | null }[];
  total_estimated_days: number;
  skills: string[];
  experience_summary: string | null;
  cv_parsed_at: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  x_url: string | null;
  job_title?: string | null;
}

export interface ProfileData extends User {
  weekly_streak: number;
  achievements: string[];
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
      throw new Error('__timeout__', { cause: error });
    }
    if (error instanceof TypeError) {
      throw new Error('Could not reach the server. Make sure the backend is running.', { cause: error });
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
      if (isTimeout) throw new Error('Request timed out. Please try again.', { cause: err });
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
    assign: (taskId: string, assignedTo: string | null, userId?: string | null) =>
      request<{ success: boolean }>(`/tasks/${taskId}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({ assigned_to: assignedTo, user_id: userId ?? null }),
      }),
    complete: (taskId: string, completed: boolean, completedBy?: string) =>
      request<{ success: boolean }>(`/tasks/${taskId}/complete`, {
        method: 'PATCH',
        body: JSON.stringify({ completed, completed_by: completedBy }),
      }),
    updateStatus: (taskId: string, status: string, completedBy?: string | null) =>
      request<{ success: boolean; status: string; completed_by?: string | null; completed_at?: string | null }>(`/tasks/${taskId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, completed_by: completedBy ?? null }),
      }),
    updatePriority: (taskId: string, priority: string, userId?: string | null) =>
      request<{ success: boolean; priority: string }>(`/tasks/${taskId}/priority`, {
        method: 'PATCH',
        body: JSON.stringify({ priority, user_id: userId ?? null }),
      }),
    updateSchedule: (taskId: string, data: { start_date: string | null; end_date: string | null; estimated_days?: number; user_id?: string | null }) =>
      request<{ success: boolean }>(`/tasks/${taskId}/schedule`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    addDependency: (taskId: string, dependsOnTaskId: string) =>
      request<{ success: boolean; already_exists?: boolean }>(`/tasks/${taskId}/dependencies`, {
        method: 'POST',
        body: JSON.stringify({ depends_on_task_id: dependsOnTaskId }),
      }),
    removeDependency: (taskId: string, dependsOnTaskId: string) =>
      request<{ success: boolean }>(`/tasks/${taskId}/dependencies/${dependsOnTaskId}`, {
        method: 'DELETE',
      }),
    collaboration: (taskId: string) =>
      request<{ comments: TaskComment[]; attachments: TaskAttachment[]; activity: TaskActivity[] }>(`/tasks/${taskId}/collaboration`),
    addComment: (taskId: string, data: { user_id?: string | null; content: string; mentioned_user_ids?: string[] }) =>
      request<{ comment: TaskComment }>(`/tasks/${taskId}/comments`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateComment: (taskId: string, commentId: string, data: { user_id?: string | null; content: string }) =>
      request<{ comment: TaskComment }>(`/tasks/${taskId}/comments/${commentId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    deleteComment: (taskId: string, commentId: string, userId?: string | null) =>
      request<{ success: boolean }>(`/tasks/${taskId}/comments/${commentId}`, {
        method: 'DELETE',
        body: JSON.stringify({ user_id: userId ?? null }),
      }),
    uploadAttachment: async (taskId: string, file: File, userId?: string | null) => {
      const formData = new FormData();
      formData.append('file', file);
      if (userId) formData.append('user_id', userId);
      const res = await fetch(`${BASE_URL}/tasks/${taskId}/attachments`, {
        method: 'POST',
        body: formData,
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
      return res.json() as Promise<{ attachment: TaskAttachment }>;
    },
  },
  users: {
    list: () => request<{ users: User[] }>('/users'),
    getProfile: (id: string) => request<{ profile: ProfileData }>(`/users/${id}/profile`),
    update: (id: string, data: { full_name?: string; phone?: string; experience_summary?: string; github_url?: string; linkedin_url?: string; x_url?: string; skills?: string[]; job_title?: string }) =>
      request<{ success: boolean }>(`/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/users/${id}`, { method: 'DELETE' }),
    uploadCV: async (id: string, file: File) => {
      const formData = new FormData();
      formData.append('cv', file);
      const res = await fetch(`${BASE_URL}/users/${id}/cv`, {
        method: 'POST',
        body: formData,
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
      return res.json() as Promise<{ success: boolean; skills: string[]; experience_summary: string }>;
    },
    uploadAvatar: async (id: string, file: File) => {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await fetch(`${BASE_URL}/users/${id}/avatar`, {
        method: 'POST',
        body: formData,
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
      return res.json() as Promise<{ success: boolean; avatar_url: string }>;
    },
  },
  ai: {
    generate: (data: { name: string; description: string; duration: string; duration_unit: string; team_members: string[]; expand_description?: boolean; template_id?: string }) =>
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
  templates: {
    list: () => request<{ templates: ProjectTemplate[] }>('/templates'),
    saveFromProject: (projectId: string, data: { name?: string; created_by?: string | null }) =>
      request<{ template: ProjectTemplate }>(`/templates/from-project/${projectId}`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    duplicate: (id: string, createdBy?: string | null) =>
      request<{ template: ProjectTemplate }>(`/templates/${id}/duplicate`, {
        method: 'POST',
        body: JSON.stringify({ created_by: createdBy ?? null }),
      }),
  },
  notifications: {
    list: (userId: string) =>
      request<{ notifications: AppNotification[]; unread_count: number; preferences: NotificationPreferences }>(`/notifications/${userId}`),
    markRead: (id: string, read = true) =>
      request<{ success: boolean }>(`/notifications/${id}/read`, {
        method: 'PATCH',
        body: JSON.stringify({ read }),
      }),
    markAllRead: (userId: string) =>
      request<{ success: boolean }>(`/notifications/${userId}/read-all`, { method: 'PATCH' }),
    updatePreferences: (userId: string, preferences: Partial<NotificationPreferences>) =>
      request<{ preferences: NotificationPreferences }>(`/notifications/${userId}/preferences`, {
        method: 'PATCH',
        body: JSON.stringify(preferences),
      }),
  },
};
