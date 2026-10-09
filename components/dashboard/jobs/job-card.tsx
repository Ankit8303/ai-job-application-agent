"use client";

import { useState } from "react";
import { JobItem, resolvePlatformConfig } from "@/lib/jobs/types";
import { CompanyRatingsModal } from "./company-ratings-modal";
import { JobRequirementsModal } from "./job-requirements-modal";
import { ApplyDialog } from "./apply-dialog";
import {
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  MapPin,
  DollarSign,
  Clock,
  Sparkles,
  Building2,
  CheckCircle2,
  Star,
  ShieldCheck,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface JobCardProps {
  job: JobItem;
  onSaveToggle: (jobId: string, currentSaved: boolean) => Promise<void>;
  onApply: (job: JobItem) => void;
}

export interface TimeInfo {
  text: string;
  fullDate: string;
  isHot: boolean;
}

export function formatRelativeTime(isoString?: string): TimeInfo {
  if (!isoString) {
    return {
      text: "Active opening",
      fullDate: "Active recruiter opening",
      isHot: false,
    };
  }

  const date = new Date(isoString);
  const timestamp = date.getTime();

  if (isNaN(timestamp)) {
    return {
      text: "Active opening",
      fullDate: "Verified active opening",
      isHot: false,
    };
  }

  const now = Date.now();
  const diffMs = now - timestamp;
  const nowYear = new Date(now).getFullYear();
  const dateYear = date.getFullYear();
  const isDifferentYear = dateYear !== nowYear;

  // Exact calendar date with weekday and year for tooltip verification
  const fullDate = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Minor clock skew or future timestamp (< 5 min)
  if (diffMs < 0) {
    return {
      text: "Just posted (<1h)",
      fullDate: `Posted on ${fullDate}`,
      isHot: true,
    };
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  // Less than 1 hour
  if (diffHours < 1) {
    const mins = Math.max(1, diffMinutes);
    return {
      text: mins <= 5 ? "Just posted (<5m)" : `Posted ${mins}m ago`,
      fullDate: `Posted on ${fullDate}`,
      isHot: true,
    };
  }

  // Under 24 hours
  if (diffHours < 24) {
    return {
      text: `Posted ${diffHours}h ago`,
      fullDate: `Posted on ${fullDate}`,
      isHot: true,
    };
  }

  // 1 day
  if (diffDays === 1) {
    return {
      text: "Posted 1 day ago",
      fullDate: `Posted on ${fullDate}`,
      isHot: true,
    };
  }

  // 2 - 3 days (Hot opening)
  if (diffDays <= 3) {
    return {
      text: `Posted ${diffDays} days ago`,
      fullDate: `Posted on ${fullDate}`,
      isHot: true,
    };
  }

  // 4 - 6 days
  if (diffDays < 7) {
    return {
      text: `Posted ${diffDays} days ago`,
      fullDate: `Posted on ${fullDate}`,
      isHot: false,
    };
  }

  // 7 - 13 days: Show exact days ago for crystal clear clarity (e.g., "Posted 9 days ago")
  if (diffDays < 14) {
    return {
      text: `Posted ${diffDays} days ago`,
      fullDate: `Posted on ${fullDate}`,
      isHot: false,
    };
  }

  // 14 - 29 days
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return {
      text: `Posted ${weeks} ${weeks === 1 ? "week" : "weeks"} ago`,
      fullDate: `Posted on ${fullDate}`,
      isHot: false,
    };
  }

  // 30 - 59 days
  if (diffDays < 60) {
    return {
      text: "Posted 1 month ago",
      fullDate: `Posted on ${fullDate}`,
      isHot: false,
    };
  }

  // 60+ days: Show clear calendar date with year when appropriate
  const formattedCal = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: isDifferentYear ? "numeric" : undefined,
  });

  return {
    text: `Posted ${formattedCal}`,
    fullDate: `Posted on ${fullDate}`,
    isHot: false,
  };
}

