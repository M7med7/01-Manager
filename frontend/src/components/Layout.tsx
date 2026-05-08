import { useState, useRef, useEffect } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Calendar, Users, FolderOpen, Plus, LogOut } from "lucide-react";
import { Logo } from "./Logo";
import { GridBackground } from "./GridBackground";
import { motion, AnimatePresence } from "motion/react";
import logoUrl from "../assets/brand/01-logo-no-text-no-background.png";
import { useAuth } from "../contexts/AuthContext";

function getInitials(name: string | null | undefined, email: string): string {
  if (name) {
    const parts = name.trim().split(" ");
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, signOut } = useAuth();
  const isAIActive = location.pathname.includes("task") || location.pathname.includes("create");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const email = session?.user.email ?? "";
  const fullName = session?.user.user_metadata?.full_name as string | undefined;
  const initials = getInitials(fullName, email);
  const displayName = fullName ?? email.split("@")[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
    navigate("/login");
  };

  return (
    <div className="w-full h-dvh flex flex-col bg-black text-white relative overflow-hidden">
      <GridBackground isAIActive={isAIActive} />

      {/* Full-viewport-width header */}
      <header className="h-14 shrink-0 border-b border-white/10 bg-black/35 backdrop-blur-sm flex items-center justify-center relative z-30 overflow-visible">
        <img src={logoUrl} alt="01 Manager" className="h-40 w-auto object-contain pointer-events-none" />

        {/* Profile — absolute right so logo stays centered */}
        <div className="absolute right-4 top-0 h-full flex items-center" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2.5 rounded-xl px-3 py-1.5 hover:bg-white/8 transition-colors duration-200"
          >
            <div className="h-8 w-8 rounded-full bg-linear-to-br from-purple-600 to-purple-900 flex items-center justify-center text-xs font-bold text-white shadow-md shadow-purple-500/30 shrink-0">
              {initials}
            </div>
            <span className="hidden sm:block max-w-[120px] truncate text-sm font-medium text-gray-300">
              {displayName}
            </span>
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-white/10 bg-black/90 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden"
              >
                {/* User info */}
                <div className="px-4 py-3 border-b border-white/8">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-linear-to-br from-purple-600 to-purple-900 flex items-center justify-center text-xs font-bold text-white shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                      <p className="truncate text-xs text-gray-500">{email}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-1.5">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors duration-150"
                  >
                    <LogOut className="h-4 w-4 shrink-0" />
                    Sign out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex overflow-hidden relative">
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

      <div className={`flex-1 min-h-0 flex flex-col relative z-20 ${isAIActive ? "bg-black/78 backdrop-blur-md" : "bg-black/10"}`}>
        <main className="flex-1 min-h-0 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      </div>
    </div>
  );
}
