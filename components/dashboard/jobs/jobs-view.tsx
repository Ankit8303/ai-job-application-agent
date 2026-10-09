"use client";

import { useState, useMemo } from "react";
import { JobItem, JobPlatform, JobTier, JobFilterOptions, resolvePlatformConfig, PLATFORMS } from "@/lib/jobs/types";
import { JobCard } from "./job-card";
import { PlatformSelector } from "./platform-selector";
import { AdvancedFilters } from "./advanced-filters";
import { PaginationControls } from "./pagination-controls";
import { RecentActivityCard } from "./recent-activity-card";
import { JobsSkeleton } from "./jobs-skeleton";
import { ProfileCompletenessCard } from "../profile-completeness-card";
import { ProfileData } from "../profile-form";
import {
  Search,
  RotateCw,
  Sparkles,
  Bookmark,
  Briefcase,
  AlertCircle,
  Clock,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface JobsViewProps {
  initialJobs: JobItem[];
  profile: ProfileData;
  fromCache?: boolean;
  lastFetchedAt?: string;
}

export const isJobInTier = (job: JobItem, tier: JobTier): boolean => {
  if (tier === "all") return true;

  const t = (job.source_tier || "").toLowerCase();
  if (t === tier) return true;

  const p = (job.platform || "").toLowerCase();
  if (tier === "career_pages") {
    return ["ashby", "greenhouse", "lever", "workday", "career_pages"].includes(p) || t === "career_pages";
  }
  if (tier === "global") {
    return t === "global" || ["levels_fyi", "linkedin", "indeed", "wellfound", "yc_startups", "dice", "builtin"].includes(p);
  }
  if (tier === "remote") {
    return t === "remote" || ["remote_ok", "jobicy", "weworkremotely", "arc_dev", "himalayas", "toptal", "remotive"].includes(p);
  }
  if (tier === "indian") {
    return t === "indian" || ["naukri", "cutshort", "instahyre", "hirist", "foundit", "internshala"].includes(p);
  }

  return false;
};

export const isJobInPlatform = (job: JobItem, platform: string, tier?: JobTier): boolean => {
  if (!platform || platform === "all") {
    return tier ? isJobInTier(job, tier) : true;
  }

  const p = (job.platform || "").toLowerCase();
  const target = platform.toLowerCase();

  if (target === "internshala") {
    return p === "internshala" && (job.job_url || "").toLowerCase().includes("internshala.com");
  }

  if (p === target) return true;

  if (target === "career_pages") {
    return ["ashby", "greenhouse", "lever", "workday", "career_pages"].includes(p) || (job.source_tier || "") === "career_pages";
  }
  if (target === "global" || target === "remote" || target === "indian") {
    return isJobInTier(job, target as JobTier);
  }

  return false;
};

export function JobsView({
  initialJobs,
  profile,
  lastFetchedAt,
}: JobsViewProps) {
  const [jobs, setJobs] = useState<JobItem[]>(initialJobs);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Regional & Platform selection state
  const [selectedTier, setSelectedTier] = useState<JobTier>("all");
  const [selectedPlatform, setSelectedPlatform] = useState<JobPlatform>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [savedFilterActive, setSavedFilterActive] = useState(false);
  const [cacheTimestamp, setCacheTimestamp] = useState<string | undefined>(lastFetchedAt);

  // Scout rotation & alert notification state
  const [scoutSeed, setScoutSeed] = useState(0);
  const [scoutNotification, setScoutNotification] = useState<{ message: string; count: number } | null>(null);

  // Advanced filters state
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<JobFilterOptions>({
    searchQuery: "",
    selectedPlatforms: [],
    selectedTier: "all",
    datePosted: "all",
    workplace: "all",
    experienceLevel: "all",
    jobType: "all",
    minSalary: 0,
    minRating: 0,
    minMatchScore: 0,
    sortBy: "latest",
    status: "all",
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Compute platform and tier counts across all jobs
  const platformCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: jobs.length,
      indian: 0,
      remote: 0,
      global: 0,
      career_pages: 0,
    };

    jobs.forEach((job) => {
      const p = (job.platform || "").toLowerCase();
      if (p) {
        counts[p] = (counts[p] || 0) + 1;
      }
      if (isJobInTier(job, "indian")) counts.indian = (counts.indian || 0) + 1;
      if (isJobInTier(job, "remote")) counts.remote = (counts.remote || 0) + 1;
      if (isJobInTier(job, "global")) counts.global = (counts.global || 0) + 1;
      if (isJobInTier(job, "career_pages")) counts.career_pages = (counts.career_pages || 0) + 1;
    });

    // Also compute tier-specific platform counts (e.g., remote:ashby, global:ashby)
    jobs.forEach((job) => {
      const p = (job.platform || "").toLowerCase();
      if (p) {
        if (isJobInTier(job, "remote")) counts[`remote:${p}`] = (counts[`remote:${p}`] || 0) + 1;
        if (isJobInTier(job, "global")) counts[`global:${p}`] = (counts[`global:${p}`] || 0) + 1;
        if (isJobInTier(job, "indian")) counts[`indian:${p}`] = (counts[`indian:${p}`] || 0) + 1;
        if (isJobInTier(job, "career_pages")) counts[`career_pages:${p}`] = (counts[`career_pages:${p}`] || 0) + 1;
      }
    });

    return counts;
  }, [jobs]);

  // Fetch or refresh jobs from API
  const handleFetchJobs = async (forceRefresh: boolean = false, target: JobPlatform = selectedPlatform) => {
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    setScoutNotification(null);

    try {
      const params = new URLSearchParams();
      if (target !== "all") params.set("platform", target);
      if (forceRefresh) {
        params.set("refresh", "true");
        const nextSeed = scoutSeed + 1;
        setScoutSeed(nextSeed);
        params.set("seed", String(nextSeed));

        // Pass visible job URLs so backend prioritizes unseen new postings
        const displayedUrls = (filteredAndSortedJobs.length > 0 ? filteredAndSortedJobs : jobs)
          .map((j) => j.job_url)
          .filter(Boolean)
          .slice(0, 50);
        if (displayedUrls.length > 0) {
          params.set("excludeUrls", displayedUrls.join(","));
        }
      }

      const res = await fetch(`/api/jobs?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to fetch jobs.");
      }

      const incoming = (data.jobs || []) as JobItem[];
      setJobs((prev) => {
        const incomingUrls = new Set(incoming.map((j) => j.job_url.toLowerCase()));
        const remaining = prev.filter((j) => !incomingUrls.has(j.job_url.toLowerCase()));
        return [...incoming, ...remaining];
      });

      const targetLabel = target !== "all" 
        ? (PLATFORMS[target]?.name || target)
        : (selectedTier === "indian" ? "Indian Tech" : selectedTier === "remote" ? "Remote" : selectedTier === "global" ? "Global Tech" : selectedTier === "career_pages" ? "Direct ATS" : "");

      if (data.newJobsCount && data.newJobsCount > 0) {
        setScoutNotification({
          message: `Scouted ${data.newJobsCount} fresh verified ${targetLabel ? targetLabel + " " : ""}roles with exact posting dates!`,
          count: data.newJobsCount,
        });
        setTimeout(() => setScoutNotification(null), 6000);
      } else if (forceRefresh) {
        setScoutNotification({
          message: `Refreshed and verified latest ${targetLabel ? targetLabel + " " : ""}roles from rotated company boards!`,
          count: incoming.length,
        });
        setTimeout(() => setScoutNotification(null), 5000);
      }

      if (data.lastFetchedAt) {
        setCacheTimestamp(data.lastFetchedAt);
      }
      setCurrentPage(1);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to load jobs.";
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSelectPlatform = async (platform: JobPlatform, tier?: JobTier) => {
    setSelectedPlatform(platform);
    if (tier) setSelectedTier(tier);
    setCurrentPage(1);

    if (platform !== "all") {
      const effectiveTier = tier || selectedTier;
      const matchingCount = jobs.filter((j) => isJobInPlatform(j, platform, effectiveTier)).length;
      if (matchingCount === 0) {
        await handleFetchJobs(false, platform);
      }
    }
  };

  const handleSelectTier = async (tier: JobTier) => {
    setSelectedTier(tier);
    setSelectedPlatform("all");
    setCurrentPage(1);

    if (tier !== "all") {
      const matchingCount = jobs.filter((j) => isJobInTier(j, tier)).length;
      if (matchingCount === 0) {
        // Fetch jobs for the selected tier across all platforms
        await handleFetchJobs(false, "all");
      }
    }
  };

  const handleSaveToggle = async (jobId: string, currentSaved: boolean) => {
    const nextSaved = !currentSaved;

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
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, saved_status: currentSaved } : j))
      );
    }
  };

  const handleApply = async (job: JobItem) => {
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
      console.error("Apply status update error:", err);
    }
  };

  const handleFilterChange = (updated: Partial<JobFilterOptions>) => {
    setFilters((prev) => ({ ...prev, ...updated }));
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilters({
      searchQuery: "",
      selectedPlatforms: [],
      selectedTier: "all",
      datePosted: "all",
      workplace: "all",
      experienceLevel: "all",
      jobType: "all",
      minSalary: 0,
      minRating: 0,
      minMatchScore: 0,
      sortBy: "latest",
      status: "all",
    });
    setSearchQuery("");
    setSelectedPlatform("all");
    setSelectedTier("all");
    setSavedFilterActive(false);
    setCurrentPage(1);
  };

  // Filter & Sort Pipeline
  const filteredAndSortedJobs = useMemo(() => {
    const now = Date.now();

    return jobs
      .filter((job) => {
        // 1. Tier and Platform filter
        if (selectedPlatform !== "all") {
          if (!isJobInPlatform(job, selectedPlatform, selectedTier)) return false;
        } else if (selectedTier !== "all") {
          if (!isJobInTier(job, selectedTier)) return false;
        }

        // 2. Saved filter
        if (savedFilterActive && !job.saved_status) {
          return false;
        }

        // 3. Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = job.title.toLowerCase().includes(q);
          const matchCompany = job.company.toLowerCase().includes(q);
          const matchLocation = job.location.toLowerCase().includes(q);
          const matchDesc = job.description.toLowerCase().includes(q);
          const matchTags = Array.isArray(job.tags) && job.tags.some((t) => t.toLowerCase().includes(q));
          if (!matchTitle && !matchCompany && !matchLocation && !matchDesc && !matchTags) {
            return false;
          }
        }

        // 4. Date Posted filter
        if (filters.datePosted !== "all") {
          const rawDate = job.posted_at || job.created_at;
          const postedTime = rawDate ? new Date(rawDate).getTime() : NaN;
          if (isNaN(postedTime)) return false;
          const ageHours = (now - postedTime) / (1000 * 60 * 60);

          if (filters.datePosted === "24h" && ageHours > 24) return false;
          if (filters.datePosted === "3d" && ageHours > 72) return false;
          if (filters.datePosted === "7d" && ageHours > 168) return false;
          if (filters.datePosted === "30d" && ageHours > 720) return false;
        }

        // 5. Workplace mode filter
        if (filters.workplace !== "all") {
          const locLower = job.location.toLowerCase();
          if (filters.workplace === "remote" && !locLower.includes("remote")) return false;
          if (filters.workplace === "hybrid" && !locLower.includes("hybrid")) return false;
          if (filters.workplace === "onsite" && (locLower.includes("remote") || locLower.includes("hybrid"))) return false;
        }

        // 6. Experience level filter
        if (filters.experienceLevel !== "all") {
          const expLower = (job.experience_level || "").toLowerCase();
          if (filters.experienceLevel === "entry" && !expLower.includes("entry") && !expLower.includes("junior") && !expLower.includes("intern")) return false;
          if (filters.experienceLevel === "mid" && !expLower.includes("mid")) return false;
          if (filters.experienceLevel === "senior" && !expLower.includes("senior")) return false;
          if (filters.experienceLevel === "lead" && !expLower.includes("lead") && !expLower.includes("staff")) return false;
        }

        // 7. Company rating filter
        if (filters.minRating > 0) {
          const rating = job.company_ratings?.overall || 4.2;
          if (rating < filters.minRating) return false;
        }

        // 8. Match score filter
        if (filters.minMatchScore > 0) {
          if ((job.match_score || 0) < filters.minMatchScore) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (filters.sortBy === "latest") {
          const timeA = new Date(a.posted_at || a.created_at).getTime();
          const timeB = new Date(b.posted_at || b.created_at).getTime();
          const validA = isNaN(timeA) ? 0 : timeA;
          const validB = isNaN(timeB) ? 0 : timeB;
          return validB - validA;
        }
        if (filters.sortBy === "match") {
          return (b.match_score || 0) - (a.match_score || 0);
        }
        if (filters.sortBy === "rating") {
          const rA = a.company_ratings?.overall || 0;
          const rB = b.company_ratings?.overall || 0;
          return rB - rA;
        }
        if (filters.sortBy === "salary") {
          return b.title.localeCompare(a.title);
        }
        return 0;
      });
  }, [jobs, selectedPlatform, selectedTier, savedFilterActive, searchQuery, filters]);

  // Paginated Slice
  const totalItems = filteredAndSortedJobs.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedJobs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedJobs.slice(start, start + pageSize);
  }, [filteredAndSortedJobs, currentPage, pageSize]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.datePosted !== "all") count++;
    if (filters.workplace !== "all") count++;
    if (filters.experienceLevel !== "all") count++;
    if (filters.minRating > 0) count++;
    if (filters.minMatchScore > 0) count++;
    if (filters.sortBy !== "latest") count++;
    return count;
  }, [filters]);

  const firstName = profile?.full_name ? profile.full_name.split(" ")[0] : "Candidate";
  const userRole = profile?.headline || "Software Engineer";

  const activeTarget = selectedPlatform !== "all" ? selectedPlatform : selectedTier;
  const activeTargetName = useMemo(() => {
    if (selectedPlatform !== "all") {
      return PLATFORMS[selectedPlatform]?.name || selectedPlatform;
    }
    if (selectedTier === "indian") return "Indian Tech";
    if (selectedTier === "remote") return "Remote";
    if (selectedTier === "global") return "Global Tech";
    if (selectedTier === "career_pages") return "Direct ATS";
    return "Latest";
  }, [selectedPlatform, selectedTier]);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="relative rounded-3xl border border-slate-800/80 bg-gradient-to-br from-indigo-950/40 via-slate-900/60 to-purple-950/20 p-6 sm:p-8 overflow-hidden shadow-2xl backdrop-blur-md">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Indian, Global & Remote Job Discovery Engine</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {firstName} 👋
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
              Scouting live opportunities across <span className="text-blue-400 font-semibold">🇮🇳 Naukri</span>,{" "}
              <span className="text-emerald-400 font-semibold">Cutshort</span>,{" "}
              <span className="text-purple-400 font-semibold">Instahyre</span>,{" "}
              <span className="text-amber-400 font-semibold">Hirist</span>,{" "}
              <span className="text-red-400 font-semibold">🌍 RemoteOK</span>,{" "}
              <span className="text-sky-400 font-semibold">🌐 LinkedIn</span>, and{" "}
              <span className="text-indigo-400 font-semibold">Levels.fyi</span> tailored for a{" "}
              <span className="text-white font-medium">{userRole}</span>.
            </p>

            {/* Profile Skills Chips */}
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

          {/* Refresh Action & Cache indicator */}
          <div className="flex flex-col sm:items-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => handleFetchJobs(true, activeTarget)}
              disabled={refreshing || loading}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 shadow-lg shadow-indigo-600/25 active:scale-[0.98] transition-all cursor-pointer"
            >
              <RotateCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
              <span>
                {refreshing
                  ? `Scouting ${activeTargetName}...`
                  : activeTargetName === "Latest"
                  ? "Scout Latest Roles"
                  : `Scout Latest ${activeTargetName} Roles`}
              </span>
            </button>

            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                {cacheTimestamp
                  ? `Live Sync (${new Date(cacheTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}) • 100% Latest Roles`
                  : "Live Sync • Real-Time Discovery"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Scout Notification Banner */}
      {scoutNotification && (
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-indigo-500/15 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm animate-in fade-in slide-in-from-top-2 duration-300 shadow-xl shadow-emerald-500/5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold text-emerald-200">Fresh Roles Scouted:</span>
            <span className="text-emerald-300">{scoutNotification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setScoutNotification(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Regional & Platform Selector (Indian / Remote / Global / Career Pages) */}
      <PlatformSelector
        selectedPlatform={selectedPlatform}
        selectedTier={selectedTier}
        onSelectPlatform={handleSelectPlatform}
        onSelectTier={handleSelectTier}
        platformCounts={platformCounts}
        totalJobsCount={jobs.length}
      />

      {/* 3. Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column: Job Matches */}
        <div className="xl:col-span-2 space-y-4">
          {/* Search, Filter & Sort Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl border border-slate-800/80 bg-slate-900/50">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search any job (e.g. SDE, Product Manager, Designer, Marketing, Intern), company, or city..."
                className="w-full bg-slate-950/80 border border-slate-800/90 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setAdvancedFiltersOpen(true)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer",
                  activeFilterCount > 0
                    ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30"
                    : "bg-slate-950/80 border-slate-800 text-slate-300 hover:bg-slate-800"
                )}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-white text-indigo-900 text-[10px] font-extrabold flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  handleFilterChange({ datePosted: filters.datePosted === "3d" ? "all" : "3d" });
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer",
                  filters.datePosted === "3d"
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-md shadow-emerald-500/20"
                    : "bg-slate-950/80 border-slate-800 text-slate-300 hover:bg-slate-800"
                )}
                title="Filter for roles posted within the last 72 hours"
              >
                <span className={cn("w-2 h-2 rounded-full", filters.datePosted === "3d" ? "bg-emerald-400 animate-ping" : "bg-emerald-400")} />
                <span>🔥 Fresh (&lt;72h)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSavedFilterActive(!savedFilterActive);
                  setCurrentPage(1);
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer",
                  savedFilterActive
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                    : "bg-slate-950/80 border-slate-800 text-slate-300 hover:bg-slate-800"
                )}
              >
                <Bookmark className={cn("w-3.5 h-3.5", savedFilterActive && "fill-amber-400")} />
                <span>Saved</span>
              </button>

              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange({ sortBy: e.target.value as any })}
                className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="latest">⚡ Newest Posted</option>
                <option value="match">🎯 Highest Match</option>
                <option value="rating">⭐ Best Company Score</option>
                <option value="salary">💰 Compensation</option>
              </select>
            </div>
          </div>

          {/* Active Filter Pills Bar */}
          {(selectedPlatform !== "all" || selectedTier !== "all" || savedFilterActive || searchQuery || activeFilterCount > 0) && (
            <div className="flex items-center justify-between text-xs text-slate-400 px-1 py-1">
              <span className="flex items-center gap-1.5 flex-wrap">
                Showing <strong className="text-white">{filteredAndSortedJobs.length}</strong> matching roles
                {selectedTier !== "all" && (
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[11px]">
                    Region: {selectedTier === "indian" ? "🇮🇳 Indian Portals" : selectedTier === "remote" ? "🌍 Remote Boards" : selectedTier === "global" ? "🌐 Global Tech" : "Direct Sites"}
                  </span>
                )}
                {selectedPlatform !== "all" && selectedPlatform !== selectedTier && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-[11px]">
                    Portal: {resolvePlatformConfig(selectedPlatform).name}
                  </span>
                )}
                {savedFilterActive && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px]">
                    Saved Only
                  </span>
                )}
              </span>

              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer shrink-0 font-medium ml-2"
              >
                Clear all
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
          ) : paginatedJobs.length === 0 ? (
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-12 text-center flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mb-4">
                <Briefcase className="w-7 h-7 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-white">No job openings found</h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-sm mt-1 mb-6">
                {savedFilterActive
                  ? "You haven't bookmarked any jobs yet."
                  : searchQuery
                  ? `No roles match your search "${searchQuery}". Try a broader term.`
                  : "No opportunities match the selected market or portal."}
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors cursor-pointer"
                >
                  Reset Filters
                </button>
                <button
                  type="button"
                  onClick={() => handleFetchJobs(true, activeTarget)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors cursor-pointer"
                >
                  {activeTargetName === "Latest" ? "Scout Portals" : `Scout ${activeTargetName} Roles`}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onSaveToggle={handleSaveToggle}
                  onApply={handleApply}
                />
              ))}

              {/* Pagination Controls */}
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={(p) => {
                  setCurrentPage(p);
                  window.scrollTo({ top: 300, behavior: "smooth" });
                }}
                onPageSizeChange={(s) => {
                  setPageSize(s);
                  setCurrentPage(1);
                }}
              />
            </div>
          )}
        </div>

        {/* Right Column: Sidebar */}
        <div className="space-y-6">
          <ProfileCompletenessCard profile={profile} />

          <RecentActivityCard
            jobs={jobs}
            onFilterSaved={() => setSavedFilterActive(!savedFilterActive)}
            savedFilterActive={savedFilterActive}
          />
        </div>
      </div>

      {/* Advanced Filters Drawer */}
      <AdvancedFilters
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
        isOpen={advancedFiltersOpen}
        onClose={() => setAdvancedFiltersOpen(false)}
      />
    </div>
  );
}
