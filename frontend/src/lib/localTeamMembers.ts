import type { User } from "./api";

export interface StoredTeamMember {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  created_at: string;
  task_count: number;
}

const LOCAL_TEAM_MEMBERS_KEY = "zeroone-local-team-members";

export function readLocalTeamMembers(): StoredTeamMember[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_TEAM_MEMBERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalTeamMember(member: StoredTeamMember) {
  window.localStorage.setItem(LOCAL_TEAM_MEMBERS_KEY, JSON.stringify([...readLocalTeamMembers(), member]));
}

export function removeLocalTeamMember(id: string) {
  window.localStorage.setItem(
    LOCAL_TEAM_MEMBERS_KEY,
    JSON.stringify(readLocalTeamMembers().filter((m) => m.id !== id))
  );
}

export function mapLocalTeamMemberToUser(member: StoredTeamMember): User {
  return {
    id: member.id,
    email: member.email,
    full_name: member.full_name,
    avatar_url: null,
    created_at: member.created_at,
    task_count: member.task_count,
  };
}
