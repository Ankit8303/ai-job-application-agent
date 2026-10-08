"use client";

import { useState, useMemo, useEffect } from "react";
import { JobItem, JobPlatform, PLATFORMS } from "@/lib/jobs/types";
import { PlatformCard } from "./platform-card";
import { JobCard } from "./job-card";
import { RecentActivityCard } from "./recent-activity-card";
import { JobsSkeleton } from "./jobs-skeleton";
import { ProfileCompletenessCard } from "../profile-completeness-card";
import { ProfileData } from "../profile-form";
import {
  Search,
  RotateCw,
  Sparkles,
  Filter,
  Bookmark,
  Briefcase,
  AlertCircle,
  Clock,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface JobsViewProps {
  initialJobs: JobItem[];
  profile: ProfileData;
  fromCache?: boolean;
  lastFetchedAt?: string;
}

export function JobsView({
  initialJobs,
  profile,
  fromCache = true,
  lastFetchedAt,
}: JobsViewProps) {
  const [jobs, setJobs] = useState<JobItem[]>(initialJobs);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [selectedPlatform, setSelectedPlatform] = useState<JobPlatform>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [savedFilterActive, setSavedFilterActive] = useState(false);
  const [sortBy, setSortBy] = useState<"match" | "date" | "company">("match");
  const [cacheTimestamp, setCacheTimestamp] = useState<string | undefined>(lastFetchedAt);

  // Platform job counts
  const platformCounts = useMemo(() => {
    const counts: Record<string, number> = {
      greenhouse: 0,
      lever: 0,
      workable: 0,
      wellfound: 0,
    };
    jobs.forEach((job) => {
      const p = job.platform.toLowerCase();
      if (counts[p] !== undefined) {
        counts[p]++;
      }
    });
    return counts;
  }, [jobs]);

  // Fetch or refresh jobs from API
  const handleFetchJobs = async (forceRefresh: boolean = false, platform: JobPlatform = selectedPlatform) => {
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (platform !== "all") params.set("platform", platform);
      if (forceRefresh) params.set("refresh", "true");

      const res = await fetch(`/api/jobs?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to fetch jobs.");
      }

      setJobs(data.jobs || []);
      if (data.lastFetchedAt) {
        setCacheTimestamp(data.lastFetchedAt);
      }
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to load jobs.";
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Toggle Save bookmark in Supabase
  const handleSaveToggle = async (jobId: string, currentSaved: boolean) => {
    const nextSaved = !currentSaved;

    // Optimistic UI update
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, saved_status: nextSaved } : j))
    );

    try {
      const res = await fetch("/api/jobs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, saved_status: nextSaved }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to update save status");
      }
    } catch (err) {
      console.error("Save toggle error:", err);
      // Revert optimistic update
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, saved_status: currentSaved } : j))
      );
    }
  };

  // Mark job as applied
  const handleApply = async (job: JobItem) => {
    // Optimistic UI update
    setJobs((prev) =>
      prev.map((j) => (j.id === job.id ? { ...j, applied_status: "applied" } : j))
    );

    try {
      await fetch("/api/jobs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id, applied_status: "applied" }),
      });
    } catch (err) {
      console.error("Apply update error:", err);
    }
  };

  // Filtered & Sorted Jobs
  const filteredJobs = useMemo(() => {
    return jobs
      .filter((job) => {
        // Platform filter
        if (selectedPlatform !== "all" && job.platform.toLowerCase() !== selectedPlatform.toLowerCase()) {
          return false;
        }

        // Saved filter
        if (savedFilterActive && !job.saved_status) {
          return false;
        }

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = job.title.toLowerCase().includes(q);
          const matchCompany = job.company.toLowerCase().includes(q);
          const matchLocation = job.location.toLowerCase().includes(q);
          const matchTags = Array.isArray(job.tags) && job.tags.some((t) => t.toLowerCase().includes(q));
          if (!matchTitle && !matchCompany && !matchLocation && !matchTags) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "match") return (b.match_score || 0) - (a.match_score || 0);
        if (sortBy === "date") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (sortBy === "company") return a.company.localeCompare(b.company);
        return 0;
      });
  }, [jobs, selectedPlatform, savedFilterActive, searchQuery, sortBy]);

  const firstName = profile.full_name ? profile.full_name.split(" ")[0] : "Candidate";
  const userRole = profile.headline || "Software Engineer";

  return (
    <div className="flex-1 flex flex-col space-y-6">
      {/* 1. Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0C101D] via-[#10172A] to-[#0D152A] border border-slate-800/90 p-6 sm:p-8 shadow-2xl">
        {/* Glow ambient effects */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-1/3 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>AI Job Search Engine • Brave Search API</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {firstName} 👋
            </h1>

            <p className="text-sm text-slate-300 mt-2 leading-relaxed">
              We scouted top matching roles across <span className="text-emerald-400 font-semibold">Greenhouse</span>,{" "}
              <span className="text-blue-400 font-semibold">Lever</span>,{" "}
              <span className="text-cyan-400 font-semibold">Workable</span>, and{" "}
              <span className="text-amber-400 font-semibold">Wellfound</span> tailored specifically to your background as a{" "}
              <span className="text-white font-medium">{userRole}</span>.
            </p>

            {/* Profile Skills Preview Chips */}
            {Array.isArray(profile.skills) && profile.skills.length > 0 && (
              <div className="flex items-center flex-wrap gap-1.5 mt-3.5 pt-3 border-t border-slate-800/80">
                <span className="text-xs text-slate-400 font-medium mr-1">Targeting:</span>
                {profile.skills.slice(0, 5).map((skill, i) => (
                  <span
                    key={i}
                    className="text-[11px] px-2.5 py-0.5 rounded-md bg-slate-800/70 border border-slate-700/60 text-indigo-300 font-medium"
                  >
                    {skill}
                  </span>
                ))}
                {profile.skills.length > 5 && (
                  <span className="text-[11px] text-slate-500">
                    +{profile.skills.length - 5} more
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Right Action: Refresh button & Cache Indicator */}
          <div className="flex flex-col sm:items-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => handleFetchJobs(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 shadow-lg shadow-indigo-600/25 active:scale-[0.98] transition-all cursor-pointer"
            >
              <RotateCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
              <span>{refreshing ? "Searching Brave API..." : "Refresh Matches"}</span>
            </button>

            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>
                {cacheTimestamp
                  ? `Cached (${new Date(cacheTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}) • 6-hr freshness`
                  : "Automatic 6-hr database cache"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Selectable Job Platform Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Select Job Platform
            </h2>
          </div>
          {selectedPlatform !== "all" && (
            <button
              type="button"
              onClick={() => setSelectedPlatform("all")}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium cursor-pointer"
            >
              Reset to All Platforms
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {(["greenhouse", "lever", "workable", "wellfound"] as const).map((key) => (
            <PlatformCard
              key={key}
              platformKey={key}
              isSelected={selectedPlatform === key}
              count={platformCounts[key]}
              onSelect={(p) => setSelectedPlatform(p)}
            />
          ))}
        </div>
      </div>

      {/* 3. Main Content Grid (Job Matches List on Left, Sidebar on Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column: Job Matches (2 cols on XL) */}
        <div className="xl:col-span-2 space-y-4">
          {/* Search, Filter & Sort Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl border border-slate-800/80 bg-slate-900/40">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter by title, company, or skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-800/90 rounded-xl pl-9 pr-3.5 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 transition-colors"
              />
            </div>

            {/* Controls Row */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Saved Toggle Button */}
              <button
                type="button"
                onClick={() => setSavedFilterActive(!savedFilterActive)}
                className={cn(
                  "px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer",
                  savedFilterActive
                    ? "bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-sm"
                    : "bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-white"
                )}
              >
                <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                <span>Saved</span>
              </button>

              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-950/80 border border-slate-800/90 rounded-xl px-3 py-2 text-xs font-medium text-slate-300 focus:outline-none focus:border-indigo-500/80 cursor-pointer"
              >
                <option value="match">Highest Match</option>
                <option value="date">Most Recent</option>
                <option value="company">Company (A-Z)</option>
              </select>
            </div>
          </div>

          {/* Active Filter Info Banner */}
          {(selectedPlatform !== "all" || savedFilterActive || searchQuery) && (
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>
                Showing <strong className="text-white">{filteredJobs.length}</strong> {filteredJobs.length === 1 ? "role" : "roles"}
                {selectedPlatform !== "all" && ` on ${PLATFORMS[selectedPlatform as keyof typeof PLATFORMS]?.name}`}
                {savedFilterActive && " (saved only)"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedPlatform("all");
                  setSavedFilterActive(false);
                  setSearchQuery("");
                }}
                className="text-indigo-400 hover:underline cursor-pointer"
              >
                Clear all filters
              </button>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold">Unable to fetch latest jobs</p>
                <p className="text-rose-400/80 mt-0.5">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => handleFetchJobs(true)}
                className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-semibold cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* Jobs List */}
          {loading ? (
            <JobsSkeleton />
          ) : filteredJobs.length === 0 ? (
            /* Empty State */
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-12 text-center flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mb-4">
                <Briefcase className="w-7 h-7 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-white">No jobs found</h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-sm mt-1 mb-6">
                {savedFilterActive
                  ? "You haven't saved any job opportunities yet. Bookmark roles to review them anytime."
                  : searchQuery
                  ? `No roles match your search term "${searchQuery}". Try a different keyword.`
                  : "No opportunities match the current platform filter."}
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlatform("all");
                    setSavedFilterActive(false);
                    setSearchQuery("");
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors cursor-pointer"
                >
                  Clear Filters
                </button>
                <button
                  type="button"
                  onClick={() => handleFetchJobs(true)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors cursor-pointer"
                >
                  Fetch Fresh Matches
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onSaveToggle={handleSaveToggle}
                  onApply={handleApply}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Sidebar with Profile Completeness & Recent Activity */}
        <div className="space-y-6">
          {/* Profile Completeness Card */}
          <ProfileCompletenessCard profile={profile} />

          {/* Recent Activity Card */}
          <RecentActivityCard
            jobs={jobs}
            onFilterSaved={() => setSavedFilterActive(!savedFilterActive)}
            savedFilterActive={savedFilterActive}
          />
        </div>
      </div>
    </div>
  );
}
