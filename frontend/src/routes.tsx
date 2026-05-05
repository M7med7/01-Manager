import { createBrowserRouter } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProjectsDashboard } from "./pages/ProjectsDashboard";
import { BoardCalendar } from "./pages/BoardCalendar";
import { TaskDetails } from "./pages/TaskDetails";
import { TeamCapacity } from "./pages/TeamCapacity";
import { CreateProject } from "./pages/CreateProject";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: ProjectsDashboard },
      { path: "board", Component: BoardCalendar },
      { path: "task/:taskId", Component: TaskDetails },
      { path: "team", Component: TeamCapacity },
      { path: "create", Component: CreateProject },
    ],
  },
]);
