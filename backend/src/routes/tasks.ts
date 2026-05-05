import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*, projects(name)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formatted = (tasks ?? []).map(({ projects, ...task }) => ({
      ...task,
      project_name: (projects as { name: string } | null)?.name ?? null,
    }));

    res.json({ tasks: formatted });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
