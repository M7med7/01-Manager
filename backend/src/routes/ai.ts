import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { generateSchedule } from '../services/aiManager';

const router = Router();

const CHAT_RESPONSES = [
  "Based on your project requirements, I recommend starting with a strong foundation: define the data models first, then build the API layer, and finally the UI. This ensures each layer has a stable contract to work against.",
  "For optimal velocity, consider breaking work into 1-week sprints with clear acceptance criteria per task. Daily standups help surface blockers early before they cascade.",
  "The timeline looks feasible. Focus on the critical path — the longest chain of dependent tasks — and make sure those are staffed with your most experienced engineers.",
  "I'd suggest implementing authentication and authorization early. These are hard to retrofit and touch every part of the system.",
  "Consider investing in automated testing from the start. A CI pipeline that catches regressions early pays for itself many times over in a project of this scope.",
  "For the tech stack decisions, prioritize the team's existing expertise over the theoretically optimal choice. Familiarity dramatically increases delivery speed.",
];

router.post('/generate', async (req, res) => {
  try {
    const { name, description, headcount } = req.body;

    if (!name || !description) {
      return res.status(400).json({ error: 'name and description are required' });
    }

    // Create project in DB
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({ name, description, created_by: null })
      .select()
      .single();

    if (projectError) throw projectError;

    // Generate AI schedule
    const headcountNum = parseInt(headcount) || 1;
    const schedule = await generateSchedule({
      projectId: project.id,
      projectName: name,
      description,
      teamMembers: Array.from({ length: headcountNum }, (_, i) => ({ user_id: `user${i + 1}` })),
    });

    // Save generated tasks to DB (assigned_to is null since user IDs are mock)
    if (schedule.tasks.length > 0) {
      const tasksToInsert = schedule.tasks.map((task) => ({
        project_id: project.id,
        title: task.title,
        description: task.description,
        status: 'To Do',
        estimated_days: task.estimated_days,
        assigned_tech: task.assigned_tech,
        assigned_to: null,
      }));
      await supabase.from('tasks').insert(tasksToInsert);
    }

    res.json({ success: true, project_id: project.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/chat', (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'message is required' });
  }

  const idx = Math.floor(Math.random() * CHAT_RESPONSES.length);
  res.json({ response: CHAT_RESPONSES[idx] });
});

export default router;
