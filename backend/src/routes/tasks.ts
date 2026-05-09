import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { demoTasks } from '../lib/demoData';
import { isConnectivityError, withTimeout } from '../lib/timeout';

const router = Router();

// List all tasks (with project name)
router.get('/', async (_req, res) => {
  try {
    const { data: tasks, error } = await withTimeout(
      supabase
        .from('tasks')
        .select('*, projects(name)')
        .order('created_at', { ascending: true })
    );

    if (error) throw error;

    const formatted = (tasks ?? []).map(({ projects, ...task }) => ({
      ...task,
      project_name: (projects as { name: string } | null)?.name ?? null,
    }));

    res.json({ tasks: formatted });
  } catch (error: any) {
    if (isConnectivityError(error)) {
      return res.json({ tasks: demoTasks, source: 'demo' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Get a single task with full detail
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data: task, error } = await withTimeout(
      supabase
        .from('tasks')
        .select('*, projects(name), completer:completed_by(id, email, full_name)')
        .eq('id', id)
        .single()
    );

    if (error) throw error;

    const { projects, completer, ...rest } = task as any;
    res.json({
      task: {
        ...rest,
        project_name: projects?.name ?? null,
        completer_name: completer?.full_name ?? completer?.email ?? null,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new task
router.post('/', async (req, res) => {
  try {
    const { project_id, title, description, priority, assigned_to, estimated_days, assigned_tech } = req.body;

    if (!project_id || !title || !estimated_days) {
      return res.status(400).json({ error: 'project_id, title, and estimated_days are required' });
    }

    const techArray = Array.isArray(assigned_tech)
      ? assigned_tech
      : typeof assigned_tech === 'string'
      ? assigned_tech.split(',').map((t: string) => t.trim()).filter(Boolean)
      : [];

    const { data: task, error } = await withTimeout(
      supabase
        .from('tasks')
        .insert({
          project_id,
          title: title.trim(),
          description: description?.trim() || null,
          priority: priority || 'Medium',
          estimated_days: Math.max(1, Math.round(Number(estimated_days))),
          assigned_tech: techArray,
          assigned_to: assigned_to || null,
          status: 'To Do',
        })
        .select()
        .single()
    );

    if (error) throw error;
    res.json({ task });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle task completion
router.patch('/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { completed, completed_by } = req.body as { completed: boolean; completed_by?: string };

    // Authorization: only the currently assigned user can toggle completion
    const { data: taskData, error: fetchError } = await withTimeout(
      supabase.from('tasks').select('assigned_to').eq('id', id).single()
    );
    if (fetchError) throw fetchError;

    if (taskData.assigned_to && taskData.assigned_to !== (completed_by ?? null)) {
      return res.status(403).json({ error: 'Only the assigned user can complete this task.' });
    }

    const baseUpdates = completed
      ? { status: 'Done' as const, completed_by: completed_by ?? null }
      : { status: 'To Do' as const, completed_by: null as null };

    // Try with completed_at first, then without (schema drift fallback), then status only
    const withTimestamp = completed
      ? { ...baseUpdates, completed_at: new Date().toISOString() }
      : { ...baseUpdates, completed_at: null as null };

    const { error: e1 } = await withTimeout(
      supabase.from('tasks').update(withTimestamp).eq('id', id)
    );
    if (!e1) return res.json({ success: true, ...withTimestamp });

    const { error: e2 } = await withTimeout(
      supabase.from('tasks').update(baseUpdates).eq('id', id)
    );
    if (!e2) return res.json({ success: true, ...baseUpdates });

    const { error: e3 } = await withTimeout(
      supabase.from('tasks').update({ status: baseUpdates.status }).eq('id', id)
    );
    if (e3) throw e3;

    res.json({ success: true, status: baseUpdates.status });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update task schedule (start_date, end_date, estimated_days)
router.patch('/:id/schedule', async (req, res) => {
  try {
    const { id } = req.params;
    const { start_date, end_date, estimated_days } = req.body as {
      start_date?: string | null;
      end_date?: string | null;
      estimated_days?: number;
    };

    const updates: Record<string, unknown> = {};
    if (start_date !== undefined) updates.start_date = start_date || null;
    if (end_date !== undefined) updates.end_date = end_date || null;
    if (estimated_days !== undefined) updates.estimated_days = Math.max(1, Math.round(Number(estimated_days)));

    const { error } = await withTimeout(supabase.from('tasks').update(updates).eq('id', id));
    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Assign a task to a user
router.patch('/:id/assign', async (req, res) => {
  try {
    const { id } = req.params;
    const { assigned_to } = req.body as { assigned_to: string | null };
    const { error } = await withTimeout(
      supabase.from('tasks').update({ assigned_to: assigned_to ?? null }).eq('id', id)
    );
    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
