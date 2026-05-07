import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';

export interface ScheduleRequest {
  projectId: string;
  projectName: string;
  description: string;
  teamMembers: Array<{ user_id: string }>;
}

export interface GeneratedSchedule {
  tasks: Array<{
    id: string;
    title: string;
    description: string;
    estimated_days: number;
    assigned_tech: string[];
    assigned_to: string;
  }>;
  dependencies: Array<{
    task_id: string;
    depends_on_task_id: string;
    dependency_type: string;
  }>;
  technology_recommendations: Array<{
    tech_name: string;
    category: string;
    reasoning: string;
  }>;
}

const modelName = process.env.AI_MODEL ?? 'gemini-2.5-flash';

function buildSchedulePrompt(req: ScheduleRequest): string {
  const memberList = req.teamMembers.map((m) => m.user_id).join(', ');

  return `You are a software project planning assistant. Given the project below, produce a realistic execution plan.

Project name: ${req.projectName}
Description: ${req.description}
Team member IDs: ${memberList || 'unassigned'}

Return ONLY a valid JSON object with this exact structure (no markdown, no extra text):
{
  "tasks": [
    {
      "id": "<uuid string>",
      "title": "<task title>",
      "description": "<one sentence>",
      "estimated_days": <number>,
      "assigned_tech": ["<tech1>", "<tech2>"],
      "assigned_to": "<one of the team member IDs above, or empty string>"
    }
  ],
  "dependencies": [
    {
      "task_id": "<id of dependent task>",
      "depends_on_task_id": "<id of prerequisite task>",
      "dependency_type": "Finish-to-Start"
    }
  ],
  "technology_recommendations": [
    {
      "tech_name": "<name>",
      "category": "<Frontend|Backend|Database|DevOps>",
      "reasoning": "<one sentence>"
    }
  ]
}

Rules:
- Generate 4 to 8 tasks covering the full project lifecycle
- Distribute tasks evenly across team members
- Only reference task IDs that exist in the tasks array
- Assign real UUIDs (v4 format) to each task id`;
}

function buildChatPrompt(message: string, projectContext?: string): string {
  const context = projectContext
    ? `You are an AI assistant helping with a software project. Project context: ${projectContext}\n\n`
    : 'You are a helpful software project management assistant.\n\n';
  return `${context}User message: ${message}\n\nRespond concisely and helpfully in plain text (no markdown).`;
}

function fallbackSchedule(req: ScheduleRequest): GeneratedSchedule {
  const teamIds = req.teamMembers.map((m) => m.user_id);
  const user1 = teamIds[0] ?? '';
  const user2 = teamIds[1] ?? user1;

  const t1 = uuidv4();
  const t2 = uuidv4();
  const t3 = uuidv4();
  const t4 = uuidv4();

  return {
    tasks: [
      { id: t1, title: 'Database Schema Design', description: 'Design and implement the initial database schema.', estimated_days: 2, assigned_tech: ['PostgreSQL', 'Supabase'], assigned_to: user1 },
      { id: t2, title: 'API Backend Setup', description: 'Initialize server and create core CRUD endpoints.', estimated_days: 3, assigned_tech: ['Node.js', 'Express', 'TypeScript'], assigned_to: user2 },
      { id: t3, title: 'Frontend Foundation', description: 'Setup React, Vite, and routing.', estimated_days: 2, assigned_tech: ['React', 'TypeScript', 'Tailwind CSS'], assigned_to: user1 },
      { id: t4, title: 'UI Implementation', description: 'Build the main interface screens.', estimated_days: 4, assigned_tech: ['React', 'Tailwind CSS'], assigned_to: user2 },
    ],
    dependencies: [
      { task_id: t2, depends_on_task_id: t1, dependency_type: 'Finish-to-Start' },
      { task_id: t4, depends_on_task_id: t3, dependency_type: 'Finish-to-Start' },
    ],
    technology_recommendations: [
      { tech_name: 'React', category: 'Frontend', reasoning: 'Component-based architecture for interactive UIs.' },
      { tech_name: 'Supabase', category: 'Database', reasoning: 'Managed PostgreSQL with built-in auth and real-time.' },
      { tech_name: 'Tailwind CSS', category: 'Frontend', reasoning: 'Utility-first CSS for rapid UI development.' },
    ],
  };
}

export async function generateSchedule(req: ScheduleRequest): Promise<GeneratedSchedule> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn('GEMINI_API_KEY not set — using fallback schedule');
    return fallbackSchedule(req);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(buildSchedulePrompt(req));
    const text = result.response.text().trim();

    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) throw new Error('No JSON object in Gemini response');

    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as GeneratedSchedule;
    if (!Array.isArray(parsed.tasks) || parsed.tasks.length === 0) throw new Error('Empty tasks array');
    return parsed;
  } catch (err) {
    console.error('Gemini generateSchedule failed, using fallback:', err);
    return fallbackSchedule(req);
  }
}

export async function generateChatResponse(message: string, projectContext?: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return 'AI assistant is not configured. Please set GEMINI_API_KEY on the server.';
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(buildChatPrompt(message, projectContext));
    return result.response.text().trim();
  } catch (err) {
    console.error('Gemini generateChatResponse failed:', err);
    return 'I had trouble connecting to the AI service. Please try again.';
  }
}
