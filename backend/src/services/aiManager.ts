import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import type { Schema } from '@google/generative-ai';
import { formatTemplateForPrompt, type ProjectTemplate } from '../lib/projectTemplates';

export interface ScheduleRequest {
  projectId: string;
  projectName: string;
  description: string;
  durationValue: number;
  durationUnit: 'Weeks' | 'Months' | 'Years';
  teamMembers: Array<{ user_id: string; skills?: string[]; experience_summary?: string }>;
  template?: ProjectTemplate | null;
  complexity?: 'simple' | 'standard' | 'advanced';
  budget?: number;
  deadlineStrictness?: 'flexible' | 'fixed';
  preferredTech?: string[];
  excludedTech?: string[];
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
    acceptance_criteria: string[];
    definition_of_done: string[];
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
          acceptance_criteria: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          definition_of_done:  { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        },
        required: ['id', 'title', 'description', 'priority', 'estimated_days', 'assigned_tech', 'assigned_to', 'acceptance_criteria', 'definition_of_done'],
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

export function durationToDays(value: number, unit: 'Weeks' | 'Months' | 'Years'): number {
  if (unit === 'Months') return value * 30;
  if (unit === 'Years') return value * 365;
  return value * 7;
}

function buildSchedulePrompt(req: ScheduleRequest): string {
  const memberList = req.teamMembers.map((m) => m.user_id).join(', ');
  const totalDays = durationToDays(req.durationValue, req.durationUnit);

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

  const complexityLine = req.complexity
    ? `Complexity: ${req.complexity === 'simple' ? 'Simple — keep scope minimal, avoid over-engineering, use straightforward solutions' : req.complexity === 'advanced' ? 'Advanced — enterprise-grade, ensure comprehensive coverage, consider scalability and security' : 'Standard — balanced scope and depth'}`
    : '';
  const budgetLine = req.budget !== undefined && req.budget > 0
    ? `Budget: $${req.budget} — factor in cost-effective technology choices and resource allocation`
    : '';
  const deadlineLine = req.deadlineStrictness === 'fixed'
    ? 'Deadline: FIXED and non-negotiable — prioritize critical path aggressively; reduce scope before extending timeline'
    : req.deadlineStrictness === 'flexible'
    ? 'Deadline: Flexible — quality and completeness take priority over hitting the exact date'
    : '';
  const preferredTechLine = req.preferredTech && req.preferredTech.length > 0
    ? `Preferred technologies: ${req.preferredTech.join(', ')} — use these when appropriate`
    : '';
  const excludedTechLine = req.excludedTech && req.excludedTech.length > 0
    ? `Excluded technologies: ${req.excludedTech.join(', ')} — DO NOT recommend or use these`
    : '';
  const extraConstraints = [complexityLine, budgetLine, deadlineLine, preferredTechLine, excludedTechLine]
    .filter(Boolean).join('\n');

  return `Project: ${req.projectName}
Description: ${req.description}
Duration: ${req.durationValue} ${req.durationUnit} (${totalDays} days)
Team IDs: ${memberList || 'none'}
${memberDetails}
${extraConstraints ? `${extraConstraints}\n` : ''}${formatTemplateForPrompt(req.template)}
Rules:
- Cover 100% of the project: every feature, module, integration, test phase, deployment. No grouping of unrelated work.
- You MUST ensure the project is 100% completed within exactly ${totalDays} days.
- DO NOT OMIT any necessary tasks due to time constraints. If the duration is extremely short, aggressively compress the schedule by reducing individual task estimated_days to fit within the timeframe or by assigning tasks to run in parallel.
- Sum of estimated_days across the critical path MUST be ≤ ${totalDays}.
- Distribute assignments evenly. assigned_to="" only when team is empty.
- You MUST force the assignment of each task to the member whose skills best match that task's required technologies.
- assigned_tech = task-specific tools only (derived from technology_recommendations).
- Task IDs must be UUID v4. Only reference IDs that exist in tasks[].
- Create dependencies when one task clearly needs another task first, especially setup before feature work, backend/API before frontend integration, schema before services, implementation before testing, and deployment after validation.
- dependencies[] must use only generated task IDs, avoid circular dependencies, and use dependency_type="Finish-to-Start".
- description = one-sentence summary + "\\nSteps:\\n" + 3–6 numbered steps.
- acceptance_criteria = 3–5 specific, testable checkbox-style outcomes for this task. Avoid generic wording.
- definition_of_done = 2–4 practical completion checks for quality, review, tests, integration, or documentation where relevant.
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

export async function generateImprovedSchedule(
  req: ScheduleRequest,
  currentSchedule: GeneratedSchedule,
  issueSummary: string,
): Promise<GeneratedSchedule> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('AI generation is not configured: GEMINI_API_KEY is not set on the server.');
  }

  const t0 = Date.now();
  console.log(`[AI] generateImprovedSchedule start — project="${req.projectName}"`);

  const currentTaskList = currentSchedule.tasks
    .map((t) => `  - [${(t as any).priority ?? 'Medium'}] ${t.title} (${t.estimated_days}d)`)
    .join('\n');

  const improvementPrompt =
    buildSchedulePrompt(req) +
    `\n\nCURRENT PLAN (improve this — do not just copy it):\n${currentTaskList}\n` +
    `\nDETECTED QUALITY ISSUES — you MUST fix every one of these:\n${issueSummary}\n` +
    `\nGenerate a new, improved plan that addresses all issues above while keeping the same project scope.`;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: 'You are an expert software project planner. Produce complete, realistic execution plans.',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: SCHEDULE_SCHEMA as Schema,
    },
  });

  const text = await withTimeout(
    (async () => {
      const { stream } = await model.generateContentStream(improvementPrompt);
      let out = '';
      for await (const chunk of stream) out += chunk.text();
      return out;
    })(),
    SCHEDULE_TIMEOUT_MS,
  );
  console.log(`[AI] generateImprovedSchedule streamed in ${Date.now() - t0}ms`);

  const parsed = JSON.parse(text) as GeneratedSchedule;
  if (!Array.isArray(parsed.tasks) || parsed.tasks.length === 0) {
    throw new Error('AI returned an empty task list. Please try again.');
  }

  console.log(`[AI] generateImprovedSchedule parsed ${parsed.tasks.length} tasks in ${Date.now() - t0}ms total`);
  return parsed;
}

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface RefinementOutput {
  schedule: GeneratedSchedule;
  refinementSummary: string;
}

function summariseRefinement(
  before: GeneratedSchedule,
  after: GeneratedSchedule,
  userMessage: string,
): string {
  const beforeIds = new Set(before.tasks.map((t) => t.id));
  const afterIds  = new Set(after.tasks.map((t) => t.id));

  const added    = after.tasks.filter((t) => !beforeIds.has(t.id)).length;
  const removed  = before.tasks.filter((t) => !afterIds.has(t.id)).length;
  const modified = after.tasks.filter((t) => {
    if (!beforeIds.has(t.id)) return false;
    const prev = before.tasks.find((b) => b.id === t.id);
    return prev && JSON.stringify(t) !== JSON.stringify(prev);
  }).length;

  const parts: string[] = [];
  if (added > 0)    parts.push(`added ${added} task${added !== 1 ? 's' : ''}`);
  if (modified > 0) parts.push(`updated ${modified} task${modified !== 1 ? 's' : ''}`);
  if (removed > 0)  parts.push(`removed ${removed} task${removed !== 1 ? 's' : ''}`);

  if (parts.length === 0) return `Applied: "${userMessage}" — no tasks changed.`;
  return `Applied "${userMessage}" — ${parts.join(', ')}.`;
}

export async function generateRefinedSchedule(
  req: ScheduleRequest,
  currentSchedule: GeneratedSchedule,
  userMessage: string,
  conversationHistory: ConversationTurn[],
  memberNames: Array<{ user_id: string; full_name: string }>,
): Promise<RefinementOutput> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('AI generation is not configured: GEMINI_API_KEY is not set on the server.');
  }

  const t0 = Date.now();
  console.log(`[AI] generateRefinedSchedule start — "${userMessage.slice(0, 60)}"`);

  // Compact plan JSON keeps IDs visible for precise diffing
  const currentPlanJson = JSON.stringify(
    {
      tasks: currentSchedule.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        estimated_days: t.estimated_days,
        assigned_to: t.assigned_to,
        assigned_tech: t.assigned_tech,
        priority: (t as any).priority ?? 'Medium',
        acceptance_criteria: t.acceptance_criteria,
        definition_of_done: t.definition_of_done,
      })),
      dependencies: currentSchedule.dependencies,
      technology_recommendations: currentSchedule.technology_recommendations,
    },
    null,
    2,
  );

  const memberNameBlock =
    memberNames.length > 0
      ? '\nTEAM MEMBER NAMES (use these when reassigning tasks):\n' +
        memberNames.map((m) => `  ${m.full_name} → user_id: "${m.user_id}"`).join('\n') + '\n'
      : '';

  const historyBlock =
    conversationHistory.length > 0
      ? '\nCONVERSATION HISTORY:\n' +
        conversationHistory
          .map((t) => `${t.role === 'user' ? 'User' : 'AI'}: ${t.content}`)
          .join('\n') +
        '\n'
      : '';

  const refinementPrompt =
    buildSchedulePrompt(req) +
    `\n\n${memberNameBlock}` +
    `\nCURRENT PLAN (JSON — modify based on the user request, preserve IDs for unchanged tasks):\n\`\`\`json\n${currentPlanJson}\n\`\`\`` +
    historyBlock +
    `\n\nUSER'S REFINEMENT REQUEST:\n"${userMessage}"` +
    `\n\nCRITICAL RULES FOR REFINEMENT:` +
    `\n- Only change tasks directly affected by the request.` +
    `\n- Keep the EXACT same UUID for every task you leave unchanged or modify. This is mandatory for change tracking.` +
    `\n- For NEW tasks you add, generate a fresh UUID v4.` +
    `\n- For tasks you REMOVE, simply omit them from the output.` +
    `\n- Keep acceptance_criteria and definition_of_done specific and testable. Improve vague criteria when the request asks for clearer task quality.` +
    `\n- For tasks you REMOVE, simply omit them from the output.` +
    `\n- Return the COMPLETE plan (all tasks, including unchanged ones) — not just the diff.` +
    `\n- If the user mentions a person by name, look up their user_id in the team member list above.`;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction:
      'You are an expert software project planner. Modify project plans precisely based on user requests, preserving task IDs for unchanged tasks.',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: SCHEDULE_SCHEMA as Schema,
    },
  });

  const text = await withTimeout(
    (async () => {
      const { stream } = await model.generateContentStream(refinementPrompt);
      let out = '';
      for await (const chunk of stream) out += chunk.text();
      return out;
    })(),
    SCHEDULE_TIMEOUT_MS,
  );

  console.log(`[AI] generateRefinedSchedule streamed in ${Date.now() - t0}ms`);

  const parsed = JSON.parse(text) as GeneratedSchedule;
  if (!Array.isArray(parsed.tasks) || parsed.tasks.length === 0) {
    throw new Error('AI returned an empty task list. Please try again.');
  }

  const refinementSummary = summariseRefinement(currentSchedule, parsed, userMessage);
  console.log(`[AI] generateRefinedSchedule done ${parsed.tasks.length} tasks in ${Date.now() - t0}ms — ${refinementSummary}`);

  return { schedule: parsed, refinementSummary };
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
      systemInstruction: [
        'You are the task AI assistant inside 01 Manager.',
        'Use the provided task, project, team, dependency, comment, activity, file, schedule, acceptance criteria, and risk context.',
        'Help the user execute the task: explain the work, break it into subtasks, suggest risks and blockers, explain why it matters, draft progress updates, and improve acceptance criteria.',
        'Give code-level guidance when useful, but do not pretend to write the whole implementation or replace the developer’s judgment.',
        'Ask for clarification only when the missing detail blocks a useful answer.',
        'Avoid generic advice. Keep answers concise, practical, and specific. Plain text only, no markdown.',
      ].join(' '),
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
