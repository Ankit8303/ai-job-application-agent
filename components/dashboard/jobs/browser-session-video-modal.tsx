"use client";

import { useState, useEffect } from "react";
import {
  X,
  Play,
  Video,
  ExternalLink,
  Download,
  RefreshCw,
  Sparkles,
  Bot,
  Maximize2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Radio,
  FileText,
  Image as ImageIcon,
  Terminal,
  ShieldCheck,
  ChevronRight,
  ZoomIn,
  KeyRound,
  LogIn,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BrowserSessionVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId?: string;
  applicationId?: string;
  initialLiveUrl?: string | null;
  initialVideoUrl?: string | null;
  initialScreenshotUrl?: string | null;
  jobTitle?: string;
  companyName?: string;
  jobUrl?: string;
  status?: string;
  logs?: any[];
  onFillMissing?: (missingFields: string[]) => void;
  onResumed?: () => void;
}

export function BrowserSessionVideoModal({
  isOpen,
  onClose,
  sessionId = "",
  applicationId,
  initialLiveUrl,
  initialVideoUrl,
  initialScreenshotUrl,
  jobTitle = "Software Engineer",
  companyName = "Employer",
  jobUrl = "",
  status = "In Progress",
  logs = [],
  onFillMissing,
  onResumed,
}: BrowserSessionVideoModalProps) {
  const [activeTab, setActiveTab] = useState<"video" | "screenshot" | "logs">("video");
  const [loading, setLoading] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [interactiveLoggingIn, setInteractiveLoggingIn] = useState(false);
  const [loginFeedback, setLoginFeedback] = useState<string | null>(null);

  const [videoUrl, setVideoUrl] = useState<string | null>(
    initialVideoUrl ||
      (applicationId
        ? `/recordings/${applicationId}-video.webm`
        : sessionId
        ? `/api/jobs/apply/session-video?sessionId=${encodeURIComponent(sessionId)}&stream=true`
        : null)
  );
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(
    initialScreenshotUrl || (applicationId ? `/recordings/${applicationId}-applied.png` : null)
  );
  const [sessionStatus, setSessionStatus] = useState<string>(status);
  const [workflowState, setWorkflowState] = useState<string>("");
  const [loginUrl, setLoginUrl] = useState<string | null>(null);
  const [sessionLogs, setSessionLogs] = useState<any[]>(logs);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [screenshotZoom, setScreenshotZoom] = useState(false);

  // Poll application status to update video, screenshot, and logs
  const fetchStatus = async () => {
    if (!applicationId && !sessionId) return;
    setLoading(true);
    try {
      if (applicationId) {
        const res = await fetch(`/api/jobs/apply/status?applicationId=${encodeURIComponent(applicationId)}`);
        const data = await res.json();
        if (res.ok && data) {
          if (data.status) setSessionStatus(data.status);
          if (data.workflowState) setWorkflowState(data.workflowState);
          if (data.videoUrl) setVideoUrl(data.videoUrl);
          if (data.screenshotUrl) setScreenshotUrl(data.screenshotUrl);
          if (Array.isArray(data.logs) && data.logs.length > 0) setSessionLogs(data.logs);
        }
      } else if (sessionId) {
        const res = await fetch(`/api/jobs/apply/session-video?sessionId=${encodeURIComponent(sessionId)}`);
        const data = await res.json();
        if (res.ok && data) {
          if (data.videoUrl) setVideoUrl(data.videoUrl);
          if (data.screenshotUrl) setScreenshotUrl(data.screenshotUrl);
          if (data.status) setSessionStatus(data.status);
        }
      }
    } catch (err) {
      console.error("Error polling application media:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      const interval = setInterval(() => {
        fetchStatus();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen, applicationId, sessionId]);

  if (!isOpen) return null;

  const isAuthRequired =
    sessionStatus === "AUTH_REQUIRED" ||
    workflowState === "AUTH_REQUIRED" ||
    workflowState === "WAITING_FOR_USER_LOGIN" ||
    workflowState === "REAUTHENTICATION_REQUIRED" ||
    (sessionStatus || "").toLowerCase().includes("auth");

  const isReviewRequired =
    sessionStatus === "AWAITING_USER_REVIEW" || workflowState === "AWAITING_USER_REVIEW";

  const isRunning =
    !isAuthRequired &&
    !isReviewRequired &&
    ["submitting", "detecting fields", "pending", "navigating", "checking_auth", "filling_form"].includes(
      (sessionStatus || "").toLowerCase()
    );

  const isComplete =
    ["applied", "auto-applied"].includes((sessionStatus || "").toLowerCase()) || Boolean(videoUrl);

  // Human-in-the-loop interactive login trigger
  const handleLaunchLogin = async () => {
    if (!applicationId) return;
    setInteractiveLoggingIn(true);
    setLoginFeedback("Opening secure browser window for login & OTP/CAPTCHA...");
    try {
      const res = await fetch("/api/jobs/apply/interactive-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, action: "launch" }),
      });
      const data = await res.json();
      if (res.ok && data.authenticated) {
        setLoginFeedback("Login confirmed! Resuming application automatically...");
        await handleResume();
      } else {
        setLoginFeedback(data.error || "Login incomplete. You can also sign in directly and click Resume.");
      }
    } catch (err: any) {
      setLoginFeedback(err?.message || "Failed to launch login session.");
    } finally {
      setInteractiveLoggingIn(false);
    }
  };

  // Resume workflow from saved checkpoint
  const handleResume = async () => {
    if (!applicationId) return;
    setResuming(true);
    try {
      const res = await fetch("/api/jobs/apply/continue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, autoSubmit: true }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.status) setSessionStatus(data.status);
        if (data.workflowState) setWorkflowState(data.workflowState);
        if (data.videoUrl) setVideoUrl(data.videoUrl);
        if (data.screenshotUrl) setScreenshotUrl(data.screenshotUrl);
        if (onResumed) onResumed();
      }
    } catch (err) {
      console.error("Resume error:", err);
    } finally {
      setResuming(false);
      fetchStatus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={cn(
          "relative w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl text-white flex flex-col overflow-hidden transition-all duration-300",
          isFullscreen ? "max-w-[98vw] h-[96vh]" : "max-w-5xl max-h-[92vh]"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/95 z-10 flex-wrap gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0 shadow-inner">
              <Bot className="w-5 h-5 text-indigo-400" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-white truncate">
                  AI Application Agent
                </h3>

                {isAuthRequired ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                    <KeyRound className="w-3 h-3 text-amber-400" />
                    Login Required
                  </span>
                ) : isReviewRequired ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[10px] font-bold uppercase tracking-wider">
                    <FileText className="w-3 h-3 text-purple-400" />
                    Review Required
                  </span>
                ) : isRunning ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    Automating Application...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    Application Complete
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                {jobTitle} • {companyName}
              </p>
            </div>
          </div>

          {/* Tab Navigation: Video / Screenshot / Logs */}
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab("video")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                activeTab === "video"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Session Video</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("screenshot")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                activeTab === "screenshot"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Applied Screenshot</span>
              {screenshotUrl && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("logs")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                activeTab === "logs"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Audit Logs</span>
            </button>
          </div>

          {/* Action icons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={fetchStatus}
              disabled={loading}
              title="Refresh status"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? "Exit fullscreen" : "Expand window"}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer hidden sm:flex"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Human-in-the-Loop Authentication Banner ── */}
        {isAuthRequired && (
          <div className="bg-amber-950/70 border-b border-amber-800/80 px-5 py-4 z-20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-200">
                  Login is required to continue your application on this website.
                </h4>
                <p className="text-xs text-amber-300/80 mt-0.5 leading-relaxed">
                  Log in or solve OTP/CAPTCHA directly. Your workflow is securely paused and will resume from this exact step once logged in.
                </p>
                {loginFeedback && (
                  <p className="text-xs text-indigo-300 font-mono mt-1">
                    {loginFeedback}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={handleLaunchLogin}
                disabled={interactiveLoggingIn}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
              >
                {interactiveLoggingIn ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <LogIn className="w-3.5 h-3.5" />
                )}
                <span>Continue to Login</span>
              </button>

              <button
                type="button"
                onClick={handleResume}
                disabled={resuming}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors cursor-pointer shadow-lg shadow-indigo-600/20 disabled:opacity-50"
              >
                {resuming ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ArrowRight className="w-3.5 h-3.5" />
                )}
                <span>I've Logged In — Resume</span>
              </button>

              {jobUrl && (
                <a
                  href={jobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                  title="Open Portal in New Tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* ── User Review Required Banner ── */}
        {isReviewRequired && (
          <div className="bg-purple-950/70 border-b border-purple-800/80 px-5 py-4 z-20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-purple-200">
                  Application Form Ready for Your Review
                </h4>
                <p className="text-xs text-purple-300/80 mt-0.5">
                  The agent has auto-filled candidate fields. Inspect the screenshot below and authorize submission.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab("screenshot")}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                Inspect Form
              </button>
              <button
                type="button"
                onClick={handleResume}
                disabled={resuming}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors cursor-pointer shadow-lg shadow-emerald-600/25 disabled:opacity-50"
              >
                {resuming ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Confirm & Submit</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 1: Application Video Player */}
        {activeTab === "video" && (
          <div className="flex-1 min-h-[440px] sm:min-h-[520px] bg-black/95 relative flex flex-col items-center justify-center p-3 sm:p-5">
            {videoUrl ? (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <video
                  src={videoUrl}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full max-h-[68vh] rounded-2xl object-contain bg-black shadow-2xl border border-slate-800/60"
                />

                {/* Video controls / info bar */}
                <div className="w-full pt-3 flex items-center justify-between text-xs text-slate-400 px-2 flex-wrap gap-2">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified Application Recording • 1280x720 HD
                  </span>

                  <div className="flex items-center gap-2">
                    {screenshotUrl && (
                      <button
                        type="button"
                        onClick={() => setActiveTab("screenshot")}
                        className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>View Proof Screenshot →</span>
                      </button>
                    )}

                    <a
                      href={videoUrl}
                      download={`application-${applicationId || "job"}.webm`}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Video</span>
                    </a>
                  </div>
                </div>
              </div>
            ) : isAuthRequired ? (
              /* Auth Required Standby Screen */
              <div className="p-8 text-center space-y-4 max-w-lg">
                <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/10">
                  <KeyRound className="w-10 h-10" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white mb-1">
                    Authentication Gate Encountered
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    This portal ({companyName}) requires candidate sign-in. Use the button above to launch the interactive login window. Once signed in, the agent will resume automatically.
                  </p>
                </div>
                {screenshotUrl && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("screenshot")}
                    className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>View Captured Portal Login Screen →</span>
                  </button>
                )}
              </div>
            ) : isRunning ? (
              /* Live Progress Screen while automation runs */
              <div className="p-8 text-center space-y-4 max-w-lg">
                <div className="relative w-20 h-20 mx-auto">
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 animate-ping" />
                  <div className="w-20 h-20 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-xl shadow-indigo-500/20">
                    <Bot className="w-10 h-10 animate-bounce" />
                  </div>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white mb-1">
                    AI Agent is Applying to {companyName}...
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Opening the company portal, filling in your name, contact details, profile, attaching your resume, and submitting the form. The full HD video recording and proof screenshot will appear here once submitted.
                  </p>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 h-full w-full animate-pulse" />
                </div>

                {/* Latest Log Message */}
                {sessionLogs.length > 0 && (
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-left text-xs font-mono text-indigo-300 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <span className="truncate">
                      {sessionLogs[sessionLogs.length - 1]?.message || "Executing application steps..."}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              /* Video Pending / Finalizing View */
              <div className="p-8 text-center space-y-4 max-w-md">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400">
                  <Video className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white mb-1">
                    Finalizing Application Video Recording
                  </h4>
                  <p className="text-xs text-slate-400">
                    The automation session has concluded. Assembling video file for immediate playback...
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchStatus}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  Refresh Recording
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Proof of Application Screenshot */}
        {activeTab === "screenshot" && (
          <div className="flex-1 min-h-[440px] sm:min-h-[520px] bg-black/95 relative flex flex-col items-center justify-center p-3 sm:p-5 overflow-auto">
            {screenshotUrl ? (
              <div className="w-full h-full flex flex-col items-center justify-center space-y-3">
                <div className="relative group max-h-[70vh] overflow-hidden rounded-2xl border border-slate-800 shadow-2xl bg-slate-950">
                  <img
                    src={screenshotUrl}
                    alt={`Applied Job Screenshot - ${jobTitle} at ${companyName}`}
                    className={cn(
                      "rounded-xl object-contain transition-all duration-300",
                      screenshotZoom ? "max-h-[90vh] scale-110" : "max-h-[66vh] max-w-full"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setScreenshotZoom(!screenshotZoom)}
                    className="absolute bottom-3 right-3 p-2 rounded-xl bg-black/70 hover:bg-black/90 text-white border border-slate-700 transition-colors shadow-lg cursor-pointer"
                    title={screenshotZoom ? "Zoom out" : "Zoom in"}
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>

                <div className="w-full flex items-center justify-between text-xs text-slate-400 px-2 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-semibold text-[11px]">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Official Proof of Application
                    </span>
                    <span className="text-slate-400">Captured at submission</span>
                  </div>

                  <a
                    href={screenshotUrl}
                    download={`applied-${applicationId || "job"}.png`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors cursor-pointer shadow-md shadow-emerald-600/25"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Screenshot</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center space-y-3 max-w-sm">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                  <ImageIcon className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-white">Screenshot Generating</h4>
                <p className="text-xs text-slate-400">
                  The AI Agent captures a screenshot immediately after filling and submitting the application form.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Detailed Submission Logs */}
        {activeTab === "logs" && (
          <div className="flex-1 min-h-[440px] sm:min-h-[520px] bg-slate-950 p-4 sm:p-6 overflow-y-auto font-mono text-xs space-y-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-slate-400">
              <span className="font-semibold text-slate-300">Application Execution Audit Log</span>
              <span>{sessionLogs.length} events recorded</span>
            </div>

            {sessionLogs.length === 0 ? (
              <p className="text-slate-500 py-6 text-center">No logs recorded yet.</p>
            ) : (
              sessionLogs.map((log, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/60 flex items-start gap-3 hover:bg-slate-900 transition-colors"
                >
                  <span className="text-[10px] text-slate-500 shrink-0 mt-0.5">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span
                    className={cn(
                      "px-1.5 py-0.2 rounded text-[10px] uppercase font-bold shrink-0",
                      log.status === "success"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : log.status === "warn"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : log.status === "error"
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        : "bg-slate-800 text-slate-400 border border-slate-700"
                    )}
                  >
                    {log.status || "info"}
                  </span>
                  <span className="text-slate-300 leading-relaxed flex-1">{log.message}</span>
                </div>
              ))
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 bg-slate-900/95 shrink-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "w-2 h-2 rounded-full",
                isAuthRequired
                  ? "bg-amber-400 animate-pulse"
                  : isComplete
                  ? "bg-emerald-400"
                  : "bg-indigo-400 animate-pulse"
              )}
            />
            <span className="font-mono text-[11px] text-slate-300">
              Status: {sessionStatus} {workflowState ? `[${workflowState}]` : ""}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {screenshotUrl && activeTab !== "screenshot" && (
              <button
                type="button"
                onClick={() => setActiveTab("screenshot")}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer transition-colors flex items-center gap-1"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Proof Screenshot</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer font-medium"
            >
              Close Window
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
