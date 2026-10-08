"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  ArrowRight,
  Shield,
  Zap,
} from "lucide-react";

interface OnboardingDialogProps {
  isOpen: boolean;
  onSuccess: () => void;
}

export function OnboardingDialog({ isOpen, onSuccess }: OnboardingDialogProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    setErrorMessage(null);
    const validExtensions = [".pdf", ".docx", ".doc", ".txt"];
    const fileExt = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

    if (!validExtensions.includes(fileExt)) {
      setErrorMessage("Please upload a PDF, DOCX, or TXT file.");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage("File size exceeds 15MB limit.");
      return;
    }

    setSelectedFile(file);
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setErrorMessage(null);

    try {
      setCurrentStep("Uploading resume to Supabase Storage...");
      const formData = new FormData();
      formData.append("file", selectedFile);

      // Transition step animation
      setTimeout(() => {
        setCurrentStep("Google Gemini AI analyzing resume & extracting skills...");
      }, 1200);

      const response = await fetch("/api/resume/upload-and-parse", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || "Failed to parse resume.");
      }

      setCurrentStep("Populating user profile & work history...");
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Success
      onSuccess();
      window.location.href = "/dashboard/profile?onboarded=true";
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to upload and parse resume.";
      setErrorMessage(msg);
      setUploading(false);
      setCurrentStep("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl rounded-3xl bg-[#090D16] border border-slate-700/80 p-6 sm:p-8 shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow ambient background elements */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Non-closable indicator */}
        <div className="flex items-center justify-between mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Required Onboarding Step</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <span>Profile Setup</span>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2 mb-6">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
            Welcome to{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
              JobBuddy AI
            </span>
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Upload your resume to continue. Our Google Gemini AI engine will parse your
            work experience, skills, and projects, automatically building your candidate profile.
          </p>
        </div>

        {/* Error notice */}
        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Drag and Drop Upload Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 cursor-pointer relative overflow-hidden ${
            isDragging
              ? "border-indigo-500 bg-indigo-500/10 scale-[0.99]"
              : selectedFile
              ? "border-emerald-500/60 bg-emerald-500/5"
              : "border-slate-700/80 hover:border-slate-600 bg-slate-900/60 hover:bg-slate-900"
          } ${uploading ? "pointer-events-none opacity-80" : ""}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc,.txt"
            onChange={handleFileChange}
            className="hidden"
          />

          {uploading ? (
            <div className="space-y-4 py-3">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 mx-auto flex items-center justify-center animate-pulse">
                <Loader2 className="w-7 h-7 animate-spin" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">
                  {currentStep}
                </p>
                <p className="text-xs text-slate-400">
                  Powered by Google Gemini AI SDK
                </p>
              </div>
            </div>
          ) : selectedFile ? (
            <div className="space-y-2 py-2">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white truncate max-w-sm mx-auto">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-slate-400">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to Parse
                </p>
              </div>
              <span className="inline-block text-xs text-indigo-400 hover:text-indigo-300 font-medium pt-1">
                Click to choose a different file
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 mx-auto flex items-center justify-center">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">
                  Drag and drop your resume here, or{" "}
                  <span className="text-indigo-400 underline underline-offset-2">
                    browse
                  </span>
                </p>
                <p className="text-xs text-slate-400">
                  Supports PDF, DOCX, or TXT (Max 15MB)
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Benefits checklist */}
        <div className="mt-5 grid grid-cols-2 gap-2.5 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Automatic skills extraction</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Work history structured in Supabase</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Fully editable in Profile tab</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Stored in secure Supabase bucket</span>
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <span>Protected & Private</span>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!selectedFile || uploading}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>Upload & Parse Resume</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
