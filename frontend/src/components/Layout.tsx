import { useState, useRef, useEffect } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Calendar, Users, FolderOpen, Plus, LogOut, Pencil, X, Check } from "lucide-react";
import { Logo } from "./Logo";
import { GridBackground } from "./GridBackground";
import { motion, AnimatePresence } from "motion/react";
import logoUrl from "../assets/brand/01-logo-no-text-no-background.png";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { api } from "../lib/api";

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
  const [editingProfile, setEditingProfile] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const email = session?.user.email ?? "";
  const fullName = session?.user.user_metadata?.full_name as string | undefined;
  const initials = getInitials(fullName, email);
  const displayName = fullName ?? email.split("@")[0];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setEditingProfile(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const openEdit = () => {
    setNameInput(fullName ?? "");
    setPhoneInput(
      session?.user.id
        ? (localStorage.getItem(`phone_${session.user.id}`) ?? "")
        : ""
    );
    setSaveError(null);
    setEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    if (!session?.user.id) return;
    setSaving(true);
    setSaveError(null);
    try {
      await api.users.update(session.user.id, { full_name: nameInput.trim() });
      await supabase.auth.updateUser({ data: { full_name: nameInput.trim() } });
      if (phoneInput.trim()) {
        localStorage.setItem(`phone_${session.user.id}`, phoneInput.trim());
      } else {
        localStorage.removeItem(`phone_${session.user.id}`);
      }
      window.dispatchEvent(new CustomEvent('userProfileUpdated'));
      setEditingProfile(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

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
                className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-white/10 bg-black/90 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden"
              >
                {/* User info */}
                <div className="px-4 py-3 border-b border-white/8">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-linear-to-br from-purple-600 to-purple-900 flex items-center justify-center text-xs font-bold text-white shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                      <p className="truncate text-xs text-gray-500">{email}</p>
                    </div>
                    {!editingProfile && (
                      <button
                        onClick={openEdit}
                        className="shrink-0 p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                        title="Edit profile"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline profile edit form */}
                <AnimatePresence>
                  {editingProfile && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden border-b border-white/8"
                    >
                      <div className="px-4 py-3 space-y-2.5">
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wide">Name</label>
                          <input
                            value={nameInput}
                            onChange={(e) => setNameInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSaveProfile()}
                            placeholder="Your full name"
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/60 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wide">Phone</label>
                          <input
                            value={phoneInput}
                            onChange={(e) => setPhoneInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSaveProfile()}
                            placeholder="+966 5x xxx xxxx"
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/60 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wide">Email</label>
                          <p className="px-3 py-2 bg-white/3 border border-white/5 rounded-lg text-sm text-gray-500 truncate">{email}</p>
                        </div>
                        {saveError && <p className="text-xs text-red-400">{saveError}</p>}
                        <div className="flex gap-2 pt-0.5">
                          <button
                            onClick={() => setEditingProfile(false)}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-white/10 text-xs text-gray-400 hover:text-white hover:border-white/20 transition-colors"
                          >
                            <X className="h-3 w-3" /> Cancel
                          </button>
                          <button
                            onClick={handleSaveProfile}
                            disabled={saving}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs text-white font-semibold transition-colors disabled:opacity-50"
                          >
                            {saving ? (
                              <div className="h-3 w-3 border border-white/50 border-t-white rounded-full animate-spin" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                            Save
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

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
