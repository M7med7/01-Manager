import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ScheduleRequest {
  projectId: string;
  projectName: string;
  description: string;
  durationWeeks: number;
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
const GEMINI_TIMEOUT_MS = 80_000;

function withGeminiTimeout<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Gemini timed out after 80s')), GEMINI_TIMEOUT_MS)
    ),
  ]);
}

function buildSchedulePrompt(req: ScheduleRequest): string {
  const memberList = req.teamMembers.map((m) => m.user_id).join(', ');

  const totalDays = req.durationWeeks * 7;

  return `You are a software project planning assistant. Given the project below, produce a realistic execution plan.

Project name: ${req.projectName}
Description: ${req.description}
Team member IDs: ${memberList || 'unassigned'}
Project duration: ${req.durationWeeks} weeks (${totalDays} days total)

Return ONLY a valid JSON object with this exact structure (no markdown, no extra text):
{
  "tasks": [
    {
      "id": "<uuid string>",
      "title": "<task title>",
      "description": "<detailed description including numbered implementation steps, e.g.:\\nDesign and implement the database schema.\\n\\nSteps:\\n1. Identify all entities and relationships\\n2. Create SQL migration files\\n3. Set up tables with RLS policies\\n4. Test with seed data>",
      "priority": "<High|Medium|Low>",
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
- Generate as many tasks as the project genuinely requires to be 100% complete. Cover every feature, module, integration, testing phase, and deployment step. Do not group unrelated work into one task. There is no minimum or maximum task count
- The sum of all estimated_days MUST NOT exceed ${totalDays} days (${req.durationWeeks} weeks)
- Distribute tasks evenly across team members
- Only reference task IDs that exist in the tasks array
- Assign real UUIDs (v4 format) to each task id
- Each task description MUST include a brief summary followed by "Steps:" and 3-6 numbered implementation steps
- Assign priority: "High" for critical-path tasks, "Medium" for standard tasks, "Low" for nice-to-haves`;
}

function buildChatPrompt(message: string, projectContext?: string): string {
  const context = projectContext
    ? `You are an AI assistant helping with a software project. Project context: ${projectContext}\n\n`
    : 'You are a helpful software project management assistant.\n\n';
  return `${context}User message: ${message}\n\nRespond concisely and helpfully in plain text (no markdown).`;
}

export async function generateSchedule(req: ScheduleRequest): Promise<GeneratedSchedule> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('AI generation is not configured: GEMINI_API_KEY is not set on the server.');
  }

  const t0 = Date.now();
  console.log(`[AI] generateSchedule start — model=${modelName} project="${req.projectName}"`);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });
  const result = await withGeminiTimeout(model.generateContent(buildSchedulePrompt(req)));
  console.log(`[AI] generateSchedule Gemini responded in ${Date.now() - t0}ms`);

  const text = result.response.text().trim();
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error('AI returned an invalid response. Please try again.');
  }

  const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as GeneratedSchedule;
  if (!Array.isArray(parsed.tasks) || parsed.tasks.length === 0) {
    throw new Error('AI returned an empty task list. Please try again with a more detailed description.');
  }

  console.log(`[AI] generateSchedule parsed ${parsed.tasks.length} tasks in ${Date.now() - t0}ms total`);
  return parsed;
}

export async function generateChatResponse(message: string, projectContext?: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return 'AI assistant is not configured. Please set GEMINI_API_KEY on the server.';
  }

  const t0 = Date.now();
  console.log('[AI] generateChatResponse start');

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await withGeminiTimeout(model.generateContent(buildChatPrompt(message, projectContext)));
    console.log(`[AI] generateChatResponse done in ${Date.now() - t0}ms`);
    return result.response.text().trim();
  } catch (err) {
    console.error(`[AI] generateChatResponse failed after ${Date.now() - t0}ms:`, err);
    return 'I had trouble connecting to the AI service. Please try again.';
  }
}
