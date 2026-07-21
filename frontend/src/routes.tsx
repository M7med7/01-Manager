import { createBrowserRouter, Navigate } from "react-router-dom";

export const router = createBrowserRouter([
  { path: "/login", lazy: async () => ({ Component: (await import("./pages/LoginPage")).LoginPage }) },
  { path: "/signup", lazy: async () => ({ Component: (await import("./pages/SignupPage")).SignupPage }) },
  { path: "/forgot-password", lazy: async () => ({ Component: (await import("./pages/ForgotPasswordPage")).ForgotPasswordPage }) },
  { path: "/reset-password", lazy: async () => ({ Component: (await import("./pages/ResetPasswordPage")).ResetPasswordPage }) },
  { path: "/set-password", lazy: async () => ({ Component: (await import("./pages/SetPasswordPage")).SetPasswordPage }) },
  { path: "/calendar/callback", lazy: async () => ({ Component: (await import("./pages/CalendarCallback")).CalendarCallback }) },
  { path: "/client/:token", lazy: async () => ({ Component: (await import("./pages/ClientProjectView")).ClientProjectView }) },
  {
    path: "/",
    lazy: async () => ({ Component: (await import("./components/ProtectedRoute")).ProtectedRoute }),
    children: [
      {
        lazy: async () => ({ Component: (await import("./components/Layout")).Layout }),
        children: [
          { index: true, lazy: async () => ({ Component: (await import("./pages/ProjectsDashboard")).ProjectsDashboard }) },
          { path: "search", lazy: async () => ({ Component: (await import("./pages/AdvancedSearch")).AdvancedSearch }) },
          { path: "roadmap", lazy: async () => ({ Component: (await import("./pages/PortfolioRoadmap")).PortfolioRoadmap }) },
          { path: "board", lazy: async () => ({ Component: (await import("./pages/BoardCalendar")).BoardCalendar }) },
          { path: "task/:taskId", lazy: async () => ({ Component: (await import("./pages/TaskDetails")).TaskDetails }) },
          { path: "team", lazy: async () => ({ Component: (await import("./pages/TeamCapacity")).TeamCapacity }) },
          { path: "create", lazy: async () => ({ Component: (await import("./pages/CreateProject")).CreateProject }) },
          { path: "profile", lazy: async () => ({ Component: (await import("./pages/Profile")).Profile }) },
          { path: "migrate", lazy: async () => ({ Component: (await import("./pages/MigrationPage")).MigrationPage }) },
          { path: "project/:projectId/health", lazy: async () => ({ Component: (await import("./pages/ProjectHealthDashboard")).ProjectHealthDashboard }) },
          { path: "project/:projectId/report", lazy: async () => ({ Component: (await import("./pages/WeeklyReportPage")).WeeklyReportPage }) },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
