import { generateSchedule } from '../../../backend/src/services/aiManager';

jest.mock('../../../backend/src/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

// Instantly resolve the mock delay so tests are fast
jest.spyOn(global, 'setTimeout').mockImplementation((fn: TimerHandler) => {
  if (typeof fn === 'function') fn();
  return 0 as unknown as ReturnType<typeof setTimeout>;
});

const baseRequest = {
  projectId: 'proj-1',
  projectName: 'Test Project',
  description: 'A test project description',
  teamMembers: [{ user_id: 'u1' }, { user_id: 'u2' }],
};

describe('generateSchedule (mock mode)', () => {
  it('returns exactly 4 tasks', async () => {
    const result = await generateSchedule(baseRequest);
    expect(result.tasks).toHaveLength(4);
  });

  it('assigns team members to tasks', async () => {
    const result = await generateSchedule(baseRequest);
    const assigned = result.tasks.map(t => t.assigned_to);
    expect(assigned).toContain('u1');
    expect(assigned).toContain('u2');
  });

  it('returns 2 Finish-to-Start dependencies', async () => {
    const result = await generateSchedule(baseRequest);
    expect(result.dependencies).toHaveLength(2);
    result.dependencies.forEach(d =>
      expect(d.dependency_type).toBe('Finish-to-Start')
    );
  });

  it('returns technology recommendations with required fields', async () => {
    const result = await generateSchedule(baseRequest);
    expect(result.technology_recommendations.length).toBeGreaterThan(0);
    result.technology_recommendations.forEach(rec => {
      expect(rec).toHaveProperty('tech_name');
      expect(rec).toHaveProperty('category');
      expect(rec).toHaveProperty('reasoning');
    });
  });

  it('falls back to same user for all tasks when only one team member', async () => {
    const result = await generateSchedule({
      ...baseRequest,
      teamMembers: [{ user_id: 'solo' }],
    });
    result.tasks.forEach(t => expect(t.assigned_to).toBe('solo'));
  });

  it('each task has a unique id', async () => {
    const result = await generateSchedule(baseRequest);
    const ids = result.tasks.map(t => t.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});
