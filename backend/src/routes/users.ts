import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { demoUsers } from '../lib/demoData';
import { isConnectivityError, withTimeout } from '../lib/timeout';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const [
      { data: users, error: usersError },
      { data: tasks },
      { data: assignments },
    ] = await Promise.all([
      withTimeout(supabase.from('users').select('*').order('created_at')),
      withTimeout(supabase.from('tasks').select('id, title, assigned_to, status, project_id, estimated_days, projects(name)')),
      withTimeout(supabase.from('team_assignments').select('user_id')),
    ]);

    if (usersError) throw usersError;

    const enriched = (users ?? []).map((user) => {
      const userTasks = (tasks ?? []).filter((t) => t.assigned_to === user.id);
      const completedTasks = (tasks ?? []).filter((t: any) => t.assigned_to === user.id && t.status === 'Done');
      const totalEstimatedDays = userTasks.reduce((sum, t: any) => sum + (Number(t.estimated_days) || 0), 0);

      return {
        ...user,
        task_count: userTasks.length,
        total_estimated_days: totalEstimatedDays,
        project_count: (assignments ?? []).filter((a) => a.user_id === user.id).length,
        completed_count: completedTasks.length,
        completed_tasks: completedTasks.map((t: any) => ({
          id: t.id,
          title: t.title,
          project_name: (t.projects as { name: string } | null)?.name ?? null,
        })),
      };
    });

    res.json({ users: enriched });
  } catch (error: any) {
    if (isConnectivityError(error)) {
      return res.json({ users: demoUsers, source: 'demo' });
    }
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, phone } = req.body as { full_name?: string; phone?: string };

    if (full_name === undefined) {
      return res.status(400).json({ error: 'full_name is required' });
    }

    const updateData: Record<string, unknown> = { full_name: full_name.trim() || null };
    if (phone !== undefined) updateData.phone = phone.trim() || null;

    const { error } = await withTimeout(
      supabase.from('users').update(updateData).eq('id', id)
    );
    if (error) throw error;

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await withTimeout(supabase.from('users').delete().eq('id', id));
    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
