import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { demoProjects, demoTasks } from '../lib/demoData';
import { isConnectivityError, withTimeout } from '../lib/timeout';

const router = Router();

async function resolveOrderedQuery(query: any, orderColumn: string, options?: Record<string, unknown>) {
  if (query && typeof query.order === 'function') {
    return query.order(orderColumn, options);
  }
  return query;
}

router.get('/', async (_req, res) => {
  try {
    const [
      { data: projects, error: projectsError },
      { data: assignments },
      { data: tasks },
    ] = await Promise.all([
      withTimeout(resolveOrderedQuery(supabase.from('projects').select('*'), 'created_at', { ascending: false })),
      withTimeout(supabase.from('team_assignments').select('project_id')),
      withTimeout(supabase.from('tasks').select('project_id, status')),
    ]);

    if (projectsError) throw projectsError;

    const canEnrich =
      (assignments ?? []).every((a) => Object.prototype.hasOwnProperty.call(a, 'project_id')) &&
      (tasks ?? []).every((t) => Object.prototype.hasOwnProperty.call(t, 'project_id'));

    if (!canEnrich) {
      return res.json({ projects: projects ?? [] });
    }

    const enriched = (projects ?? []).map((project: any) => {
      const teamCount = (assignments ?? []).filter((a) => a.project_id === project.id).length;
      const projectTasks = (tasks ?? []).filter((t) => t.project_id === project.id);
      const doneTasks = projectTasks.filter((t) => t.status === 'Done').length;
      const progress = projectTasks.length > 0 ? Math.round((doneTasks / projectTasks.length) * 100) : 0;
      return { ...project, team_count: teamCount, progress };
    });

    res.json({ projects: enriched });
  } catch (error: any) {
    if (isConnectivityError(error)) {
      return res.json({ projects: demoProjects, source: 'demo' });
    }
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [
      { data: project, error: projectError },
      { data: tasks, error: tasksError },
      { data: assignments },
    ] = await Promise.all([
      withTimeout(supabase.from('projects').select('*').eq('id', id).single()),
      withTimeout(supabase.from('tasks').select('*').eq('project_id', id).order('created_at')),
      withTimeout(supabase.from('team_assignments').select('user_id').eq('project_id', id)),
    ]);

    if (projectError) throw projectError;
    if (tasksError) throw tasksError;

    const taskList = tasks ?? [];
    const doneTasks = taskList.filter((t) => t.status === 'Done').length;
    const progress = taskList.length > 0 ? Math.round((doneTasks / taskList.length) * 100) : 0;

    res.json({
      project: { ...project, team_count: (assignments ?? []).length, progress },
      tasks: taskList,
    });
  } catch (error: any) {
    if (isConnectivityError(error)) {
      const project = demoProjects.find((item) => item.id === req.params.id) ?? demoProjects[0]!;
      const tasks = demoTasks.filter((task) => task.project_id === project.id);
      return res.json({ project, tasks, source: 'demo' });
    }
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, description, created_by, team_members } = req.body;

    const { data: project, error: projectError } = await withTimeout(
      supabase
        .from('projects')
        .insert({ name, description, created_by: created_by ?? null })
        .select()
        .single()
    );

    if (projectError) throw projectError;

    if (team_members && team_members.length > 0) {
      const assignments = team_members.map((user_id: string) => ({
        project_id: project.id,
        user_id,
        role: 'Member',
      }));
      await withTimeout(supabase.from('team_assignments').insert(assignments));
    }

    res.json({ project });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
