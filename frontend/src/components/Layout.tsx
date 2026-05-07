import { Outlet, NavLink, useLocation } from "react-router-dom";
import { Calendar, Users, FolderOpen, Plus } from "lucide-react";
import { Logo } from "./Logo";
import { GridBackground } from "./GridBackground";
import { motion } from "motion/react";
import logoUrl from "../assets/brand/01-logo-no-text-no-background.png";

export function Layout() {
  const location = useLocation();
  const isAIActive = location.pathname.includes("task") || location.pathname.includes("create");

  return (
    <div className="w-full h-full flex flex-col bg-black text-white relative">
      <GridBackground isAIActive={isAIActive} />

      {/* Full-viewport-width header — logo is truly centered */}
      <header className="h-14 shrink-0 border-b border-white/10 bg-black/35 backdrop-blur-sm flex items-center justify-center relative z-30 overflow-visible">
        <img src={logoUrl} alt="01 Manager" className="h-40 w-auto object-contain pointer-events-none" />
      </header>

      <div className="flex-1 flex overflow-hidden relative">
      <aside className="w-64 bg-black/60 border-r border-white/10 flex flex-col relative z-20">
        <div className="px-6 py-6 border-b border-white/10">
          <Logo />
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `relative flex items-center gap-3 px-4 py-2.5 rounded-lg overflow-hidden group ${
                isActive ? "text-white border border-white/10" : "text-gray-400"
              }`
            }
          >
            <motion.div
              className="absolute inset-0 bg-linear-to-r from-purple-900 to-black rounded-lg"
              initial={{ opacity: 0, scale: 0.95 }}
              whileHover={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
            <FolderOpen className="w-4 h-4 relative z-10 group-hover:text-white transition-colors duration-200" />
            <span className="text-sm relative z-10 group-hover:text-white transition-colors duration-200">Projects</span>
          </NavLink>

          <NavLink
            to="/board"
            className={({ isActive }) =>
              `relative flex items-center gap-3 px-4 py-2.5 rounded-lg overflow-hidden group ${
                isActive ? "text-white border border-white/10" : "text-gray-400"
              }`
            }
          >
            <motion.div
              className="absolute inset-0 bg-linear-to-r from-purple-900 to-black rounded-lg"
              initial={{ opacity: 0, scale: 0.95 }}
              whileHover={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
            <Calendar className="w-4 h-4 relative z-10 group-hover:text-white transition-colors duration-200" />
            <span className="text-sm relative z-10 group-hover:text-white transition-colors duration-200">Board</span>
          </NavLink>

          <NavLink
            to="/team"
            className={({ isActive }) =>
              `relative flex items-center gap-3 px-4 py-2.5 rounded-lg overflow-hidden group ${
                isActive ? "text-white border border-white/10" : "text-gray-400"
              }`
            }
          >
            <motion.div
              className="absolute inset-0 bg-linear-to-r from-purple-900 to-black rounded-lg"
              initial={{ opacity: 0, scale: 0.95 }}
              whileHover={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
            <Users className="w-4 h-4 relative z-10 group-hover:text-white transition-colors duration-200" />
            <span className="text-sm relative z-10 group-hover:text-white transition-colors duration-200">Team</span>
          </NavLink>

          <NavLink
            to="/create"
            className={({ isActive }) =>
              `relative flex items-center gap-3 px-4 py-2.5 rounded-lg overflow-hidden group ${
                isActive ? "text-white border border-white/10" : "text-gray-400"
              }`
            }
          >
            <motion.div
              className="absolute inset-0 bg-linear-to-r from-purple-900 to-black rounded-lg"
              initial={{ opacity: 0, scale: 0.95 }}
              whileHover={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
            <Plus className="w-4 h-4 relative z-10 group-hover:text-white transition-colors duration-200" />
            <span className="text-sm relative z-10 group-hover:text-white transition-colors duration-200">Create Project</span>
          </NavLink>
        </nav>
      </aside>

      <div className={`flex-1 flex flex-col relative z-20 ${isAIActive ? "bg-black/78 backdrop-blur-md" : "bg-black/10"}`}>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
      </div>
    </div>
  );
}