export function JobCard({ job, onSaveToggle, onApply }: JobCardProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(job.saved_status);
  const [logoError, setLogoError] = useState(false);
  const [ratingsModalOpen, setRatingsModalOpen] = useState(false);
  const [requirementsModalOpen, setRequirementsModalOpen] = useState(false);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);

  const platformConfig = resolvePlatformConfig(job.platform, job.job_url);
  const ratings = job.company_ratings;
  const reqs = job.requirements;
  const timeInfo = formatRelativeTime(job.posted_at);

  const handleSaveClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSaving(true);
    const nextSaved = !saved;
    setSaved(nextSaved);
    try {
      await onSaveToggle(job.id, saved);
    } catch {
      setSaved(saved);
    } finally {
      setIsSaving(false);
    }
  };

  const matchScore = job.match_score || 85;
  const matchColor =
    matchScore >= 90
      ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
      : matchScore >= 80
      ? "text-indigo-400 border-indigo-500/30 bg-indigo-500/10"
      : "text-amber-400 border-amber-500/30 bg-amber-500/10";

  const progressBg =
    matchScore >= 90
      ? "bg-gradient-to-r from-emerald-500 to-teal-400"
      : matchScore >= 80
      ? "bg-gradient-to-r from-indigo-500 to-purple-400"
      : "bg-gradient-to-r from-amber-500 to-orange-400";

  return (
    <>
      <div className="group relative rounded-2xl border border-slate-800/90 bg-[#0B0F19]/95 hover:bg-[#0E1424] hover:border-slate-700/80 p-5 sm:p-6 transition-all duration-200 shadow-lg hover:shadow-xl hover:shadow-indigo-500/5 flex flex-col justify-between">
        {/* Recruiter Timestamp & Freshness Top Ribbon */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/70 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold text-[11px] transition-colors",
                timeInfo.isHot
                  ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                  : "bg-slate-800/80 border border-slate-700/60 text-indigo-300"
              )}
              title={timeInfo.fullDate}
            >
              {timeInfo.isHot ? (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              ) : (
                <Clock className="w-3 h-3 text-indigo-400" />
              )}
              <span>{timeInfo.text}</span>
            </span>
          </div>

          {/* Quick Company Rating Popover Button */}
          {ratings && (
            <button
              type="button"
              onClick={() => setRatingsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-300 text-[11px] font-bold transition-colors cursor-pointer"
              title="Click to view Culture, Timely Payment, and Growth scorecard"
            >
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>{ratings.overall.toFixed(1)}</span>
              <span className="text-slate-400 font-normal">| Culture {ratings.culture.toFixed(1)}</span>
              <ShieldCheck className="w-3 h-3 text-emerald-400 ml-0.5" />
            </button>
          )}
        </div>

        {/* Company Logo, Title, and Bookmark */}
        <div>
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex items-start gap-3.5">
              {/* Company Logo */}
              <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center overflow-hidden shrink-0 shadow-inner group-hover:border-slate-600 transition-colors">
                {!logoError && job.company_logo ? (
                  <img
                    src={job.company_logo}
                    alt={job.company}
                    className="w-full h-full object-contain p-1.5"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <span className="font-bold text-sm text-slate-300">
                    {job.company ? job.company.slice(0, 2).toUpperCase() : <Building2 className="w-5 h-5 text-slate-400" />}
                  </span>
                )}
              </div>

              {/* Title & Company Metadata */}
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                  {job.title}
                </h3>
                <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs text-slate-400 mt-1">
                  <span className="font-medium text-slate-200">{job.company}</span>
                  <span className="text-slate-600">•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    {job.location}
                  </span>
                  {job.salary && (
                    <>
                      <span className="text-slate-600">•</span>
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        {job.salary.includes("₹") || job.currency === "INR" ? (
                          <span className="text-xs font-bold text-emerald-400">₹</span>
                        ) : (
                          <DollarSign className="w-3 h-3 text-emerald-500" />
                        )}
                        {job.salary}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Save Bookmark Action */}
            <button
              type="button"
              onClick={handleSaveClick}
              disabled={isSaving}
              aria-label={saved ? "Unsave job" : "Save job"}
              className={cn(
                "w-9 h-9 rounded-xl border flex items-center justify-center transition-all shrink-0 cursor-pointer",
                saved
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-400 hover:bg-amber-500/25"
                  : "bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-white hover:bg-slate-800/80"
              )}
            >
              {saved ? (
                <BookmarkCheck className="w-4 h-4 fill-amber-400/20" />
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Badges: Platform / Source, Job Type, Level */}
          <div className="flex items-center flex-wrap gap-2 mb-3.5">
            <span
              className={cn(
                "text-[11px] font-semibold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5",
                platformConfig.badgeBg
              )}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: platformConfig.accentColor }}
              />
              {platformConfig.name}
            </span>

            {/* Regional Badge */}
            {(platformConfig.country === "IN" || job.source_tier === "indian") && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-300 flex items-center gap-1">
                <span>🇮🇳</span> India
              </span>
            )}
            {(platformConfig.country === "REMOTE" || job.source_tier === "remote") && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300 flex items-center gap-1">
                <span>🌍</span> Remote
              </span>
            )}

            <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full border border-slate-700/60 bg-slate-800/40 text-slate-300">
              {job.job_type || "Full-time"}
            </span>

            <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full border border-slate-700/60 bg-slate-800/40 text-slate-300">
              {job.experience_level || "Mid-Level"}
            </span>

            {job.applied_status === "applied" && (
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 flex items-center gap-1 ml-auto">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Applied
              </span>
            )}
          </div>

          {/* Description Snippet */}
          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-3.5">
            {job.description}
          </p>

          {/* Skill Highlighting: Matched (Green) vs Company Wants (Amber) */}
          <div className="space-y-1.5 mb-4">
            <div className="flex items-center flex-wrap gap-1.5">
              {reqs?.matched_skills && reqs.matched_skills.slice(0, 3).map((skill, i) => (
                <span
                  key={`match-${i}`}
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center gap-1"
                >
                  ✓ {skill}
                </span>
              ))}

              {reqs?.missing_skills && reqs.missing_skills.slice(0, 2).map((skill, i) => (
                <span
                  key={`missing-${i}`}
                  className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/25 text-amber-300 flex items-center gap-1"
                >
                  ★ {skill}
                </span>
              ))}

              <button
                type="button"
                onClick={() => setRequirementsModalOpen(true)}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium px-1.5 py-0.5 transition-colors cursor-pointer flex items-center gap-0.5"
              >
                <Info className="w-3 h-3" /> Requirements & Match
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Row: AI Match Score Progress & Action Buttons */}
        <div className="pt-3.5 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 max-w-xs">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-400 flex items-center gap-1 font-medium">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                AI Match Score
              </span>
              <span className={cn("text-xs font-bold px-1.5 py-0.2 rounded border", matchColor)}>
                {matchScore}%
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-800/90 overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-500", progressBg)}
                style={{ width: `${matchScore}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setRequirementsModalOpen(true)}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white transition-all cursor-pointer"
            >
              Details
            </button>

            <button
              type="button"
              onClick={() => setApplyDialogOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/25 active:scale-[0.98] transition-all cursor-pointer"
            >
              <span>Open Job URL to Apply</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CompanyRatingsModal
        company={job.company}
        ratings={ratings}
        isOpen={ratingsModalOpen}
        onClose={() => setRatingsModalOpen(false)}
      />

      <JobRequirementsModal
        job={job}
        isOpen={requirementsModalOpen}
        onClose={() => setRequirementsModalOpen(false)}
        onOpenApply={() => setApplyDialogOpen(true)}
      />

      <ApplyDialog
        job={job}
        isOpen={applyDialogOpen}
        onClose={() => setApplyDialogOpen(false)}
        onApplied={(appliedJob) => onApply(appliedJob)}
      />
    </>
  );
}
