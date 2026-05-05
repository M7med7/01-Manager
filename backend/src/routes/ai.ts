import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { generateSchedule } from '../services/aiManager';

const router = Router();

router.post('/generate', async (req, res) => {
  try {
    const { name, description, duration, headcount } = req.body;

    // Generate schedule
    const schedule = await generateSchedule({
      projectId: 'mock-proj-1',
      projectName: name,
      description: description,
      teamMembers: Array.from({ length: headcount }, (_, i) => ({ user_id: `user${i + 1}` }))
    });

    res.json({ success: true, message: "Schedule generated successfully.", schedule });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
