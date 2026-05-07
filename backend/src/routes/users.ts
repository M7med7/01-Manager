import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { demoUsers } from '../lib/demoData';
import { isConnectivityError, withTimeout } from '../lib/timeout';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const [{ data: users, error: usersError }, { data: tasks }] = await Promise.all([
      withTimeout(supabase.from('users').select('*').order('created_at')),
      withTimeout(supabase.from('tasks').select('assigned_to')),
    ]);

    if (usersError) throw usersError;

    const enriched = (users ?? []).map((user) => ({
      ...user,
      task_count: (tasks ?? []).filter((t) => t.assigned_to === user.id).length,
    }));

    res.json({ users: enriched });
  } catch (error: any) {
    if (isConnectivityError(error)) {
      return res.json({ users: demoUsers, source: 'demo' });
    }
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
