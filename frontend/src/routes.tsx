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
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { SetPasswordPage } from "./pages/SetPasswordPage";
import { Profile } from "./pages/Profile";

export const router = createBrowserRouter([
  { path: "/login", Component: LoginPage },
  { path: "/signup", Component: SignupPage },
  { path: "/forgot-password", Component: ForgotPasswordPage },
  { path: "/reset-password", Component: ResetPasswordPage },
  { path: "/set-password", Component: SetPasswordPage },
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
          { path: "profile", Component: Profile },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
