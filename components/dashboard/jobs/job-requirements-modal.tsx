"use client";

import { JobItem } from "@/lib/jobs/types";
import { formatRelativeTime } from "./job-card";
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Briefcase,
  GraduationCap,
  Sparkles,
  ExternalLink,
  Target,
  Layers,
  Clock,
} from "lucide-react";

interface JobRequirementsModalProps {
  job: JobItem | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenApply?: () => void;
}

export function JobRequirementsModal({
  job,
  isOpen,
  onClose,
  onOpenApply,
}: JobRequirementsModalProps) {
  if (!isOpen || !job) return null;

  const reqs = job.requirements;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-indigo-950/50 text-white max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow */}
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800/80">
          <div>
            <div className="flex items-center flex-wrap gap-2 mb-1.5">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Company Hiring Profile
              </span>
              <span className="text-xs text-slate-400">
                {job.company} • {job.location}
              </span>
              {job.posted_at && (
                <span
                  className="inline-flex items-center gap-1.5 text-[11px] text-indigo-300 font-medium bg-slate-800/90 px-2.5 py-0.5 rounded-full border border-slate-700/60"
                  title={formatRelativeTime(job.posted_at).fullDate}
                >
                  <Clock className="w-3 h-3 text-indigo-400" />
                  <span>{formatRelativeTime(job.posted_at).text}</span>
                  <span className="text-slate-400 font-normal">
                    • {formatRelativeTime(job.posted_at).fullDate.replace(/^Posted on /, "")}
                  </span>
                </span>
              )}
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {job.title}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Match Compatibility Highlight Banner */}
        <div className="my-5 p-4 rounded-2xl bg-slate-800/40 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-extrabold text-xl">
              {job.match_score}%
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                AI Match Assessment
              </h4>
              <p className="text-xs text-slate-400">
                Strong alignment based on technical requirements and scope.
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold text-emerald-400 block">
              High Fit
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              {job.salary || "Competitive"}
            </span>
          </div>
        </div>

        {/* 1. Skill Highlights (Matched vs In-Demand) */}
        <div className="space-y-4 mb-6">
          <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30">
            <div className="flex items-center gap-2 mb-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Your Matching Skills (Already on your profile)
              </h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {reqs?.matched_skills && reqs.matched_skills.length > 0 ? (
                reqs.matched_skills.map((skill, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold"
                  >
                    ✓ {skill}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400">Core software stack</span>
              )}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30">
            <div className="flex items-center gap-2 mb-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                In-Demand Skills Requested (Consider Highlighting)
              </h4>
            </div>
            <p className="text-xs text-slate-300 mb-2.5">
              The company specifically asks for these competencies in their job description:
            </p>
            <div className="flex flex-wrap gap-2">
              {reqs?.missing_skills && reqs.missing_skills.length > 0 ? (
                reqs.missing_skills.map((skill, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-medium"
                  >
                    ★ {skill}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400">Standard engineering qualifications</span>
              )}
            </div>
          </div>
        </div>

        {/* 2. Core Requirements (Experience & Education) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6">
          <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-800">
            <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium mb-1.5">
              <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
              Experience Level Required
            </span>
            <p className="text-xs font-semibold text-white leading-relaxed">
              {reqs?.experience_required || "2-5+ years in related software development"}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-800">
            <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium mb-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-blue-400" />
              Education & Credentials
            </span>
            <p className="text-xs font-semibold text-white leading-relaxed">
              {reqs?.education || "BS/MS in Computer Science, STEM, or equivalent experience"}
            </p>
          </div>
        </div>

        {/* 3. Key Responsibilities */}
        {reqs?.key_responsibilities && reqs.key_responsibilities.length > 0 && (
          <div className="mb-6 p-4 rounded-2xl bg-slate-800/30 border border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-indigo-400" />
              What You Will Do
            </h4>
            <ul className="space-y-2">
              {reqs.key_responsibilities.map((resp, i) => (
                <li key={i} className="text-xs text-slate-300 flex items-start gap-2 leading-relaxed">
                  <span className="text-indigo-400 font-bold">•</span>
                  <span>{resp}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 4. Why You Match AI Brief */}
        {reqs?.why_you_match && reqs.why_you_match.length > 0 && (
          <div className="mb-6 p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/20">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-2 mb-2.5">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Why You Stand Out
            </h4>
            <ul className="space-y-1.5">
              {reqs.why_you_match.map((reason, i) => (
                <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors cursor-pointer text-center"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            <a
              href={`https://www.google.com/search?q=${encodeURIComponent(job.company + " " + job.title + " official career opening apply")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 transition-all cursor-pointer"
              title="Search company website for this exact role"
            >
              <span>Verify on Web</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>

            {onOpenApply ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenApply();
                }}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all shadow-lg shadow-indigo-600/25 cursor-pointer"
              >
                <span>Open Job URL to Apply</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            ) : (
              <a
                href={job.job_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all shadow-lg shadow-indigo-600/25 cursor-pointer"
              >
                <span>Apply on Exact Job Page</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
