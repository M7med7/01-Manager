import { getTeamCapacity } from './capacity';
import { v4 as uuidv4 } from 'uuid';

export interface ScheduleRequest {
  projectId: string;
  projectName: string;
  description: string;
  teamMembers: any[]; // Array of user objects
}

export interface GeneratedSchedule {
  tasks: Array<{
    id: string; // temp id for dependency linking
    title: string;
    description: string;
    estimated_days: number;
    assigned_tech: string[];
    assigned_to: string; // user id
  }>;
  dependencies: Array<{
    task_id: string; // temp id
    depends_on_task_id: string; // temp id
    dependency_type: string;
  }>;
  technology_recommendations: Array<{
    tech_name: string;
    category: string;
    reasoning: string;
  }>;
}

export async function generateSchedule(req: ScheduleRequest): Promise<GeneratedSchedule> {
  const useMock = process.env.USE_MOCK_AI === 'true' || true; // Defaulting to true as per user request

  if (useMock) {
    return generateMockSchedule(req);
  }

  // TODO: Implement actual Ollama SDK integration here
  throw new Error("Ollama integration not yet implemented. Please use USE_MOCK_AI=true");
}

async function generateMockSchedule(req: ScheduleRequest): Promise<GeneratedSchedule> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  const teamIds = req.teamMembers.map(m => m.user_id);
  const user1 = teamIds.length > 0 ? teamIds[0] : null;
  const user2 = teamIds.length > 1 ? teamIds[1] : user1;

  const t1Id = uuidv4();
  const t2Id = uuidv4();
  const t3Id = uuidv4();
  const t4Id = uuidv4();

  return {
    tasks: [
      {
        id: t1Id,
        title: "Database Schema Design",
        description: "Design and implement the initial Supabase schema.",
        estimated_days: 2,
        assigned_tech: ["PostgreSQL", "Supabase"],
        assigned_to: user1
      },
      {
        id: t2Id,
        title: "API Backend Setup",
        description: "Initialize Express server and create core CRUD endpoints.",
        estimated_days: 3,
        assigned_tech: ["Node.js", "Express", "TypeScript"],
        assigned_to: user2
      },
      {
        id: t3Id,
        title: "Frontend Foundation",
        description: "Setup React, Vite, and Tailwind CSS along with routing.",
        estimated_days: 2,
        assigned_tech: ["React", "Tailwind CSS", "Vite"],
        assigned_to: user1
      },
      {
        id: t4Id,
        title: "UI Implementation (Board)",
        description: "Implement the draggable card board interface.",
        estimated_days: 4,
        assigned_tech: ["React", "@hello-pangea/dnd"],
        assigned_to: user2
      }
    ],
    dependencies: [
      {
        task_id: t2Id,
        depends_on_task_id: t1Id,
        dependency_type: "Finish-to-Start"
      },
      {
        task_id: t4Id,
        depends_on_task_id: t3Id,
        dependency_type: "Finish-to-Start"
      }
    ],
    technology_recommendations: [
      {
        tech_name: "React",
        category: "Frontend",
        reasoning: "Excellent component-based architecture for building interactive UI."
      },
      {
        tech_name: "Supabase",
        category: "Database",
        reasoning: "Provides robust PostgreSQL database and real-time subscriptions out of the box."
      },
      {
        tech_name: "Tailwind CSS",
        category: "Frontend",
        reasoning: "Rapid UI development with utility-first classes matching Planner aesthetics."
      }
    ]
  };
}
