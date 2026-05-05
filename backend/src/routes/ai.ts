import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { generateSchedule } from '../services/aiManager';

const router = Router();

router.post('/generate', async (req, res) => {
  try {
    const { projectId } = req.body;

    // Fetch project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError) throw projectError;

    // Fetch team members
    const { data: assignments, error: teamError } = await supabase
      .from('team_assignments')
      .select('user_id')
      .eq('project_id', projectId);

    if (teamError) throw teamError;

    // Generate schedule
    const schedule = await generateSchedule({
      projectId,
      projectName: project.name,
      description: project.description,
      teamMembers: assignments || []
    });

    // Save tasks and get actual DB IDs mapping
    const taskIdMap = new Map<string, string>(); // Maps temp ID to real DB ID
    
    for (const task of schedule.tasks) {
      const { data: dbTask, error: taskError } = await supabase
        .from('tasks')
        .insert({
          project_id: projectId,
          title: task.title,
          description: task.description,
          estimated_days: task.estimated_days,
          assigned_tech: task.assigned_tech,
          assigned_to: task.assigned_to
        })
        .select()
        .single();
        
      if (taskError) throw taskError;
      taskIdMap.set(task.id, dbTask.id);
    }

    // Save dependencies
    if (schedule.dependencies && schedule.dependencies.length > 0) {
      const dbDependencies = schedule.dependencies.map(dep => ({
        task_id: taskIdMap.get(dep.task_id),
        depends_on_task_id: taskIdMap.get(dep.depends_on_task_id),
        dependency_type: dep.dependency_type
      })).filter(d => d.task_id && d.depends_on_task_id);

      if (dbDependencies.length > 0) {
        const { error: depError } = await supabase
          .from('task_dependencies')
          .insert(dbDependencies);
          
        if (depError) throw depError;
      }
    }

    // Save tech recommendations
    if (schedule.technology_recommendations && schedule.technology_recommendations.length > 0) {
      const dbTech = schedule.technology_recommendations.map(tech => ({
        project_id: projectId,
        tech_name: tech.tech_name,
        category: tech.category,
        reasoning: tech.reasoning
      }));
      
      const { error: techError } = await supabase
        .from('technology_recommendations')
        .insert(dbTech);
        
      if (techError) throw techError;
    }

    // Update project status
    await supabase
      .from('projects')
      .update({ status: 'Active' })
      .eq('id', projectId);

    res.json({ success: true, message: "Schedule generated and saved successfully." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
