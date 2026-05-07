import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';
import { isConnectivityError, withTimeout } from '../lib/timeout';
import { generateSchedule, generateChatResponse } from '../services/aiManager';

const router = Router();
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

router.post('/generate', async (req, res) => {
  const t0 = Date.now();
  try {
    const { name, description, headcount, duration, team_members } = req.body;

    if (!name || !description) {
      return res.status(400).json({ error: 'name and description are required' });
    }

    console.log(`[AI] /generate received — name="${name}"`);

    const projectId = uuidv4();
    const headcountNum = parseInt(headcount) || 1;
    const selectedMembers = Array.isArray(team_members)
      ? team_members.filter((userId: unknown): userId is string => typeof userId === 'string' && userId.length > 0)
      : [];
    const databaseMembers = selectedMembers.filter((userId) => UUID_PATTERN.test(userId));
    const scheduleMembers =
      selectedMembers.length > 0
        ? selectedMembers.map((user_id) => ({ user_id }))
        : Array.from({ length: headcountNum }, (_, i) => ({ user_id: `user${i + 1}` }));

    const durationWeeks = Math.max(1, parseInt(duration) || 8);
    const schedule = await generateSchedule({
      projectId,
      projectName: name,
      description,
      durationWeeks,
      teamMembers: scheduleMembers,
    });

    const projectTable = supabase.from('projects') as any;
    let project = { id: projectId, name, description };

    if (projectTable && typeof projectTable.insert === 'function') {
      const { data, error: projectError } = await withTimeout<{ data: any; error: any }>(
        projectTable
          .insert({ id: projectId, name, description, created_by: null })
          .select()
          .single()
      );

      if (projectError) throw projectError;
      project = data ?? project;

      if (databaseMembers.length > 0) {
        await withTimeout(
          supabase.from('team_assignments').insert(
            databaseMembers.map((user_id) => ({
              project_id: project.id,
              user_id,
              role: 'Member',
            }))
          )
        );
      }

      if (schedule.tasks.length > 0) {
        const tasksToInsert = schedule.tasks.map((task) => ({
          project_id: project.id,
          title: task.title,
          description: task.description,
          status: 'To Do',
          estimated_days: task.estimated_days,
          assigned_tech: task.assigned_tech,
          assigned_to: databaseMembers.includes(task.assigned_to) ? task.assigned_to : null,
        }));
        await withTimeout(supabase.from('tasks').insert(tasksToInsert));
      }
    }

    console.log(`[AI] /generate complete in ${Date.now() - t0}ms`);
    res.json({ success: true, project_id: project.id, schedule });
  } catch (error: any) {
    console.error(`[AI] /generate error after ${Date.now() - t0}ms:`, error.message);
    if (isConnectivityError(error)) {
      return res.json({
        success: true,
        project_id: uuidv4(),
        offline: true,
        message: 'Generated in demo mode because Supabase is not reachable.',
      });
    }
    res.status(500).json({ error: error.message });
  }
});

router.post('/chat', async (req, res) => {
  const { message, context } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'message is required' });
  }

  try {
    const response = await generateChatResponse(message as string, context as string | undefined);
    res.json({ response });
  } catch (err: any) {
    console.error('[AI] /chat error:', err.message);
    res.status(500).json({ response: 'AI service error. Please try again.' });
  }
});

export default router;
