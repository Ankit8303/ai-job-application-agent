"use client";

import { useState } from "react";
import { JobItem, PLATFORMS } from "@/lib/jobs/types";
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
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface JobCardProps {
  job: JobItem;
  onSaveToggle: (jobId: string, currentSaved: boolean) => Promise<void>;
  onApply: (job: JobItem) => void;
}

export function JobCard({ job, onSaveToggle, onApply }: JobCardProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(job.saved_status);
  const [logoError, setLogoError] = useState(false);

  const platformKey = job.platform.toLowerCase() as keyof typeof PLATFORMS;
  const platformConfig = PLATFORMS[platformKey] || {
    name: job.platform,
    accentColor: "#6366F1",
    badgeBg: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
  };

  const handleSaveClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSaving(true);
    const nextSaved = !saved;
    setSaved(nextSaved);
    try {
      await onSaveToggle(job.id, saved);
    } catch {
      // Revert on failure
      setSaved(saved);
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyClick = () => {
    onApply(job);
    window.open(job.job_url, "_blank", "noopener,noreferrer");
  };

  // Match percentage styling
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
    <div className="group relative rounded-2xl border border-slate-800/90 bg-[#0B0F19]/90 hover:bg-[#0E1422] hover:border-slate-700/80 p-5 sm:p-6 transition-all duration-200 shadow-lg hover:shadow-xl hover:shadow-indigo-500/5 flex flex-col justify-between">
      {/* Top Header Row */}
      <div>
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-start gap-3.5">
            {/* Company Logo or Fallback Badge */}
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

            {/* Title & Company */}
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
                    <span className="text-emerald-400 font-medium flex items-center gap-0.5">
                      <DollarSign className="w-3 h-3 text-emerald-500" />
                      {job.salary}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action: Save Bookmark */}
          <button
            type="button"
            onClick={handleSaveClick}
            disabled={isSaving}
            aria-label={saved ? "Unsave job" : "Save job"}
            className={cn(
              "w-9 h-9 rounded-xl border flex items-center justify-center transition-all shrink-0",
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

        {/* Badges Row */}
        <div className="flex items-center flex-wrap gap-2 mb-3.5">
          {/* Platform Badge */}
          <span
            className={cn(
              "text-[11px] font-semibold px-2.5 py-0.5 rounded-full border flex items-center gap-1",
              platformConfig.badgeBg
            )}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: platformConfig.accentColor }}
            />
            {platformConfig.name}
          </span>

          {/* Job Type Badge */}
          <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full border border-slate-700/60 bg-slate-800/40 text-slate-300">
            {job.job_type || "Full-time"}
          </span>

          {/* Experience Level Badge */}
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
        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
          {job.description}
        </p>

        {/* Skills Tags */}
        {Array.isArray(job.tags) && job.tags.length > 0 && (
          <div className="flex items-center flex-wrap gap-1.5 mb-4">
            {job.tags.slice(0, 5).map((tag, i) => (
              <span
                key={i}
                className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-800/70 border border-slate-700/50 text-slate-300"
              >
                {tag}
              </span>
            ))}
            {job.tags.length > 5 && (
              <span className="text-[11px] text-slate-500 font-medium">
                +{job.tags.length - 5} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bottom Row: Match Percentage Progress Bar & Apply Now Button */}
      <div className="pt-3.5 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Match Percentage & Progress Bar */}
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

        {/* Apply Now Button */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleApplyClick}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 active:scale-[0.98] transition-all"
          >
            Apply Now
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
