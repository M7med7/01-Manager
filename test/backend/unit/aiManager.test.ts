import { generateSchedule } from '../../../backend/src/services/aiManager';

jest.mock('../../../backend/src/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

const mockSchedule = {
  project_summary: 'Mock project summary.',
  tasks: [
    { id: 'uuid-1', title: 'Task 1', description: 'Desc\nSteps:\n1. a\n2. b', estimated_days: 3, assigned_tech: ['React'], assigned_to: 'u1', acceptance_criteria: ['User can complete the flow'], definition_of_done: ['Code is reviewed'] },
    { id: 'uuid-2', title: 'Task 2', description: 'Desc\nSteps:\n1. a', estimated_days: 2, assigned_tech: ['Node'], assigned_to: 'u2', acceptance_criteria: ['API returns expected response'], definition_of_done: ['Endpoint is tested'] },
    { id: 'uuid-3', title: 'Task 3', description: 'Desc', estimated_days: 1, assigned_tech: [], assigned_to: 'u1', acceptance_criteria: ['Task outcome is visible'], definition_of_done: ['Reviewed by teammate'] },
    { id: 'uuid-4', title: 'Task 4', description: 'Desc', estimated_days: 1, assigned_tech: [], assigned_to: 'u2', acceptance_criteria: ['Task output is verified'], definition_of_done: ['No known regressions'] },
  ],
  dependencies: [
    { task_id: 'uuid-2', depends_on_task_id: 'uuid-1', dependency_type: 'Finish-to-Start' },
    { task_id: 'uuid-3', depends_on_task_id: 'uuid-2', dependency_type: 'Finish-to-Start' },
  ],
  technology_recommendations: [
    { tech_name: 'React', category: 'Frontend', reasoning: 'For UI' },
  ],
};

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContentStream: jest.fn().mockResolvedValue({
        stream: (async function* () {
          yield { text: () => JSON.stringify(mockSchedule) };
        })(),
      }),
    }),
  })),
  SchemaType: {
    OBJECT: 'OBJECT',
    ARRAY: 'ARRAY',
    STRING: 'STRING',
    NUMBER: 'NUMBER',
    INTEGER: 'INTEGER',
    BOOLEAN: 'BOOLEAN',
  },
}));

beforeAll(() => {
  process.env.GEMINI_API_KEY = 'test-key';
});

afterAll(() => {
  delete process.env.GEMINI_API_KEY;
});

const baseRequest = {
  projectId: 'proj-1',
  projectName: 'Test Project',
  description: 'A test project description',
  durationValue: 8,
  durationUnit: 'Weeks' as const,
  teamMembers: [{ user_id: 'u1' }, { user_id: 'u2' }],
};

describe('generateSchedule', () => {
  it('returns exactly 4 tasks', async () => {
    const result = await generateSchedule(baseRequest);
    expect(result.tasks).toHaveLength(4);
  });

  it('assigns team members to tasks', async () => {
    const result = await generateSchedule(baseRequest);
    const assigned = result.tasks.map((t) => t.assigned_to);
    expect(assigned).toContain('u1');
    expect(assigned).toContain('u2');
  });

  it('returns 2 Finish-to-Start dependencies', async () => {
    const result = await generateSchedule(baseRequest);
    expect(result.dependencies).toHaveLength(2);
    result.dependencies.forEach((d) => expect(d.dependency_type).toBe('Finish-to-Start'));
  });

  it('returns technology recommendations with required fields', async () => {
    const result = await generateSchedule(baseRequest);
    expect(result.technology_recommendations.length).toBeGreaterThan(0);
    result.technology_recommendations.forEach((rec) => {
      expect(rec).toHaveProperty('tech_name');
      expect(rec).toHaveProperty('category');
      expect(rec).toHaveProperty('reasoning');
    });
  });

  it('each task has a unique id', async () => {
    const result = await generateSchedule(baseRequest);
    const ids = result.tasks.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('works with Months duration unit', async () => {
    const result = await generateSchedule({ ...baseRequest, durationValue: 3, durationUnit: 'Months' });
    expect(result.tasks).toHaveLength(4);
  });

  it('works with Years duration unit', async () => {
    const result = await generateSchedule({ ...baseRequest, durationValue: 1, durationUnit: 'Years' });
    expect(result.tasks).toHaveLength(4);
  });

  it('throws when GEMINI_API_KEY is not set', async () => {
    const key = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    await expect(generateSchedule(baseRequest)).rejects.toThrow('GEMINI_API_KEY');
    process.env.GEMINI_API_KEY = key;
  });
});
