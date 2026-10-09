"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Bot,
  Globe,
  Trash2,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  FileText,
  Search,
  Filter,
  Eye,
  X,
  Sparkles,
  Layers,
  ChevronRight,
  Terminal,
  Video,
  KeyRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FillMissingFieldsDialog } from "./jobs/fill-missing-fields-dialog";
import { BrowserSessionVideoModal } from "./jobs/browser-session-video-modal";

export interface ApplicationRecord {
  id: string;
  user_id: string;
  company_name: string;
  position: string;
  location: string | null;
  salary_range: string | null;
  match_score: number | null;
  status: string;
  workflow_state?: string | null;
  auth_status?: string | null;
  apply_mode?: string | null;
  platform?: string | null;
  job_url: string | null;
  browserbase_session_id?: string | null;
  session_replay_url?: string | null;
  screenshot_url?: string | null;
  video_url?: string | null;
  detected_fields?: any[] | null;
  missing_fields?: string[] | null;
  submission_logs?: any[] | null;
  applied_at?: string | null;
  created_at: string;
  updated_at?: string | null;
}

interface ApplicationStatusViewProps {
  initialApplications: ApplicationRecord[];
  userId: string;
}

export function ApplicationStatusView({
  initialApplications,
  userId,
}: ApplicationStatusViewProps) {
  const router = useRouter();
  const supabase = createClient();

  const [applications, setApplications] = useState<ApplicationRecord[]>(initialApplications);
  const [filterTab, setFilterTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [inspectingLogsApp, setInspectingLogsApp] = useState<ApplicationRecord | null>(null);
  const [inspectingFieldsApp, setInspectingFieldsApp] = useState<ApplicationRecord | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [fillDialogApp, setFillDialogApp] = useState<ApplicationRecord | null>(null);
  const [videoModalApp, setVideoModalApp] = useState<ApplicationRecord | null>(null);

  // Counters
  const totalCount = applications.length;
  const appliedCount = applications.filter((a) =>
    ["applied", "auto-applied"].includes((a.status || "").toLowerCase())
  ).length;
  const inProgressCount = applications.filter((a) =>
    ["submitting", "detecting fields", "pending", "ready to apply"].includes(
      (a.status || "").toLowerCase()
    )
  ).length;
  const missingInfoCount = applications.filter((a) =>
    (a.status || "").toLowerCase().includes("missing")
  ).length;
  const manualCount = applications.filter(
    (a) => (a.apply_mode || "").toLowerCase() === "manual"
  ).length;

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this application record?")) return;

    const { error } = await supabase.from("job_applications").delete().eq("id", id);
    if (!error) {
      setApplications((prev) => prev.filter((a) => a.id !== id));
    }
  };

  const handleRetryContinue = async (app: ApplicationRecord) => {
    setRetryingId(app.id);
    try {
      const res = await fetch("/api/jobs/apply/continue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: app.id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setApplications((prev) =>
          prev.map((a) =>
            a.id === app.id
              ? {
                  ...a,
                  status: data.status || "Auto-Applied",
                  browserbase_session_id: data.sessionId || a.browserbase_session_id,
                  session_replay_url: data.sessionReplayUrl || a.session_replay_url,
                }
              : a
          )
        );
      } else if (data.status === "Missing Profile Info") {
        setFillDialogApp({
          ...app,
          missing_fields: data.missingFields || app.missing_fields,
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRetryingId(null);
    }
  };

  const filteredApps = applications.filter((app) => {
    // Tab filter
    const s = (app.status || "").toLowerCase();
    const mode = (app.apply_mode || "").toLowerCase();

    if (filterTab === "applied" && !["applied", "auto-applied"].includes(s)) return false;
    if (filterTab === "in_progress" && !["submitting", "detecting fields", "pending", "ready to apply"].includes(s)) return false;
    if (filterTab === "missing" && !s.includes("missing")) return false;
    if (filterTab === "manual" && mode !== "manual") return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchComp = app.company_name.toLowerCase().includes(q);
      const matchPos = app.position.toLowerCase().includes(q);
      const matchPlat = (app.platform || "").toLowerCase().includes(q);
      if (!matchComp && !matchPos && !matchPlat) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="relative rounded-3xl border border-slate-800/80 bg-gradient-to-br from-indigo-950/40 via-slate-900/60 to-purple-950/20 p-6 sm:p-8 overflow-hidden shadow-2xl backdrop-blur-md">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3">
              <Bot className="w-3.5 h-3.5" />
              <span>Browserbase + Stagehand Execution Engine</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Application Pipeline Tracker
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
              Track live job applications submitted by your autonomous AI agent or completed manually. Inspect Browserbase cloud sessions, verified form field mappings, and submission timestamps.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/dashboard/jobs"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/25 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Scout More Roles</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
          <span className="text-xs text-slate-400 font-medium">Total Tracked</span>
          <p className="text-2xl font-black text-white mt-1">{totalCount}</p>
          <span className="text-[11px] text-slate-500">All submissions & attempts</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-emerald-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-400 font-semibold">Applied</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-300 mt-1">{appliedCount}</p>
          <span className="text-[11px] text-emerald-400/70">Submitted to employers</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-amber-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-400 font-semibold">Needs Profile Info</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-300 mt-1">{missingInfoCount}</p>
          <span className="text-[11px] text-amber-400/70">Action required to resume</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-indigo-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs text-indigo-400 font-semibold">In Progress</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-black text-indigo-300 mt-1">{inProgressCount}</p>
          <span className="text-[11px] text-indigo-400/70">Detecting / Submitting</span>
        </div>
      </div>

      {/* 3. Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl border border-slate-800/80 bg-slate-900/50">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: "all", label: "All", count: totalCount },
            { id: "applied", label: "Applied", count: appliedCount },
            { id: "missing", label: "Missing Info", count: missingInfoCount },
            { id: "in_progress", label: "In Progress", count: inProgressCount },
            { id: "manual", label: "Manual", count: manualCount },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterTab(tab.id)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5",
                filterTab === tab.id
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <span>{tab.label}</span>
              <span className="px-1.5 py-0.2 rounded bg-slate-900/80 text-[10px] font-mono">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search company or role..."
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* 4. Applications List */}
      {filteredApps.length === 0 ? (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-12 text-center flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mb-4 text-slate-400">
            <Clock className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-white">No applications in this view</h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-sm mt-1 mb-6">
            When you select &quot;Open Job URL to Apply&quot; and choose manual or AI Agent mode, your applications will appear here with live session inspection.
          </p>
          <Link
            href="/dashboard/jobs"
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors"
          >
            Find Live Job Openings
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApps.map((app) => {
            const statusLower = (app.status || "").toLowerCase();
            const isAuthRequired =
              statusLower === "auth_required" ||
              statusLower.includes("auth") ||
              statusLower.includes("login") ||
              app.workflow_state === "AUTH_REQUIRED" ||
              app.workflow_state === "WAITING_FOR_USER_LOGIN";
            const isApplied = ["applied", "auto-applied"].includes(statusLower);
            const isMissing = !isAuthRequired && statusLower.includes("missing");
            const isInProgress = !isAuthRequired && ["submitting", "detecting fields", "pending", "ready to apply"].includes(statusLower);
            const isAiMode = (app.apply_mode || "").toLowerCase() === "ai_agent";

            const detectedCount = Array.isArray(app.detected_fields) ? app.detected_fields.length : 0;
            const missingList = Array.isArray(app.missing_fields) ? app.missing_fields : [];
            const logsCount = Array.isArray(app.submission_logs) ? app.submission_logs.length : 0;

            return (
              <div
                key={app.id}
                className={cn(
                  "p-5 rounded-2xl border transition-all duration-200 bg-[#0B0F19]/95 flex flex-col justify-between gap-4 shadow-lg",
                  isAuthRequired
                    ? "border-amber-500/40 hover:border-amber-500/70"
                    : isMissing
                    ? "border-amber-500/40 hover:border-amber-500/70"
                    : isApplied
                    ? "border-emerald-500/30 hover:border-emerald-500/60"
                    : "border-slate-800/90 hover:border-slate-700"
                )}
              >
                {/* Header Row: Company, Role, Badges, Actions */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-bold text-white">
                        {app.position}
                      </h3>
                      <span className="text-slate-400 font-medium text-xs sm:text-sm">
                        @ {app.company_name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                      {app.location && <span>{app.location}</span>}
                      {app.salary_range && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-400">{app.salary_range}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>
                        Recorded: {new Date(app.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                  </div>

                  {/* Status & Mode Badges */}
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {/* Mode */}
                    <span
                      className={cn(
                        "text-[11px] font-semibold px-2.5 py-0.5 rounded-full border flex items-center gap-1",
                        isAiMode
                          ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-300"
                          : "bg-blue-500/15 border-blue-500/30 text-blue-300"
                      )}
                    >
                      {isAiMode ? <Bot className="w-3 h-3 text-indigo-400" /> : <Globe className="w-3 h-3 text-blue-400" />}
                      <span>{isAiMode ? "AI Agent ✨" : "Manual 🌐"}</span>
                    </span>

                    {/* Platform */}
                    {app.platform && (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                        {app.platform}
                      </span>
                    )}

                    {/* Status Badge */}
                    <span
                      className={cn(
                        "text-xs font-bold px-3 py-1 rounded-full border flex items-center gap-1.5",
                        isAuthRequired
                          ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                          : isApplied
                          ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                          : isMissing
                          ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                          : isInProgress
                          ? "bg-purple-500/15 border-purple-500/30 text-purple-300"
                          : "bg-slate-800 border-slate-700 text-slate-300"
                      )}
                    >
                      {isAuthRequired && <KeyRound className="w-3.5 h-3.5 text-amber-400" />}
                      {!isAuthRequired && isApplied && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                      {!isAuthRequired && isMissing && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                      {!isAuthRequired && isInProgress && (
                        <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                      )}
                      <span>{isAuthRequired ? "Login Required" : app.status}</span>
                    </span>
                  </div>
                </div>

                {/* Details Section: Missing Info / Browserbase Session / Logs */}
                <div className="pt-3 border-t border-slate-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  {/* Left: Info items */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Browserbase Session ID Badge */}
                    {app.browserbase_session_id && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-slate-400">
                        <Terminal className="w-3 h-3 text-indigo-400" />
                        <span>Session: {app.browserbase_session_id.slice(0, 14)}...</span>
                        <button
                          type="button"
                          onClick={() => setVideoModalApp(app)}
                          className="text-indigo-400 hover:text-indigo-300 font-semibold ml-1 flex items-center gap-1 hover:underline cursor-pointer"
                          title="Watch Browser Automation Video & Recording"
                        >
                          <Video className="w-3 h-3 text-indigo-400" />
                          <span>Watch Video</span>
                        </button>
                      </div>
                    )}

                    {/* Detected fields count */}
                    {detectedCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setInspectingFieldsApp(app)}
                        className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 transition-colors cursor-pointer"
                      >
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        <span>{detectedCount} Form Fields</span>
                      </button>
                    )}

                    {/* Submission logs */}
                    {logsCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setInspectingLogsApp(app)}
                        className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 transition-colors cursor-pointer"
                      >
                        <FileText className="w-3 h-3 text-indigo-400" />
                        <span>{logsCount} Logs</span>
                      </button>
                    )}

                    {/* Missing Fields List */}
                    {isMissing && missingList.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] text-amber-400 font-semibold">Missing:</span>
                        {missingList.map((m, mIdx) => (
                          <span
                            key={mIdx}
                            className="text-[11px] px-2 py-0.2 rounded bg-amber-500/20 text-amber-300 font-medium border border-amber-500/30"
                          >
                            ★ {m}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {/* Action button based on status */}
                    {isAuthRequired ? (
                      <button
                        type="button"
                        onClick={() => setVideoModalApp(app)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer shadow-md shadow-amber-500/20"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Login & Resume</span>
                      </button>
                    ) : isMissing ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setFillDialogApp(app)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer shadow-md shadow-amber-500/20"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                          <span>Fill Missing Info</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            router.push(
                              `/dashboard/profile?applicationId=${app.id}&missing=${encodeURIComponent(
                                missingList.join(",")
                              )}`
                            );
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs transition-colors cursor-pointer"
                          title="Edit in full profile"
                        >
                          Profile
                        </button>
                      </div>
                    ) : isInProgress ? (
                      <button
                        type="button"
                        onClick={() => handleRetryContinue(app)}
                        disabled={retryingId === app.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors cursor-pointer"
                      >
                        <RefreshCw className={cn("w-3.5 h-3.5", retryingId === app.id && "animate-spin")} />
                        <span>Resume Submission</span>
                      </button>
                    ) : null}

                    {(app.browserbase_session_id || app.video_url || app.screenshot_url || isAiMode) && (
                      <button
                        type="button"
                        onClick={() => setVideoModalApp(app)}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                          isInProgress
                            ? "bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 animate-pulse shadow-md shadow-rose-500/20"
                            : "bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 text-indigo-300"
                        )}
                        title={isInProgress ? "Watch Live Application Progress" : "Watch Application Video & Proof Screenshot"}
                      >
                        {isInProgress ? (
                          <>
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                            <span>Applying...</span>
                          </>
                        ) : (
                          <>
                            <Video className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Watch Video</span>
                          </>
                        )}
                      </button>
                    )}

                    {app.job_url && (
                      <a
                        href={app.job_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition-colors"
                        title="Open employer job URL"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDelete(app.id)}
                      className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-800 transition-colors cursor-pointer"
                      title="Remove application"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Logs Drawer Modal */}
      {inspectingLogsApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-white max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-indigo-400" />
                  <span>Browserbase Execution Logs</span>
                </h3>
                <p className="text-xs text-slate-400">
                  {inspectingLogsApp.position} @ {inspectingLogsApp.company_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectingLogsApp(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-2">
              {Array.isArray(inspectingLogsApp.submission_logs) && inspectingLogsApp.submission_logs.length > 0 ? (
                inspectingLogsApp.submission_logs.map((log, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs font-mono flex items-start gap-2.5"
                  >
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full mt-1.5 shrink-0",
                        log.status === "success"
                          ? "bg-emerald-400"
                          : log.status === "warn"
                          ? "bg-amber-400"
                          : log.status === "error"
                          ? "bg-rose-400"
                          : "bg-indigo-400"
                      )}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                        <span className="uppercase font-bold tracking-wider">{log.step}</span>
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-slate-300 leading-relaxed">{log.message}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">No logs recorded for this application.</p>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectingLogsApp(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detected Fields Modal */}
      {inspectingFieldsApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-white max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Detected Application Form Fields</span>
                </h3>
                <p className="text-xs text-slate-400">
                  {inspectingFieldsApp.position} @ {inspectingFieldsApp.company_name} ({inspectingFieldsApp.platform || "Direct ATS"})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectingFieldsApp(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-2">
              {Array.isArray(inspectingFieldsApp.detected_fields) && inspectingFieldsApp.detected_fields.length > 0 ? (
                inspectingFieldsApp.detected_fields.map((f, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{f.label || f.name}</span>
                        {f.required && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Required
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">
                        field: {f.name} • type: {f.type}
                      </span>
                    </div>

                    {f.mappedProfileKey && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                        Mapped: {f.mappedProfileKey}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">No fields recorded.</p>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectingFieldsApp(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fill Missing Fields Dialog Modal */}
      {fillDialogApp && (
        <FillMissingFieldsDialog
          isOpen={Boolean(fillDialogApp)}
          onClose={() => setFillDialogApp(null)}
          applicationId={fillDialogApp.id}
          jobTitle={fillDialogApp.position}
          companyName={fillDialogApp.company_name}
          missingFields={
            Array.isArray(fillDialogApp.missing_fields) && fillDialogApp.missing_fields.length > 0
              ? fillDialogApp.missing_fields
              : ["Phone Number", "LinkedIn URL"]
          }
          onSuccess={(data) => {
            setApplications((prev) =>
              prev.map((a) =>
                a.id === fillDialogApp.id
                  ? {
                      ...a,
                      status: data.status || "Auto-Applied",
                      browserbase_session_id: data.sessionId || a.browserbase_session_id,
                      session_replay_url: data.sessionReplayUrl || a.session_replay_url,
                      missing_fields: [],
                    }
                  : a
              )
            );
            setFillDialogApp(null);
          }}
        />
      )}

      {/* Browser Session Video Player Modal */}
      {videoModalApp && (
        <BrowserSessionVideoModal
          isOpen={Boolean(videoModalApp)}
          onClose={() => setVideoModalApp(null)}
          sessionId={videoModalApp.browserbase_session_id || videoModalApp.id}
          applicationId={videoModalApp.id}
          initialVideoUrl={videoModalApp.video_url}
          initialScreenshotUrl={videoModalApp.screenshot_url}
          initialLiveUrl={videoModalApp.session_replay_url}
          jobTitle={videoModalApp.position}
          companyName={videoModalApp.company_name}
          jobUrl={videoModalApp.job_url || ""}
          status={videoModalApp.status}
          logs={videoModalApp.submission_logs || []}
          onResumed={() => {
            router.refresh();
          }}
          onFillMissing={() => {
            const app = videoModalApp;
            setVideoModalApp(null);
            setFillDialogApp(app);
          }}
        />
      )}
    </div>
  );
}
