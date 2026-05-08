import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

// Wake the Render backend immediately so it's ready by the time the user
// finishes authenticating and loads real data. Fire-and-forget, no error handling.
fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:5001'}/health`).catch(() => {});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
