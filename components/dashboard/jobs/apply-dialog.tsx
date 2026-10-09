"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { JobItem } from "@/lib/jobs/types";
import { detectJobPlatform } from "@/lib/automation/platform-detector";
import {
  X,
  ExternalLink,
  Sparkles,
  Bot,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Loader2,
  FileText,
  Clock,
  Video,
} from "lucide-react";
import { FillMissingFieldsDialog } from "./fill-missing-fields-dialog";
import { BrowserSessionVideoModal } from "./browser-session-video-modal";
import { cn } from "@/lib/utils";

interface ApplyDialogProps {
  job: JobItem | null;
  isOpen: boolean;
  onClose: () => void;
  onApplied?: (job: JobItem, mode: "manual" | "ai_agent") => void;
}

export function ApplyDialog({
  job,
  isOpen,
  onClose,
  onApplied,
}: ApplyDialogProps) {
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState<"manual" | "ai_agent" | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    status: string;
    authRequired?: boolean;
    loginUrl?: string;
    missingFields?: string[];
    applicationId?: string;
    sessionId?: string;
    sessionReplayUrl?: string;
    videoUrl?: string | null;
    screenshotUrl?: string | null;
    detectedCount?: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fillMissingOpen, setFillMissingOpen] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);

  if (!isOpen || !job) return null;

  const platformInfo = detectJobPlatform(job.job_url, job.platform);

  const isAuthRequired = Boolean(
    result &&
      (result.authRequired ||
        (result.status || "").toLowerCase().includes("auth") ||
        (result.status || "").toLowerCase().includes("login"))
  );

  const isMissing = Boolean(
    result &&
      !isAuthRequired &&
      ((result.status || "").toLowerCase().includes("missing") ||
        (result.missingFields && result.missingFields.length > 0))
  );

  const missingList =
    result?.missingFields && result.missingFields.length > 0
      ? result.missingFields
      : ["Phone Number", "LinkedIn URL"];

  const handleManualApply = async () => {
    setSelectedMode("manual");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/jobs/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: job.id,
          jobUrl: job.job_url,
          company: job.company,
          position: job.title,
          location: job.location,
          salaryRange: job.salary,
          matchScore: job.match_score,
          platform: job.platform,
          mode: "manual",
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to record application");
      }

      if (onApplied) onApplied(job, "manual");

      // Open job application URL in a new tab
      window.open(job.job_url, "_blank", "noopener,noreferrer");
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Error processing manual application");
    } finally {
      setLoading(false);
    }
  };

  const handleAutoApply = async () => {
    setSelectedMode("ai_agent");
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/jobs/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: job.id,
          jobUrl: job.job_url,
          company: job.company,
          position: job.title,
          location: job.location,
          salaryRange: job.salary,
          matchScore: job.match_score,
          platform: job.platform,
          mode: "ai_agent",
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to execute AI application agent");
      }

      setResult({
        status: data.status,
        authRequired: data.authRequired,
        loginUrl: data.loginUrl,
        missingFields: data.missingFields || [],
        applicationId: data.applicationId,
        sessionId: data.applicationId,
        sessionReplayUrl: data.videoUrl,
        videoUrl: data.videoUrl,
        screenshotUrl: data.screenshotUrl,
        detectedCount: data.detectedFieldsCount || 0,
      });

      // Automatically open video & proof screenshot / auth modal
      if (data.applicationId || data.videoUrl || data.screenshotUrl || data.authRequired) {
        setVideoModalOpen(true);
      }

      if (onApplied) onApplied(job, "ai_agent");
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to execute AI application agent");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-indigo-950/60 text-white max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow */}
        <div className="absolute top-0 right-1/3 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
                Application Method
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                {platformInfo.displayName}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Apply for {job.title}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {job.company} • {job.location} {job.salary ? `• ${job.salary}` : ""}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="my-4 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* AI Agent Result Panel: Missing Profile Info or Success */}
        {result ? (
          <div className="my-5 space-y-4">
            {isAuthRequired ? (
              <div className="p-5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 space-y-3">
                <div className="flex items-center gap-2 font-bold text-sm text-amber-300">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                  <span>Authentication Required on {platformInfo.displayName}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Login is required to continue your application on this website. Your application progress has been paused at this checkpoint.
                </p>
                <div className="pt-2 flex items-center flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => setVideoModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer shadow-lg shadow-amber-500/20"
                  >
                    <span>Continue to Login & Resume</span>
                    <ArrowRight className="w-4 h-4 text-slate-950" />
                  </button>
                  <a
                    href={result.loginUrl || job.job_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 transition-colors"
                  >
                    <span>Open Portal Directly</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ) : isMissing ? (
              <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-3">
                <div className="flex items-center gap-2 font-bold text-sm text-amber-300">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                  <span>Missing Profile Information Required</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Our Browserbase agent detected the application form for <strong className="text-white">{platformInfo.displayName}</strong>, but the following required information is missing from your profile:
                </p>
                <div className="flex flex-wrap gap-1.5 py-1">
                  {missingList.map((field, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold"
                    >
                      ★ {field}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-slate-400">
                  Enter this missing information now. It will be saved directly to your profile database and used to submit your application.
                </p>
                <div className="pt-2 flex items-center flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => setFillMissingOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer shadow-lg shadow-amber-500/20"
                  >
                    <Sparkles className="w-4 h-4 text-slate-950" />
                    <span>Fill Missing Data</span>
                  </button>
                  {result.sessionId && (
                    <button
                      type="button"
                      onClick={() => setVideoModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-indigo-300 border border-slate-700 transition-colors cursor-pointer"
                    >
                      <Video className="w-4 h-4 text-indigo-400" />
                      <span>Watch Browser Session</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      router.push(
                        `/dashboard/profile?applicationId=${result.applicationId}&missing=${encodeURIComponent(
                          missingList.join(",")
                        )}`
                      );
                    }}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
                  >
                    Edit in Full Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      router.push("/dashboard/application-status");
                    }}
                    className="text-xs text-slate-400 hover:text-white transition-colors ml-auto"
                  >
                    View in Pipeline →
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 space-y-3.5">
                <div className="flex items-center gap-2 font-bold text-sm text-emerald-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>AI Agent Applied Successfully!</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  The AI Agent navigated directly to <strong className="text-white">{platformInfo.displayName}</strong>, mapped your profile information, attached your resume, submitted the official job application, and recorded the full video session and proof screenshot.
                </p>

                {/* Screenshot preview thumbnail if available */}
                {result.screenshotUrl && (
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={result.screenshotUrl}
                        alt="Applied Screenshot Proof"
                        className="w-16 h-10 object-cover rounded-lg border border-slate-700/80 shrink-0 cursor-pointer"
                        onClick={() => setVideoModalOpen(true)}
                      />
                      <div>
                        <div className="text-xs font-semibold text-white flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Proof Screenshot Captured</span>
                        </div>
                        <span className="text-[11px] text-slate-400">Click to view high-res screenshot</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setVideoModalOpen(true)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-emerald-300 border border-emerald-500/30 transition-colors cursor-pointer"
                    >
                      View Proof
                    </button>
                  </div>
                )}

                <div className="pt-2 flex items-center flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => setVideoModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors cursor-pointer shadow-lg shadow-indigo-600/25"
                  >
                    <Video className="w-4 h-4" />
                    <span>Watch Application Video</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      router.push("/dashboard/application-status");
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors cursor-pointer shadow-lg shadow-emerald-600/20"
                  >
                    <span>View Application Tracker</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Selection Options */
          <div className="my-5 space-y-3.5">
            {/* 1. Apply Manually Card */}
            <div
              onClick={!loading ? handleManualApply : undefined}
              className={cn(
                "group relative p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer",
                selectedMode === "manual" && loading
                  ? "bg-slate-800/90 border-indigo-500/80 ring-1 ring-indigo-500/50"
                  : "bg-slate-800/40 hover:bg-slate-800/70 border-slate-800 hover:border-slate-700"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                    <ExternalLink className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors flex items-center gap-2">
                      <span>1. Apply Manually</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Opens the official job application URL directly in a new tab so you can review and fill out the company form yourself.
                    </p>
                    <div className="flex items-center gap-2 mt-2.5 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-blue-400" />
                        Direct portal navigation
                      </span>
                      <span>•</span>
                      <span>Recorded on pipeline</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 self-center">
                  {selectedMode === "manual" && loading ? (
                    <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                  ) : (
                    <span className="px-3 py-1.5 rounded-xl bg-slate-800 group-hover:bg-blue-600 group-hover:text-white border border-slate-700 text-xs font-semibold text-slate-300 transition-colors">
                      Open URL →
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Apply Automatically using AI Agent Card */}
            <div
              onClick={!loading ? handleAutoApply : undefined}
              className={cn(
                "group relative p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer overflow-hidden",
                selectedMode === "ai_agent" && loading
                  ? "bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/50"
                  : "bg-gradient-to-br from-indigo-950/30 via-slate-900/60 to-purple-950/20 border-indigo-500/30 hover:border-indigo-500/60 hover:shadow-lg hover:shadow-indigo-500/10"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 flex items-center justify-center shrink-0 shadow-inner">
                    <Bot className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        <span>2. Apply Automatically using AI Agent</span>
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300">
                        Browserbase + Stagehand
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      Launches an AI cloud browser session to detect form fields on <strong className="text-white">{platformInfo.displayName}</strong>, map your saved profile data, attach your resume, and submit.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2.5 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                        Detects required fields
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3 text-indigo-400 shrink-0" />
                        Attaches uploaded resume
                      </span>
                      <span className="flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-amber-400 shrink-0" />
                        Alerts if profile info missing
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-purple-400 shrink-0" />
                        Saves Browserbase session replay
                      </span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 self-center">
                  {selectedMode === "ai_agent" && loading ? (
                    <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="hidden sm:inline">Detecting...</span>
                    </div>
                  ) : (
                    <span className="px-3.5 py-1.5 rounded-xl bg-indigo-600 group-hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all">
                      Auto-Apply ✨
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Platform: {platformInfo.displayName}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer font-medium"
          >
            Close
          </button>
        </div>
      </div>

      {/* Fill Missing Fields Modal Dialog */}
      {result?.applicationId && (
        <FillMissingFieldsDialog
          isOpen={fillMissingOpen}
          onClose={() => setFillMissingOpen(false)}
          applicationId={result.applicationId}
          jobTitle={job.title}
          companyName={job.company}
          missingFields={missingList}
          onSuccess={(data) => {
            setResult((prev) =>
              prev
                ? {
                    ...prev,
                    status: data.status || "Auto-Applied",
                    sessionId: data.sessionId || prev.sessionId,
                    sessionReplayUrl: data.sessionReplayUrl || prev.sessionReplayUrl,
                    missingFields: [],
                  }
                : null
            );
            setFillMissingOpen(false);
          }}
        />
      )}

      {/* Browser Session Video Player Modal */}
      {(result?.sessionId || result?.applicationId) && (
        <BrowserSessionVideoModal
          isOpen={videoModalOpen}
          onClose={() => setVideoModalOpen(false)}
          sessionId={result.sessionId || result.applicationId || ""}
          applicationId={result.applicationId}
          initialVideoUrl={result.videoUrl}
          initialScreenshotUrl={result.screenshotUrl}
          jobTitle={job.title}
          companyName={job.company}
          jobUrl={job.job_url}
          status={result.status}
          onFillMissing={() => {
            setFillMissingOpen(true);
          }}
        />
      )}
    </div>
  );
}
