import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { api, type ProfileData } from "../lib/api";
import { computeLevelInfo, getInitials } from "../lib/teamUtils";
import { useAuth } from "../contexts/AuthContext";
import {
  Camera,
  Flame,
  Award,
  Github,
  Linkedin,
  Twitter,
  Edit2,
  Check,
  FileText,
  TrendingUp,
  Briefcase
} from "lucide-react";

export function Profile() {
  const { session } = useAuth();
  const currentUserId = session?.user.id;
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit states
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState("");
  const [isEditingSocials, setIsEditingSocials] = useState(false);
  const [socialsDraft, setSocialsDraft] = useState({ github: "", linkedin: "", x: "" });

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  useEffect(() => {
    if (!currentUserId) return;
    api.users
      .getProfile(currentUserId)
      .then(({ profile }) => {
        setProfile(profile);
        setSummaryDraft(profile.experience_summary || "");
        setTitleDraft(profile.job_title || "");
        setSocialsDraft({
          github: profile.github_url || "",
          linkedin: profile.linkedin_url || "",
          x: profile.x_url || "",
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [currentUserId]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUserId) return;

    try {
      const res = await api.users.uploadAvatar(currentUserId, file);
      if (res.success && profile) {
        setProfile({ ...profile, avatar_url: res.avatar_url });
        window.dispatchEvent(new Event('userProfileUpdated'));
      }
    } catch (err: any) {
      alert("Failed to upload avatar: " + err.message);
    }
  };

  const saveTitle = async () => {
    if (!currentUserId) return;
    try {
      await api.users.update(currentUserId, { job_title: titleDraft });
      if (profile) setProfile({ ...profile, job_title: titleDraft });
      setIsEditingTitle(false);
    } catch (err: any) {
      alert("Failed to save job title: " + err.message);
    }
  };

  const saveSummary = async () => {
    if (!currentUserId) return;
    try {
      await api.users.update(currentUserId, { experience_summary: summaryDraft });
      if (profile) setProfile({ ...profile, experience_summary: summaryDraft });
      setIsEditingSummary(false);
    } catch (err: any) {
      alert("Failed to save summary: " + err.message);
    }
  };

  const saveSocials = async () => {
    if (!currentUserId) return;
    try {
      await api.users.update(currentUserId, {
        github_url: socialsDraft.github,
        linkedin_url: socialsDraft.linkedin,
        x_url: socialsDraft.x,
      });
      if (profile) {
        setProfile({
          ...profile,
          github_url: socialsDraft.github,
          linkedin_url: socialsDraft.linkedin,
          x_url: socialsDraft.x,
        });
      }
      setIsEditingSocials(false);
    } catch (err: any) {
      alert("Failed to save socials: " + err.message);
    }
  };

  const handleUploadCV = async (file: File) => {
    if (!currentUserId) return;
    try {
      const res = await api.users.uploadCV(currentUserId, file);
      if (res.success && profile) {
        setProfile({
          ...profile,
          skills: res.skills,
          experience_summary: res.experience_summary,
          cv_parsed_at: new Date().toISOString(),
        });
        setSummaryDraft(res.experience_summary);
      }
    } catch (err: any) {
      alert("Failed to upload CV: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-purple-400">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="p-12 text-red-400">
        <p>Failed to load profile: {error || "Not found"}</p>
      </div>
    );
  }

  const initials = getInitials(profile.full_name, profile.email);
  const { level, progress: levelProgress } = computeLevelInfo(profile.completed_count);

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto">
      {/* Header Profile Block */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col md:flex-row items-center md:items-end gap-6 bg-linear-to-br from-white/5 to-white/2 backdrop-blur-3xl border border-white/10 rounded-3xl p-8"
      >
        <div className="relative group shrink-0">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-linear-to-br from-purple-600 to-indigo-800 shadow-2xl shadow-purple-500/30 flex items-center justify-center overflow-hidden border-4 border-white/5">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-5xl md:text-6xl text-white font-bold">{initials}</span>
            )}
            <div
              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="w-8 h-8 text-white" />
            </div>
          </div>
          <input
            type="file"
            className="hidden"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleAvatarUpload}
          />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-4xl font-bold text-white mb-2">{profile.full_name || profile.email}</h1>
          <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
            <Briefcase className="w-5 h-5 text-purple-400" />
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveTitle()}
                  placeholder="e.g. Product Manager"
                  className="bg-black/40 border border-purple-500/50 rounded-lg px-3 py-1 text-sm text-white focus:outline-none"
                  autoFocus
                />
                <button onClick={saveTitle} className="text-purple-400 hover:text-white">
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="group flex items-center gap-2 cursor-pointer" onClick={() => setIsEditingTitle(true)}>
                <span className="text-purple-300 text-lg">{profile.job_title || "Add your role..."}</span>
                <Edit2 className="w-4 h-4 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-gray-400">
            <span>{profile.email}</span>
            {profile.phone && <span className="text-gray-500">·</span>}
            {profile.phone && <span>{profile.phone}</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-4 mt-6 md:mt-0 justify-center">
          <label className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition-all">
            <FileText className="w-4 h-4" />
            {profile.cv_parsed_at ? "Update CV" : "Upload CV"}
            <input
              type="file"
              className="hidden"
              accept=".pdf,.txt"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadCV(file);
                e.target.value = '';
              }}
            />
          </label>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-8">

          {/* Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-linear-to-br from-white/5 to-white/2 backdrop-blur-2xl border border-white/10 rounded-3xl p-8"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Summary</h2>
              {!isEditingSummary && (
                <button onClick={() => setIsEditingSummary(true)} className="text-gray-400 hover:text-white transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {isEditingSummary ? (
              <div className="space-y-4">
                <textarea
                  value={summaryDraft}
                  onChange={(e) => setSummaryDraft(e.target.value)}
                  className="w-full bg-black/40 border border-purple-500/30 rounded-xl p-4 text-gray-200 outline-none focus:border-purple-500 min-h-[120px]"
                  placeholder="Tell the team about yourself..."
                />
                <div className="flex justify-end gap-3">
                  <button onClick={() => { setIsEditingSummary(false); setSummaryDraft(profile.experience_summary || ""); }} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
                  <button onClick={saveSummary} className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-500 text-white rounded-lg flex items-center gap-2">
                    <Check className="w-4 h-4" /> Save
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-400 leading-relaxed">
                {profile.experience_summary || "No summary provided. Upload your CV to auto-generate one!"}
              </p>
            )}
          </motion.div>

          {/* Level & Rank */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-linear-to-br from-purple-900/30 to-black border border-purple-500/20 rounded-3xl p-8 flex items-center gap-8"
          >
            <div className="w-24 h-24 rounded-full bg-linear-to-br from-purple-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/20 border-4 border-white/10">
              <TrendingUp className="w-10 h-10 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-end mb-2">
                <div>
                  <span className="text-gray-400 text-sm font-semibold uppercase tracking-wider">Level</span>
                  <div className="text-3xl font-bold text-white">{level}</div>
                </div>
                <div className="text-sm text-purple-400 font-semibold">{profile.completed_count} / {(level * 5)} tasks</div>
              </div>
              <div className="h-3 bg-black/50 rounded-full overflow-hidden border border-white/5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${levelProgress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-linear-to-r from-purple-500 to-indigo-400"
                />
              </div>
            </div>
          </motion.div>

          {/* Achievements */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-linear-to-br from-white/5 to-white/2 backdrop-blur-2xl border border-white/10 rounded-3xl p-8"
          >
            <h2 className="text-xl font-bold text-white mb-6">Achievements</h2>
            {profile.achievements.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {profile.achievements.map((achievement, idx) => (
                  <div key={idx} className="flex items-center gap-4 bg-purple-900/20 border border-purple-500/20 rounded-2xl p-4">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                      <Award className="w-5 h-5 text-purple-400" />
                    </div>
                    <span className="text-gray-200 font-medium">{achievement}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic p-6 bg-black/20 rounded-2xl border border-white/5 text-center">
                You haven't earned any achievements yet. Complete some tasks to start building your track record!
              </p>
            )}
          </motion.div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-8">

          {/* Socials */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-linear-to-br from-white/5 to-white/2 backdrop-blur-2xl border border-white/10 rounded-3xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Socials</h3>
              {!isEditingSocials && (
                <button onClick={() => setIsEditingSocials(true)} className="text-gray-400 hover:text-white transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {isEditingSocials ? (
              <div className="space-y-4">
                <div className="relative">
                  <Github className="w-4 h-4 absolute left-3 top-3.5 text-gray-400" />
                  <input type="text" value={socialsDraft.github} onChange={e => setSocialsDraft({ ...socialsDraft, github: e.target.value })} placeholder="GitHub URL" className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:border-purple-500 outline-none" />
                </div>
                <div className="relative">
                  <Linkedin className="w-4 h-4 absolute left-3 top-3.5 text-gray-400" />
                  <input type="text" value={socialsDraft.linkedin} onChange={e => setSocialsDraft({ ...socialsDraft, linkedin: e.target.value })} placeholder="LinkedIn URL" className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:border-purple-500 outline-none" />
                </div>
                <div className="relative">
                  <Twitter className="w-4 h-4 absolute left-3 top-3.5 text-gray-400" />
                  <input type="text" value={socialsDraft.x} onChange={e => setSocialsDraft({ ...socialsDraft, x: e.target.value })} placeholder="X/Twitter URL" className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:border-purple-500 outline-none" />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setIsEditingSocials(false)} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white">Cancel</button>
                  <button onClick={saveSocials} className="px-3 py-1.5 text-xs bg-purple-600 hover:bg-purple-500 text-white rounded-md">Save</button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                {profile.github_url && (
                  <a href={profile.github_url} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                    <Github className="w-5 h-5" />
                  </a>
                )}
                {profile.linkedin_url && (
                  <a href={profile.linkedin_url} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-[#0A66C2] hover:bg-white/10 transition-colors">
                    <Linkedin className="w-5 h-5" />
                  </a>
                )}
                {profile.x_url && (
                  <a href={profile.x_url} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                    <Twitter className="w-5 h-5" />
                  </a>
                )}
                {!profile.github_url && !profile.linkedin_url && !profile.x_url && (
                  <span className="text-sm text-gray-500 italic">No social links added</span>
                )}
              </div>
            )}
          </motion.div>

          {/* Weekly Streak */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-linear-to-br from-orange-900/20 to-black border border-orange-500/20 rounded-3xl p-6 relative overflow-hidden"
          >
            <div className="absolute -right-4 -top-4 opacity-10">
              <Flame className="w-32 h-32 text-orange-500" />
            </div>
            <h3 className="text-lg font-bold text-white mb-6 relative z-10">Weekly Streak</h3>
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-14 h-14 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
                <Flame className={`w-7 h-7 ${profile.weekly_streak > 0 ? 'text-orange-500' : 'text-gray-500'}`} />
              </div>
              <div>
                <div className="text-3xl font-bold text-white">{profile.weekly_streak} <span className="text-base text-gray-400 font-normal">weeks</span></div>
              </div>
            </div>
            <div className="mt-6 h-2 bg-black/50 rounded-full overflow-hidden border border-white/5 relative z-10">
              <div className="h-full bg-orange-500 w-[100%]" /> {/* Always full if streak is active */}
            </div>
          </motion.div>

          {/* Skills */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-linear-to-br from-white/5 to-white/2 backdrop-blur-2xl border border-white/10 rounded-3xl p-6"
          >
            <h3 className="text-lg font-bold text-white mb-6">Skills</h3>
            {profile.skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill, i) => (
                  <span key={i} className="px-3 py-1.5 bg-purple-900/30 border border-purple-500/30 rounded-lg text-sm text-purple-200">
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No skills listed. Upload your CV to auto-extract them.</p>
            )}
          </motion.div>

        </div>
      </div>
    </div>
  );
}
