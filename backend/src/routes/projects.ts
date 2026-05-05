import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { name, description, created_by, team_members } = req.body;
    
    // Create Project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({ name, description, created_by })
      .select()
      .single();

    if (projectError) throw projectError;

    // Add team assignments
    if (team_members && team_members.length > 0) {
      const assignments = team_members.map((user_id: string) => ({
        project_id: project.id,
        user_id,
        role: 'Member'
      }));
      
      const { error: teamError } = await supabase
        .from('team_assignments')
        .insert(assignments);
        
      if (teamError) throw teamError;
    }

    res.json({ project });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*');
      
    if (error) throw error;
    res.json({ projects });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
