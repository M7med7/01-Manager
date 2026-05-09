import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import type { Schema } from '@google/generative-ai';

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

// Chat is short; schedule streams large JSON so we give it 3 minutes.
const SCHEDULE_TIMEOUT_MS = 3 * 60_000;
const CHAT_TIMEOUT_MS     = 30_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`AI request timed out after ${ms / 1000}s. Try a shorter description or fewer weeks.`)),
        ms,
      )
    ),
  ]);
}

// Declared once; reused across all generateSchedule calls.
const SCHEDULE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    tasks: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id:             { type: SchemaType.STRING },
          title:          { type: SchemaType.STRING },
          description:    { type: SchemaType.STRING },
          priority:       { type: SchemaType.STRING },
          estimated_days: { type: SchemaType.NUMBER },
          assigned_tech:  { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          assigned_to:    { type: SchemaType.STRING },
        },
        required: ['id', 'title', 'description', 'priority', 'estimated_days', 'assigned_tech', 'assigned_to'],
      },
    },
    dependencies: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          task_id:             { type: SchemaType.STRING },
          depends_on_task_id:  { type: SchemaType.STRING },
          dependency_type:     { type: SchemaType.STRING },
        },
        required: ['task_id', 'depends_on_task_id', 'dependency_type'],
      },
    },
    technology_recommendations: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          tech_name: { type: SchemaType.STRING },
          category:  { type: SchemaType.STRING },
          reasoning: { type: SchemaType.STRING },
        },
        required: ['tech_name', 'category', 'reasoning'],
      },
    },
  },
  required: ['tasks', 'dependencies', 'technology_recommendations'],
};

function buildSchedulePrompt(req: ScheduleRequest): string {
  const memberList = req.teamMembers.map((m) => m.user_id).join(', ');
  const totalDays = req.durationWeeks * 7;

  return `Project: ${req.projectName}
Description: ${req.description}
Duration: ${req.durationWeeks} weeks (${totalDays} days)
Team IDs: ${memberList || 'none'}

Rules:
- Cover 100% of the project: every feature, module, integration, test phase, deployment. No grouping of unrelated work.
- Sum of estimated_days ≤ ${totalDays}. Trim Low/Medium task days before dropping any task.
- Distribute assignments evenly. assigned_to="" only when team is empty.
- assigned_tech = task-specific tools only (derived from technology_recommendations).
- Task IDs must be UUID v4. Only reference IDs that exist in tasks[].
- description = one-sentence summary + "\\nSteps:\\n" + 3–6 numbered steps.
- priority: High=critical-path, Medium=standard, Low=nice-to-have.
- For vague descriptions, infer professional defaults.`;
}

export async function generateSchedule(req: ScheduleRequest): Promise<GeneratedSchedule> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('AI generation is not configured: GEMINI_API_KEY is not set on the server.');
  }

  const t0 = Date.now();
  console.log(`[AI] generateSchedule start — model=${modelName} project="${req.projectName}"`);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: 'You are an expert software project planner. Produce complete, realistic execution plans.',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: SCHEDULE_SCHEMA as Schema,
    },
  });

  // Stream so bytes flow continuously — avoids infrastructure idle-timeout cuts
  // on large projects that take 1-3 min to generate.
  const text = await withTimeout(
    (async () => {
      const { stream } = await model.generateContentStream(buildSchedulePrompt(req));
      let out = '';
      for await (const chunk of stream) out += chunk.text();
      return out;
    })(),
    SCHEDULE_TIMEOUT_MS,
  );
  console.log(`[AI] generateSchedule streamed in ${Date.now() - t0}ms`);

  const parsed = JSON.parse(text) as GeneratedSchedule;
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

  const ctx = projectContext ? `Project context: ${projectContext}\n\n` : '';

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: 'You are a helpful software project management assistant. Reply concisely in plain text, no markdown.',
    });
    const result = await withTimeout(model.generateContent(`${ctx}${message}`), CHAT_TIMEOUT_MS);
    console.log(`[AI] generateChatResponse done in ${Date.now() - t0}ms`);
    return result.response.text().trim();
  } catch (err) {
    console.error(`[AI] generateChatResponse failed after ${Date.now() - t0}ms:`, err);
    return 'I had trouble connecting to the AI service. Please try again.';
  }
}
