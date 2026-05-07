import { createBrowserRouter, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ProjectsDashboard } from "./pages/ProjectsDashboard";
import { BoardCalendar } from "./pages/BoardCalendar";
import { TaskDetails } from "./pages/TaskDetails";
import { TeamCapacity } from "./pages/TeamCapacity";
import { CreateProject } from "./pages/CreateProject";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";

export const router = createBrowserRouter([
  { path: "/login", Component: LoginPage },
  { path: "/signup", Component: SignupPage },
  {
    path: "/",
    Component: ProtectedRoute,
    children: [
      {
        Component: Layout,
        children: [
          { index: true, Component: ProjectsDashboard },
          { path: "board", Component: BoardCalendar },
          { path: "task/:taskId", Component: TaskDetails },
          { path: "team", Component: TeamCapacity },
          { path: "create", Component: CreateProject },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
