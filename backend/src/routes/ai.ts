import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';
import { isConnectivityError, withTimeout } from '../lib/timeout';
import { generateSchedule, generateChatResponse, durationToDays } from '../services/aiManager';
import { wouldCreateCycle, type TaskDependencyRow } from '../lib/taskDependencies';
import { resolveTemplate } from './templates';

const router = Router();
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

router.post('/generate', async (req, res) => {
  const t0 = Date.now();
  try {
    const { name, description, headcount, duration, duration_unit, team_members, expand_description, template_id } = req.body;

    if (!name || !description) {
      return res.status(400).json({ error: 'name and description are required' });
    }

    console.log(`[AI] /generate received — name="${name}" duration="${duration} ${duration_unit}"`);

    const projectId = uuidv4();
    const headcountNum = parseInt(headcount) || 1;
    const selectedMembers = Array.isArray(team_members)
      ? team_members.filter((userId: unknown): userId is string => typeof userId === 'string' && userId.length > 0)
      : [];
    const databaseMembers = selectedMembers.filter((userId) => UUID_PATTERN.test(userId));

    let memberDataMap: Record<string, { skills?: string[]; experience_summary?: string }> = {};
    if (databaseMembers.length > 0) {
      try {
        const { data } = await supabase.from('users').select('id, skills, experience_summary').in('id', databaseMembers);
        if (data) {
          for (const user of data) {
            memberDataMap[user.id] = {
              skills: user.skills ?? [],
              experience_summary: user.experience_summary ?? '',
            };
          }
        }
      } catch (err) {
        console.error('[AI] /generate — failed to fetch user skills:', err);
        // proceed without skills
      }
    }

    const scheduleMembers =
      selectedMembers.length > 0
        ? selectedMembers.map((user_id) => ({
            user_id,
            skills: memberDataMap[user_id]?.skills,
            experience_summary: memberDataMap[user_id]?.experience_summary,
          }))
        : Array.from({ length: headcountNum }, (_, i) => ({ user_id: `user${i + 1}` }));

    const durationValue = Math.max(1, parseInt(duration) || 8);
    const validUnits = ['Weeks', 'Months', 'Years'] as const;
    const durationUnit = validUnits.includes(duration_unit as any) ? (duration_unit as typeof validUnits[number]) : 'Weeks';

    const totalDays = durationToDays(durationValue, durationUnit);
    const durationWeeks = Math.max(1, Math.round(totalDays / 7));

    const schedule = await generateSchedule({
      projectId,
      projectName: name,
      description,
      durationValue,
      durationUnit,
      teamMembers: scheduleMembers,
      template: await resolveTemplate(template_id),
    });

    const projectTable = supabase.from('projects') as any;
    const savedDescription = expand_description === false ? description : (schedule.project_summary || description);
    let project = { id: projectId, name, description: savedDescription };

    if (projectTable && typeof projectTable.insert === 'function') {
      const { data, error: projectError } = await withTimeout<{ data: any; error: any }>(
        projectTable
          .insert({ id: projectId, name, description: savedDescription, created_by: null, duration_weeks: durationWeeks })
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

      console.log(`[AI] /generate — AI returned ${schedule.tasks.length} tasks`);

      if (schedule.tasks.length > 0) {
        const taskIdMap = new Map<string, string>();
        const tasksToInsert = schedule.tasks.map((task) => {
          const generatedId = String(task.id || uuidv4());
          const savedId = UUID_PATTERN.test(generatedId) ? generatedId : uuidv4();
          taskIdMap.set(generatedId, savedId);

          return {
            id: savedId,
            project_id: project.id,
            title: task.title,
            description: task.description ?? '',
            status: 'To Do',
            priority: (['High', 'Medium', 'Low'].includes((task as any).priority) ? (task as any).priority : 'Medium'),
            estimated_days: Number(task.estimated_days) || 1,
            assigned_tech: Array.isArray(task.assigned_tech) ? task.assigned_tech : [],
            assigned_to: databaseMembers.includes(task.assigned_to) ? task.assigned_to : null,
          };
        });

        const { error: taskError } = await withTimeout(
          supabase.from('tasks').insert(tasksToInsert),
          10_000,
        );
        if (taskError) {
          console.error('[AI] /generate — task insert failed:', taskError.message);
          throw taskError;
        }
        console.log(`[AI] /generate — inserted ${tasksToInsert.length} tasks`);

        const insertedTaskIds = new Set(tasksToInsert.map((task) => task.id));
        const dependencyRows: TaskDependencyRow[] = [];
        for (const dep of schedule.dependencies ?? []) {
          const taskId = taskIdMap.get(String(dep.task_id)) ?? dep.task_id;
          const dependsOnTaskId = taskIdMap.get(String(dep.depends_on_task_id)) ?? dep.depends_on_task_id;
          if (
            !insertedTaskIds.has(taskId) ||
            !insertedTaskIds.has(dependsOnTaskId) ||
            taskId === dependsOnTaskId
          ) {
            continue;
          }
          if (dependencyRows.some((item) => item.task_id === taskId && item.depends_on_task_id === dependsOnTaskId)) {
            continue;
          }
          if (wouldCreateCycle(taskId, dependsOnTaskId, dependencyRows)) {
            continue;
          }
          dependencyRows.push({
            task_id: taskId,
            depends_on_task_id: dependsOnTaskId,
          });
        }

        if (dependencyRows.length > 0) {
          const { error: dependencyError } = await withTimeout(
            supabase.from('task_dependencies').insert(
              dependencyRows.map((dep) => ({
                ...dep,
                dependency_type: 'Finish-to-Start',
              })),
            ),
            10_000,
          );
          if (dependencyError) throw dependencyError;
          console.log(`[AI] /generate — inserted ${dependencyRows.length} dependencies`);
        }
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
