"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Building2,
  ExternalLink,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrowserSessionVideoModal } from "./browser-session-video-modal";

interface FillMissingFieldsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string;
  jobTitle?: string;
  companyName?: string;
  missingFields: string[];
  onSuccess?: (result: { status: string; sessionId?: string; sessionReplayUrl?: string }) => void;
}

export function FillMissingFieldsDialog({
  isOpen,
  onClose,
  applicationId,
  jobTitle = "Role",
  companyName = "Employer",
  missingFields,
  onSuccess,
}: FillMissingFieldsDialogProps) {
  const router = useRouter();
  const [videoModalOpen, setVideoModalOpen] = useState(false);

  // Field values state
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    missingFields.forEach((f) => {
      init[f] = "";
    });
    return init;
  });

  useEffect(() => {
    const init: Record<string, string> = {};
    missingFields.forEach((f) => {
      init[f] = "";
    });
    setValues(init);
    setError(null);
    setSubmissionResult(null);
  }, [missingFields, isOpen]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] = useState<{
    status: string;
    sessionId?: string;
    sessionReplayUrl?: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleChange = (fieldName: string, val: string) => {
    setValues((prev) => ({ ...prev, [fieldName]: val }));
    setError(null);
  };

  const getInputType = (fieldName: string): "text" | "tel" | "url" | "textarea" => {
    const lower = fieldName.toLowerCase();
    if (lower.includes("phone") || lower.includes("mobile") || lower.includes("contact")) {
      return "tel";
    }
    if (
      lower.includes("url") ||
      lower.includes("link") ||
      lower.includes("linkedin") ||
      lower.includes("github") ||
      lower.includes("portfolio") ||
      lower.includes("website")
    ) {
      return "url";
    }
    if (
      lower.includes("why") ||
      lower.includes("cover letter") ||
      lower.includes("summary") ||
      lower.includes("note")
    ) {
      return "textarea";
    }
    return "text";
  };

  const getPlaceholder = (fieldName: string): string => {
    const lower = fieldName.toLowerCase();
    if (lower.includes("phone") || lower.includes("mobile")) return "+1 (555) 012-3456";
    if (lower.includes("linkedin")) return "https://linkedin.com/in/username";
    if (lower.includes("github")) return "https://github.com/username";
    if (lower.includes("portfolio") || lower.includes("website")) return "https://yourdomain.com";
    if (lower.includes("location") || lower.includes("city")) return "City, Country (or Remote)";
    if (lower.includes("company")) return "Current Employer Name";
    if (lower.includes("why") || lower.includes("cover")) return "Explain your relevant background and interest...";
    return `Enter your ${fieldName}...`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if at least one field has text
    const emptyFields = missingFields.filter((f) => !(values[f] || "").trim());
    if (emptyFields.length === missingFields.length) {
      setError("Please fill in the required fields before submitting.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/jobs/apply/fill-missing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          fieldValues: values,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to save information");
      }

      setSubmissionResult({
        status: data.status || "Submitting",
        sessionId: data.sessionId,
        sessionReplayUrl: data.sessionReplayUrl,
      });

      // Automatically open live browser video modal so user can watch AI agent filling form live
      if (data.sessionId) {
        setVideoModalOpen(true);
      }

      if (onSuccess) {
        onSuccess(data);
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Error saving missing information");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl text-white max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow */}
        <div className="absolute top-0 right-1/4 w-56 h-56 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                Missing Application Fields
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Complete Profile Information
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {jobTitle} • {companyName}
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

        {/* Error notification */}
        {error && (
          <div className="my-4 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Result view after successful save & submit */}
        {submissionResult ? (
          <div className="my-5 p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 space-y-3.5">
            <div className="flex items-center gap-2 font-bold text-sm text-emerald-300">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Information Saved & Application Submitted!</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Your profile has been updated in the database with the newly provided information. The AI agent completed the submission with your verified data.
            </p>

            {submissionResult.sessionId && (
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
                <span>Session: {submissionResult.sessionId.slice(0, 16)}...</span>
                <button
                  type="button"
                  onClick={() => setVideoModalOpen(true)}
                  className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Video className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Watch Video Stream</span>
                </button>
              </div>
            )}

            <div className="pt-2 flex items-center flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setVideoModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors cursor-pointer shadow-lg shadow-indigo-600/25"
              >
                <Video className="w-4 h-4" />
                <span>Watch Browser Video</span>
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
        ) : (
          /* Form for Entering Missing Fields */
          <form onSubmit={handleSubmit} className="my-5 space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed">
              The employer’s application portal requires the following fields. Enter them below; they will be <strong className="text-white">saved directly to your profile database</strong> and used immediately to submit this application:
            </p>

            <div className="space-y-3">
              {missingFields.map((field, idx) => {
                const inputType = getInputType(field);
                const placeholder = getPlaceholder(field);
                const val = values[field] || "";

                return (
                  <div key={idx} className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-200 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="text-amber-400 font-bold">★</span>
                        <span>{field}</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">Required</span>
                    </label>

                    {inputType === "textarea" ? (
                      <textarea
                        rows={3}
                        value={val}
                        onChange={(e) => handleChange(field, e.target.value)}
                        placeholder={placeholder}
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors resize-none"
                      />
                    ) : (
                      <input
                        type={inputType}
                        value={val}
                        onChange={(e) => handleChange(field, e.target.value)}
                        placeholder={placeholder}
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving to Profile & Submitting...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Save & Submit Application</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Browser Session Video Player Modal */}
      {submissionResult?.sessionId && (
        <BrowserSessionVideoModal
          isOpen={videoModalOpen}
          onClose={() => setVideoModalOpen(false)}
          sessionId={submissionResult.sessionId}
          applicationId={applicationId}
          initialLiveUrl={submissionResult.sessionReplayUrl}
          jobTitle={jobTitle}
          companyName={companyName}
          status={submissionResult.status}
        />
      )}
    </div>
  );
}
