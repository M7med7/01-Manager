import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const [{ data: users, error: usersError }, { data: tasks }] = await Promise.all([
      supabase.from('users').select('*').order('created_at'),
      supabase.from('tasks').select('assigned_to'),
    ]);

    if (usersError) throw usersError;

    const enriched = (users ?? []).map((user) => ({
      ...user,
      task_count: (tasks ?? []).filter((t) => t.assigned_to === user.id).length,
    }));

    res.json({ users: enriched });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
