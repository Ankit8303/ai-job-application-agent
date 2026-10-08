"use client";

import { JobItem } from "@/lib/jobs/types";
import {
  Clock,
  Bookmark,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  ArrowRight,
} from "lucide-react";

interface RecentActivityCardProps {
  jobs: JobItem[];
  onFilterSaved: () => void;
  savedFilterActive: boolean;
}

export function RecentActivityCard({
  jobs,
  onFilterSaved,
  savedFilterActive,
}: RecentActivityCardProps) {
  const savedJobs = jobs.filter((j) => j.saved_status);
  const appliedJobs = jobs.filter((j) => j.applied_status === "applied");

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-[#0B0F19]/90 p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-400" />
          Recent Activity
        </h3>
        <span className="text-[11px] text-slate-500 font-mono">Live Sync</span>
      </div>

      {/* Summary Chips */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          type="button"
          onClick={onFilterSaved}
          className={`p-2.5 rounded-xl border text-left transition-all ${
            savedFilterActive
              ? "bg-amber-500/10 border-amber-500/30 text-amber-300 ring-1 ring-amber-500/30"
              : "bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/70 text-slate-300"
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold mb-0.5">
            <Bookmark className="w-3.5 h-3.5 text-amber-400" />
            <span>Saved</span>
          </div>
          <span className="text-lg font-bold text-white block">
            {savedJobs.length}
          </span>
          <span className="text-[10px] text-slate-400 block truncate">
            {savedFilterActive ? "Active filter" : "Click to view"}
          </span>
        </button>

        <div className="p-2.5 rounded-xl border border-slate-700/50 bg-slate-800/40 text-left">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 mb-0.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Applied</span>
          </div>
          <span className="text-lg font-bold text-white block">
            {appliedJobs.length}
          </span>
          <span className="text-[10px] text-slate-400 block truncate">
            Tracked in DB
          </span>
        </div>
      </div>

      {/* Activity Timeline List */}
      <div className="space-y-3">
        {savedJobs.length === 0 && appliedJobs.length === 0 ? (
          <div className="p-3 rounded-xl bg-slate-800/20 border border-slate-800 text-center">
            <p className="text-xs text-slate-400">
              No recent activity yet.
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Save jobs or click Apply Now to track them here.
            </p>
          </div>
        ) : (
          <>
            {savedJobs.slice(0, 3).map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs hover:border-slate-700 transition-colors"
              >
                <div className="min-w-0 pr-2">
                  <p className="font-medium text-slate-200 truncate">
                    {job.title}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {job.company} • {job.platform}
                  </p>
                </div>
                <a
                  href={job.job_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </>
        )}
      </div>

      {savedJobs.length > 0 && (
        <button
          type="button"
          onClick={onFilterSaved}
          className="w-full mt-3.5 py-2 px-3 rounded-xl border border-slate-700/60 bg-slate-800/40 hover:bg-slate-800 text-xs text-slate-300 font-medium flex items-center justify-center gap-1.5 transition-colors"
        >
          <span>{savedFilterActive ? "Show All Jobs" : `View All ${savedJobs.length} Saved Jobs`}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
