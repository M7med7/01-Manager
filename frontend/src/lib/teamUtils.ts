export function computeCapacity(storyPoints: number, maxSP: number): number {
  return Math.min(Math.round((storyPoints / maxSP) * 100), 100);
}

export function getInitials(fullName: string | null | undefined, email: string): string {
  if (fullName) {
    return fullName.trim().split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  }
  return email.slice(0, 2).toUpperCase();
}

export function computeLevelInfo(completedCount: number): { level: number; progress: number } {
  return {
    level: Math.floor(completedCount / 5) + 1,
    progress: ((completedCount % 5) / 5) * 100,
  };
}
