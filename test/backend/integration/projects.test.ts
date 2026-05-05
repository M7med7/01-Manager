import request from 'supertest';

jest.mock('../../../backend/src/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

import app from '../../../backend/src/app';
import { supabase } from '../../../backend/src/lib/supabase';

const mockFrom = supabase.from as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/projects', () => {
  it('returns 200 with a list of projects', async () => {
    const fakeProjects = [{ id: 'p1', name: 'Alpha' }];
    mockFrom.mockReturnValue({
      select: jest.fn().mockResolvedValue({ data: fakeProjects, error: null }),
    });

    const res = await request(app).get('/api/projects');
    expect(res.status).toBe(200);
    expect(res.body.projects).toEqual(fakeProjects);
  });

  it('returns 500 when the database returns an error', async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockResolvedValue({ data: null, error: { message: 'Connection lost' } }),
    });

    const res = await request(app).get('/api/projects');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Connection lost');
  });
});

describe('POST /api/projects', () => {
  it('creates a project and returns it', async () => {
    const fakeProject = { id: 'p1', name: 'New App', description: 'Desc' };

    mockFrom
      .mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: fakeProject, error: null }),
          }),
        }),
      })
      .mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null }),
      });

    const res = await request(app)
      .post('/api/projects')
      .send({ name: 'New App', description: 'Desc', team_members: ['u1'] });

    expect(res.status).toBe(200);
    expect(res.body.project).toEqual(fakeProject);
  });

  it('returns 500 when the project insert fails', async () => {
    mockFrom.mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Duplicate name' } }),
        }),
      }),
    });

    const res = await request(app)
      .post('/api/projects')
      .send({ name: 'Duplicate', description: 'Desc' });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Duplicate name');
  });

  it('skips team assignments when team_members is empty', async () => {
    const fakeProject = { id: 'p2', name: 'Solo App' };

    mockFrom.mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: fakeProject, error: null }),
        }),
      }),
    });

    const res = await request(app)
      .post('/api/projects')
      .send({ name: 'Solo App', description: 'No team', team_members: [] });

    expect(res.status).toBe(200);
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });
});
