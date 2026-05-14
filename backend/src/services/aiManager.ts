import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import type { Schema } from '@google/generative-ai';

export interface ScheduleRequest {
  projectId: string;
  projectName: string;
  description: string;
  durationValue: number;
  durationUnit: 'Weeks' | 'Months' | 'Years';
  teamMembers: Array<{ user_id: string; skills?: string[]; experience_summary?: string }>;
}

export interface GeneratedSchedule {
  project_summary: string;
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
    project_summary: { type: SchemaType.STRING },
  },
  required: ['project_summary', 'tasks', 'dependencies', 'technology_recommendations'],
};

function buildSchedulePrompt(req: ScheduleRequest): string {
  const memberList = req.teamMembers.map((m) => m.user_id).join(', ');
  
  let daysMultiplier = 7;
  if (req.durationUnit === 'Months') daysMultiplier = 30;
  if (req.durationUnit === 'Years') daysMultiplier = 365;
  const totalDays = req.durationValue * daysMultiplier;

  let memberDetails = '';
  if (req.teamMembers.some((m) => m.skills && m.skills.length > 0)) {
    memberDetails =
      '\\nTeam Member Skills:\\n' +
      req.teamMembers
        .map((m) => {
          if (!m.skills || m.skills.length === 0) return '';
          return `- User ID ${m.user_id}: Skills [${m.skills.join(', ')}]. Experience: ${m.experience_summary ?? ''}`;
        })
        .filter(Boolean)
        .join('\\n') +
      '\\n';
  }

  return `Project: ${req.projectName}
Description: ${req.description}
Duration: ${req.durationValue} ${req.durationUnit} (${totalDays} days)
Team IDs: ${memberList || 'none'}
${memberDetails}
Rules:
- Cover 100% of the project: every feature, module, integration, test phase, deployment. No grouping of unrelated work.
- You MUST ensure the project is 100% completed within exactly ${totalDays} days.
- DO NOT OMIT any necessary tasks due to time constraints. If the duration is extremely short, aggressively compress the schedule by reducing individual task estimated_days to fit within the timeframe or by assigning tasks to run in parallel.
- Sum of estimated_days across the critical path MUST be ≤ ${totalDays}.
- Distribute assignments evenly. assigned_to="" only when team is empty.
- You MUST force the assignment of each task to the member whose skills best match that task's required technologies.
- assigned_tech = task-specific tools only (derived from technology_recommendations).
- Task IDs must be UUID v4. Only reference IDs that exist in tasks[].
- description = one-sentence summary + "\\nSteps:\\n" + 3–6 numbered steps.
- priority: High=critical-path, Medium=standard, Low=nice-to-have.
- For vague descriptions, infer professional defaults.
- project_summary: 2-3 sentence professional description of the project written in third-person present tense, suitable to display on the project page.`;
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

export async function extractCVData(text: string): Promise<{ skills: string[]; experience_summary: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('AI generation is not configured: GEMINI_API_KEY is not set.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: 'You are an expert HR parser. Extract the candidate\'s skills and a brief experience summary from their CV.',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          skills: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
          experience_summary: {
            type: SchemaType.STRING,
            description: 'A brief plain-English summary of the candidate\'s experience in 2 to 4 sentences.',
          },
        },
        required: ['skills', 'experience_summary'],
      } as Schema,
    },
  });

  const prompt = `Extract skills and experience summary from the following CV text:\n\n${text}`;
  const response = await withTimeout(model.generateContent(prompt), CHAT_TIMEOUT_MS);
  
  const responseText = response.response.text();
  const parsed = JSON.parse(responseText);
  
  return {
    skills: Array.isArray(parsed.skills) ? parsed.skills : [],
    experience_summary: typeof parsed.experience_summary === 'string' ? parsed.experience_summary : '',
  };
}
