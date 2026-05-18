import { useState, useRef, useEffect, useCallback } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Calendar, Users, FolderOpen, Plus, LogOut, Pencil, X, Check, Bell, Settings, ArrowLeftRight, Map, Search, Menu } from "lucide-react";
import { Logo } from "./Logo";
import { GridBackground } from "./GridBackground";
import { motion, AnimatePresence } from "motion/react";
import logoUrl from "../assets/brand/01-logo-no-text-no-background.png";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { api, type AppNotification, type NotificationPreferences } from "../lib/api";

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [showPreferences, setShowPreferences] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  const email = session?.user.email ?? "";
  const fullName = session?.user.user_metadata?.full_name as string | undefined;
  const initials = getInitials(fullName, email);
  const displayName = fullName ?? email.split("@")[0];
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) return;
    api.users.getProfile(userId).then(({ profile }) => setAvatarUrl(profile.avatar_url)).catch(() => { });
  }, [session?.user.id]);

  const refreshNotifications = useCallback(() => {
    const userId = session?.user.id;
    if (!userId) return;
    api.notifications.list(userId)
      .then((data) => {
        setNotifications(data.notifications);
        setUnreadCount(data.unread_count);
        setPreferences(data.preferences);
      })
      .catch(() => { });
  }, [session?.user.id]);

  useEffect(() => {
    refreshNotifications();
    const timer = window.setInterval(refreshNotifications, 60_000);
    return () => window.clearInterval(timer);
  }, [refreshNotifications]);

  useEffect(() => {
    const refresh = () => {
      const userId = session?.user.id;
      if (!userId) return;
      api.users.getProfile(userId).then(({ profile }) => setAvatarUrl(profile.avatar_url)).catch(() => { });
    };
    window.addEventListener('userProfileUpdated', refresh);
    return () => window.removeEventListener('userProfileUpdated', refresh);
  }, [session?.user.id]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setEditingProfile(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
        setShowPreferences(false);
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
      await api.users.update(session.user.id, { full_name: nameInput.trim(), phone: phoneInput.trim() });
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

  const openNotification = async (item: AppNotification) => {
    if (!item.read_at) {
      await api.notifications.markRead(item.id, true).catch(() => { });
      setNotifications((current) => current.map((n) => n.id === item.id ? { ...n, read_at: new Date().toISOString() } : n));
      setUnreadCount((count) => Math.max(0, count - 1));
    }
    setNotificationsOpen(false);
    navigate(item.link_path ?? (item.project_id ? `/task/${item.project_id}` : "/"));
  };

  const markAllRead = async () => {
    if (!session?.user.id) return;
    await api.notifications.markAllRead(session.user.id);
    setNotifications((current) => current.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    setUnreadCount(0);
  };

  const toggleRead = async (item: AppNotification, read: boolean) => {
    await api.notifications.markRead(item.id, read);
    setNotifications((current) => current.map((n) => n.id === item.id ? { ...n, read_at: read ? new Date().toISOString() : null } : n));
    setUnreadCount((count) => Math.max(0, count + (read ? -1 : 1)));
  };

  const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!session?.user.id || !preferences) return;
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    const { preferences: saved } = await api.notifications.updatePreferences(session.user.id, { [key]: value });
    setPreferences(saved);
  };

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  const submitGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = globalSearch.trim();
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
    setGlobalSearch("");
  };

  return (
    <div className="w-full h-dvh flex flex-col bg-black text-white relative overflow-hidden">
      <GridBackground isAIActive={isAIActive} />

      {/* Full-viewport-width header */}
      <header className="h-14 shrink-0 border-b border-white/10 bg-black/35 backdrop-blur-sm flex items-center justify-center relative z-30 overflow-visible">
        <img src={logoUrl} alt="01 Manager" className="h-40 w-auto object-contain pointer-events-none" />

        {/* Hamburger — mobile only, opens sidebar drawer */}
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          className="absolute left-4 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-black/25 text-gray-300 hover:bg-white/8 hover:text-white transition-colors md:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </button>

        <form onSubmit={submitGlobalSearch} className="absolute left-4 top-1/2 hidden w-[320px] -translate-y-1/2 md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            placeholder="Search projects, tasks, files..."
            className="w-full rounded-xl border border-white/10 bg-black/35 py-2 pl-9 pr-3 text-sm text-white outline-none placeholder-gray-600 transition-colors focus:border-purple-500/50"
          />
        </form>

        {/* Profile — absolute right so logo stays centered */}
        <div className="absolute right-4 top-0 h-full flex items-center gap-2">
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => {
                setNotificationsOpen((v) => !v);
                setMenuOpen(false);
                refreshNotifications();
              }}
              className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-black/25 text-gray-300 hover:bg-white/8 hover:text-white transition-colors"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {notificationsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  className="absolute right-0 top-full mt-2 w-[min(24rem,calc(100vw-1rem))] overflow-hidden rounded-2xl border border-white/10 bg-black/95 shadow-2xl shadow-black/50 backdrop-blur-xl"
                >
                  <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                    <div>
                      <div className="text-sm font-semibold text-white">Notifications</div>
                      <div className="text-xs text-gray-500">{unreadCount} unread</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={markAllRead} className="text-xs text-purple-300 hover:text-white">Mark all read</button>
                      <button onClick={() => setShowPreferences((v) => !v)} className="rounded-lg p-1.5 text-gray-500 hover:bg-white/10 hover:text-white">
                        <Settings className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {showPreferences && preferences && (
                    <div className="border-b border-white/10 px-4 py-3">
                      <div className="mb-2 text-xs font-semibold text-gray-400">Preferences</div>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(preferences).map(([key, value]) => (
                          <label key={key} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-gray-300">
                            <input
                              type="checkbox"
                              checked={Boolean(value)}
                              onChange={(e) => updatePreference(key as keyof NotificationPreferences, e.target.checked)}
                              className="accent-purple-500"
                            />
                            {key.replace("_", " ")}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="max-h-[420px] overflow-y-auto p-2">
                    {notifications.length === 0 ? (
                      <div className="py-10 text-center text-sm text-gray-500">No notifications yet</div>
                    ) : (
                      notifications.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => openNotification(item)}
                          className={`mb-1 w-full rounded-xl border px-3 py-3 text-left transition-colors ${item.read_at ? "border-white/5 bg-white/2 text-gray-400" : "border-purple-500/30 bg-purple-900/20 text-white"}`}
                        >
                          <div className="flex items-start gap-2">
                            {!item.read_at && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-purple-400" />}
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium">{item.message}</div>
                              <div className="mt-1 flex items-center gap-2 text-[10px] text-gray-500">
                                <span>{item.notification_type.replace("_", " ")}</span>
                                <span>{new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                              </div>
                            </div>
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRead(item, !item.read_at);
                              }}
                              className="shrink-0 rounded-md border border-white/10 px-2 py-1 text-[10px] text-gray-400 hover:border-purple-500/40 hover:text-white"
                            >
                              {item.read_at ? "Unread" : "Read"}
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="h-full flex items-center" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-1.5 hover:bg-white/8 transition-colors duration-200"
            >
              <div className="h-8 w-8 rounded-full bg-linear-to-br from-purple-600 to-purple-900 flex items-center justify-center text-xs font-bold text-white shadow-md shadow-purple-500/30 shrink-0 overflow-hidden">
                {avatarUrl ? <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" /> : initials}
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
                      <div className="h-9 w-9 rounded-full bg-linear-to-br from-purple-600 to-purple-900 flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden">
                        {avatarUrl ? <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" /> : initials}
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
                  <div className="p-1.5 flex flex-col">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        navigate("/profile");
                      }}
                      className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors duration-150"
                    >
                      <Users className="h-4 w-4 shrink-0" />
                      View profile
                    </button>
                    <div className="h-px w-full bg-white/10 my-1"></div>
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
        </div>
      </header>

      <div className="flex-1 min-h-0 flex overflow-hidden relative">
        {/* Mobile backdrop — closes sidebar when tapped */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar — static on desktop, slide-in drawer on mobile */}
        <aside className={`
          fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-black/95 backdrop-blur-xl border-r border-white/10
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:relative md:translate-x-0 md:bg-black/60 md:backdrop-blur-none md:z-20
        `}>
          <div className="px-6 py-6 border-b border-white/10 flex items-center justify-between">
            <Logo />
            <button
              onClick={() => setSidebarOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors md:hidden"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `relative flex items-center gap-3 px-4 py-2.5 rounded-lg overflow-hidden group ${isActive ? "text-white border border-white/10" : "text-gray-400"
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
            to="/search"
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
            <Search className="w-4 h-4 relative z-10 group-hover:text-white transition-colors duration-200" />
            <span className="text-sm relative z-10 group-hover:text-white transition-colors duration-200">Search</span>
          </NavLink>

          <NavLink
            to="/roadmap"
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
            <Map className="w-4 h-4 relative z-10 group-hover:text-white transition-colors duration-200" />
            <span className="text-sm relative z-10 group-hover:text-white transition-colors duration-200">Roadmap</span>
          </NavLink>

          <NavLink
            to="/board"
            className={({ isActive }) =>
                `relative flex items-center gap-3 px-4 py-2.5 rounded-lg overflow-hidden group ${isActive ? "text-white border border-white/10" : "text-gray-400"
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
                `relative flex items-center gap-3 px-4 py-2.5 rounded-lg overflow-hidden group ${isActive ? "text-white border border-white/10" : "text-gray-400"
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
                `relative flex items-center gap-3 px-4 py-2.5 rounded-lg overflow-hidden group ${isActive ? "text-white border border-white/10" : "text-gray-400"
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

            <NavLink
              to="/migrate"
              className={({ isActive }) =>
                `relative flex items-center gap-3 px-4 py-2.5 rounded-lg overflow-hidden group ${isActive ? "text-white border border-white/10" : "text-gray-400"
                }`
              }
            >
              <motion.div
                className="absolute inset-0 bg-linear-to-r from-purple-900 to-black rounded-lg"
                initial={{ opacity: 0, scale: 0.95 }}
                whileHover={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
              <ArrowLeftRight className="w-4 h-4 relative z-10 group-hover:text-white transition-colors duration-200" />
              <span className="text-sm relative z-10 group-hover:text-white transition-colors duration-200">Migration</span>
            </NavLink>
          </nav>
        </aside>

        <div className={`flex-1 min-h-0 flex flex-col relative z-20 ${isAIActive ? "bg-black/45 backdrop-blur-sm" : "bg-black/10"}`}>
          <main className="flex-1 min-h-0 overflow-y-auto pb-16 md:pb-0">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Bottom navigation — mobile only */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden border-t border-white/10 bg-black/90 backdrop-blur-xl">
        <div className="flex items-center justify-around h-16 px-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${isActive ? "text-white" : "text-gray-500"}`
            }
          >
            <FolderOpen className="h-5 w-5" />
            <span className="text-[10px]">Projects</span>
          </NavLink>

          <NavLink
            to="/board"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${isActive ? "text-white" : "text-gray-500"}`
            }
          >
            <Calendar className="h-5 w-5" />
            <span className="text-[10px]">Board</span>
          </NavLink>

          {/* Centre action — Create */}
          <NavLink
            to="/create"
            className={({ isActive }) =>
              `flex items-center justify-center h-11 w-11 rounded-2xl transition-colors shadow-lg ${isActive ? "bg-purple-500 shadow-purple-500/30" : "bg-purple-600 shadow-purple-600/20 hover:bg-purple-500"}`
            }
            aria-label="Create project"
          >
            <Plus className="h-5 w-5 text-white" />
          </NavLink>

          <button
            onClick={() => { setNotificationsOpen((v) => !v); setMenuOpen(false); refreshNotifications(); }}
            className="relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-gray-500 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-2 min-w-4 rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
            <span className="text-[10px]">Alerts</span>
          </button>

          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-gray-500 transition-colors"
            aria-label="More navigation"
          >
            <Menu className="h-5 w-5" />
            <span className="text-[10px]">More</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
