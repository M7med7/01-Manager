import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const [
      { data: projects, error: projectsError },
      { data: assignments },
      { data: tasks },
    ] = await Promise.all([
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
      supabase.from('team_assignments').select('project_id'),
      supabase.from('tasks').select('project_id, status'),
    ]);

    if (projectsError) throw projectsError;

    const enriched = (projects ?? []).map((project) => {
      const teamCount = (assignments ?? []).filter((a) => a.project_id === project.id).length;
      const projectTasks = (tasks ?? []).filter((t) => t.project_id === project.id);
      const doneTasks = projectTasks.filter((t) => t.status === 'Done').length;
      const progress = projectTasks.length > 0 ? Math.round((doneTasks / projectTasks.length) * 100) : 0;
      return { ...project, team_count: teamCount, progress };
    });

    res.json({ projects: enriched });
  } catch (error: any) {
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
      supabase.from('projects').select('*').eq('id', id).single(),
      supabase.from('tasks').select('*').eq('project_id', id).order('created_at'),
      supabase.from('team_assignments').select('user_id').eq('project_id', id),
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
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, description, created_by, team_members } = req.body;

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({ name, description, created_by: created_by ?? null })
      .select()
      .single();

    if (projectError) throw projectError;

    if (team_members && team_members.length > 0) {
      const assignments = team_members.map((user_id: string) => ({
        project_id: project.id,
        user_id,
        role: 'Member',
      }));
      await supabase.from('team_assignments').insert(assignments);
    }

    res.json({ project });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
