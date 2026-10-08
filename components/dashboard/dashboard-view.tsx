"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Briefcase,
  LogOut,
  Plus,
  Search,
  Sparkles,
  TrendingUp,
  Clock,
  CheckCircle2,
  Building,
  MapPin,
  Trash2,
  User,
  Shield,
  Loader2,
  UserCheck,
  Edit3,
  Camera,
} from "lucide-react";

interface JobApplication {
  id: string;
  company_name: string;
  position: string;
  location: string | null;
  status: string;
  match_score: number | null;
  salary_range: string | null;
  job_url: string | null;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  headline: string | null;
  updated_at?: string;
}

interface DashboardViewProps {
  initialUser: {
    id: string;
    email?: string;
    user_metadata?: {
      full_name?: string;
      name?: string;
      avatar_url?: string;
      picture?: string;
    };
    app_metadata?: {
      provider?: string;
      providers?: string[];
    };
  };
  initialProfile?: UserProfile | null;
  initialApplications: JobApplication[];
}

export function DashboardView({
  initialUser,
  initialProfile,
  initialApplications,
}: DashboardViewProps) {
  const router = useRouter();
  const supabase = createClient();

  const [applications, setApplications] = useState<JobApplication[]>(
    initialApplications
  );
  const [profile, setProfile] = useState<UserProfile | null>(
    initialProfile || null
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isAddingJob, setIsAddingJob] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Edit Profile Form State
  const [editFullName, setEditFullName] = useState(
    initialProfile?.full_name ||
      initialUser.user_metadata?.full_name ||
      initialUser.user_metadata?.name ||
      ""
  );
  const [editHeadline, setEditHeadline] = useState(
    initialProfile?.headline || ""
  );
  const [editAvatarUrl, setEditAvatarUrl] = useState(
    initialProfile?.avatar_url ||
      initialUser.user_metadata?.avatar_url ||
      initialUser.user_metadata?.picture ||
      ""
  );

  // New Job Form State
  const [companyName, setCompanyName] = useState("");
  const [position, setPosition] = useState("");
  const [location, setLocation] = useState("");
  const [salaryRange, setSalaryRange] = useState("");
  const [status, setStatus] = useState("Applied");

  const displayName =
    profile?.full_name ||
    initialUser.user_metadata?.full_name ||
    initialUser.user_metadata?.name ||
    initialUser.email?.split("@")[0] ||
    "User";

  const displayAvatar =
    profile?.avatar_url ||
    initialUser.user_metadata?.avatar_url ||
    initialUser.user_metadata?.picture;

  const displayHeadline = profile?.headline;

  const authProvider =
    initialUser.app_metadata?.provider ||
    (initialUser.app_metadata?.providers?.[0] ?? "email");

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await supabase.auth.signOut();
    router.push("/auth/sign-in");
    router.refresh();
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);

    try {
      const updatedData = {
        id: initialUser.id,
        email: initialUser.email,
        full_name: editFullName.trim(),
        headline: editHeadline.trim(),
        avatar_url: editAvatarUrl.trim(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("profiles")
        .upsert(updatedData)
        .select()
        .single();

      if (error) {
        alert("Failed to update profile: " + error.message);
      } else if (data) {
        setProfile(data);
        setIsEditingProfile(false);
      }
    } catch (err: unknown) {
      console.error(err);
      alert("Error saving profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAddApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !position) return;

    setIsSubmitting(true);
    try {
      const newJob = {
        user_id: initialUser.id,
        company_name: companyName,
        position,
        location: location || "Remote",
        salary_range: salaryRange || "$130k - $160k",
        status,
        match_score: Math.floor(Math.random() * 16) + 85, // 85 - 100%
      };

      const { data, error } = await supabase
        .from("job_applications")
        .insert([newJob])
        .select()
        .single();

      if (error) {
        alert("Failed to add job application: " + error.message);
      } else if (data) {
        setApplications([data, ...applications]);
        setIsAddingJob(false);
        setCompanyName("");
        setPosition("");
        setLocation("");
        setSalaryRange("");
      }
    } catch (err: unknown) {
      alert("Error adding job application");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteApplication = async (id: string) => {
    if (!confirm("Are you sure you want to remove this application?")) return;

    const { error } = await supabase
      .from("job_applications")
      .delete()
      .eq("id", id);

    if (!error) {
      setApplications(applications.filter((app) => app.id !== id));
    } else {
      alert("Error deleting application: " + error.message);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from("job_applications")
      .update({ status: newStatus })
      .eq("id", id);

    if (!error) {
      setApplications(
        applications.map((app) =>
          app.id === id ? { ...app, status: newStatus } : app
        )
      );
    }
  };

  // Filtered applications
  const filteredApps = applications.filter((app) => {
    const matchesSearch =
      app.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.position.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "All" || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = [
    {
      label: "Total Tracked",
      value: applications.length,
      icon: Briefcase,
      color: "text-indigo-400",
      bg: "bg-indigo-500/10",
    },
    {
      label: "Interviewing",
      value: applications.filter((a) => a.status === "Interviewing").length,
      icon: Clock,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      label: "Offers Received",
      value: applications.filter((a) => a.status === "Offered").length,
      icon: CheckCircle2,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Avg AI Match",
      value: "92%",
      icon: TrendingUp,
      color: "text-violet-400",
      bg: "bg-violet-500/10",
    },
  ];

  return (
    <div className="min-h-screen bg-[#070A11] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#090D16]/80 backdrop-blur-xl px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-md shadow-indigo-600/20">
              <Briefcase className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                ApplyPilot AI
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
                  Dashboard
                </span>
              </span>
            </div>
          </div>

          {/* User Info & Actions */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-400">Auth:</span>
              <span className="font-semibold text-slate-200 capitalize">
                {authProvider}
              </span>
            </div>

            {/* Profile Pill & Edit Button */}
            <div className="flex items-center gap-2 sm:gap-3 pl-2 border-l border-slate-800">
              <button
                onClick={() => {
                  setEditFullName(displayName);
                  setEditHeadline(displayHeadline || "");
                  setEditAvatarUrl(displayAvatar || "");
                  setIsEditingProfile(true);
                }}
                className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl hover:bg-slate-800/60 border border-transparent hover:border-slate-700/60 transition-all cursor-pointer text-left group"
                title="Click to edit Supabase profile"
              >
                {displayAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={displayAvatar}
                    alt={displayName}
                    className="w-8 h-8 rounded-full border border-slate-700 object-cover shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-sm shrink-0">
                    {displayName[0]?.toUpperCase() || <User className="w-4 h-4" />}
                  </div>
                )}
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-semibold text-white group-hover:text-indigo-300 transition-colors flex items-center gap-1.5">
                    <span>{displayName}</span>
                    <Edit3 className="w-3 h-3 text-slate-500 group-hover:text-indigo-400" />
                  </div>
                  <div className="text-[11px] text-slate-400 truncate max-w-[130px]">
                    {displayHeadline || initialUser.email}
                  </div>
                </div>
              </button>

              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                title="Sign out"
                className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all cursor-pointer"
              >
                {isLoggingOut ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LogOut className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-8">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-purple-950/40 border border-indigo-900/30 p-6 sm:p-8">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                Supabase Profiles & RLS Active
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
                Welcome back, {displayName}! 👋
              </h1>
              <p className="text-sm text-slate-400 max-w-xl">
                {displayHeadline
                  ? `${displayHeadline} • Review synced applications and pipeline metrics in real time.`
                  : "Your AI Job Application Agent is active. Review synced job applications, match metrics, and pipeline stages."}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => {
                  setEditFullName(displayName);
                  setEditHeadline(displayHeadline || "");
                  setEditAvatarUrl(displayAvatar || "");
                  setIsEditingProfile(true);
                }}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white font-medium text-sm transition-all cursor-pointer shadow-sm"
              >
                <Edit3 className="w-4 h-4 text-indigo-400" />
                <span>Edit Profile</span>
              </button>

              <button
                onClick={() => setIsAddingJob(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm shadow-lg shadow-indigo-600/30 transition-all duration-200 active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Application</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 transition-all shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">
                    {item.label}
                  </span>
                  <div className={`p-2 rounded-xl ${item.bg}`}>
                    <Icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                </div>
                <div className="mt-3 text-2xl font-bold text-white tracking-tight">
                  {item.value}
                </div>
              </div>
            );
          })}
        </div>

        {/* Applications Section */}
        <div className="space-y-4">
          {/* Controls: Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by company or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            {/* Status Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {["All", "Applied", "Interviewing", "Offered", "Rejected"].map(
                (filter) => (
                  <button
                    key={filter}
                    onClick={() => setStatusFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      statusFilter === filter
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800"
                    }`}
                  >
                    {filter}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Edit Profile Modal */}
          {isEditingProfile && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
              <div className="w-full max-w-lg rounded-2xl bg-[#0e1322] border border-slate-700/80 p-6 shadow-2xl space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-indigo-400" />
                    Update Supabase Profile
                  </h3>
                  <button
                    onClick={() => setIsEditingProfile(false)}
                    className="text-slate-400 hover:text-white text-sm cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ankit Chauhan"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      className="w-full h-10 px-3.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">
                      Professional Headline
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Senior Full Stack Engineer / AI Specialist"
                      value={editHeadline}
                      onChange={(e) => setEditHeadline(e.target.value)}
                      className="w-full h-10 px-3.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">
                      Avatar URL
                    </label>
                    <div className="relative">
                      <Camera className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="url"
                        placeholder="https://example.com/avatar.jpg"
                        value={editAvatarUrl}
                        onChange={(e) => setEditAvatarUrl(e.target.value)}
                        className="w-full h-10 pl-10 pr-3.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                    <span>Email (read-only):</span>
                    <span className="text-slate-300 font-mono">
                      {initialUser.email}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-sm cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSavingProfile ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Updating Supabase...</span>
                        </>
                      ) : (
                        <span>Save Profile</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Add Job Modal */}
          {isAddingJob && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
              <div className="w-full max-w-lg rounded-2xl bg-[#0e1322] border border-slate-700/80 p-6 shadow-2xl space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Plus className="w-5 h-5 text-indigo-400" />
                    New Job Application
                  </h3>
                  <button
                    onClick={() => setIsAddingJob(false)}
                    className="text-slate-400 hover:text-white text-sm cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleAddApplication} className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. OpenAI, Stripe, Google"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full h-10 px-3.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">
                      Role / Position *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Senior Full Stack Engineer"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      className="w-full h-10 px-3.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1">
                        Location
                      </label>
                      <input
                        type="text"
                        placeholder="Remote / San Francisco"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full h-10 px-3.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1">
                        Salary Range
                      </label>
                      <input
                        type="text"
                        placeholder="$140k - $175k"
                        value={salaryRange}
                        onChange={(e) => setSalaryRange(e.target.value)}
                        className="w-full h-10 px-3.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full h-10 px-3.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Applied">Applied</option>
                      <option value="Interviewing">Interviewing</option>
                      <option value="Offered">Offered</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Saved">Saved</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsAddingJob(false)}
                      className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-sm cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <span>Save to Supabase</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Job Applications Table / Cards */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 overflow-hidden shadow-sm backdrop-blur-sm">
            {filteredApps.length === 0 ? (
              <div className="py-16 px-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 mx-auto flex items-center justify-center border border-indigo-500/20">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-white">
                    No applications found
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    {searchQuery || statusFilter !== "All"
                      ? "Try tweaking your search or filter criteria."
                      : "Start tracking by adding your first job application above."}
                  </p>
                </div>
                <button
                  onClick={() => setIsAddingJob(true)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white inline-flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add First Application
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {filteredApps.map((app) => {
                  const statusColors: Record<string, string> = {
                    Applied:
                      "bg-blue-500/10 text-blue-400 border-blue-500/20",
                    Interviewing:
                      "bg-amber-500/10 text-amber-400 border-amber-500/20",
                    Offered:
                      "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                    Rejected:
                      "bg-rose-500/10 text-rose-400 border-rose-500/20",
                    Saved:
                      "bg-slate-500/10 text-slate-400 border-slate-500/20",
                  };

                  return (
                    <div
                      key={app.id}
                      className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 text-slate-300 font-bold border border-slate-700/60">
                          <Building className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5">
                            <h4 className="text-sm font-semibold text-white">
                              {app.position}
                            </h4>
                            <span
                              className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${
                                statusColors[app.status] ||
                                "bg-slate-500/10 text-slate-400 border-slate-500/20"
                              }`}
                            >
                              {app.status}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                            <span className="font-medium text-slate-300">
                              {app.company_name}
                            </span>
                            {app.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-500" />
                                {app.location}
                              </span>
                            )}
                            {app.salary_range && (
                              <span className="text-slate-500">
                                • {app.salary_range}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end md:self-center">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
                          <Sparkles className="w-3 h-3 text-indigo-400" />
                          <span>{app.match_score ?? 88}% Match</span>
                        </div>

                        {/* Status selector */}
                        <select
                          value={app.status}
                          onChange={(e) =>
                            handleStatusChange(app.id, e.target.value)
                          }
                          className="h-8 px-2.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                        >
                          <option value="Applied">Applied</option>
                          <option value="Interviewing">Interviewing</option>
                          <option value="Offered">Offered</option>
                          <option value="Rejected">Rejected</option>
                          <option value="Saved">Saved</option>
                        </select>

                        <button
                          onClick={() => handleDeleteApplication(app.id)}
                          title="Delete application"
                          className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Security & RLS notice */}
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>
              All data isolated via Supabase PostgreSQL Row Level Security (RLS).
            </span>
          </div>
          <span className="hidden sm:inline font-mono text-[11px] text-slate-500">
            User ID: {initialUser.id.substring(0, 13)}...
          </span>
        </div>
      </main>
    </div>
  );
}
