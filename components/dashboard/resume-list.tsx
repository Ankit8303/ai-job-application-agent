"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  FileText,
  UploadCloud,
  Download,
  Trash2,
  Sparkles,
  ExternalLink,
  Calendar,
  HardDrive,
  Eye,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Plus,
} from "lucide-react";

export interface ResumeItem {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  storage_path: string;
  parsed_data: {
    full_name?: string;
    email?: string;
    headline?: string;
    summary?: string;
    skills?: string[];
  } | null;
  created_at: string;
}

interface ResumeListProps {
  initialResumes: ResumeItem[];
}

export function ResumeList({ initialResumes }: ResumeListProps) {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [resumes, setResumes] = useState<ResumeItem[]>(initialResumes);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [selectedResumePreview, setSelectedResumePreview] = useState<ResumeItem | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [profileUpdatedMsg, setProfileUpdatedMsg] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

    setUploading(true);
    setErrorMsg(null);
    setProfileUpdatedMsg(null);
    setUploadStatus("Uploading to Supabase Storage & extracting with AI...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/resume/upload-and-parse", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to upload and parse resume.");
      }

      if (data.resume) {
        setResumes([data.resume, ...resumes]);
        setProfileUpdatedMsg(
          `Resume "${file.name}" was parsed successfully and your Candidate Profile has been populated with all exact details!`
        );
      }

      router.refresh();
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Upload error";
      setErrorMsg(msg);
    } finally {
      setUploading(false);
      setUploadStatus("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (resume: ResumeItem) => {
    if (!confirm(`Are you sure you want to delete "${resume.file_name}"?`)) return;

    try {
      // 1. Delete from storage
      if (resume.storage_path) {
        await supabase.storage.from("resumes").remove([resume.storage_path]);
      }

      // 2. Delete from database
      const { error } = await supabase
        .from("resumes")
        .delete()
        .eq("id", resume.id);

      if (error) {
        alert("Failed to delete resume: " + error.message);
      } else {
        setResumes(resumes.filter((r) => r.id !== resume.id));
        if (selectedResumePreview?.id === resume.id) {
          setSelectedResumePreview(null);
        }
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting resume.");
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Upload Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            Uploaded Resumes ({resumes.length})
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Resumes stored securely in Supabase Storage with Gemini AI extracted details.
          </p>
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Parsing...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4" />
                <span>Upload New Resume</span>
              </>
            )}
          </button>
        </div>
      </div>

      {uploadStatus && (
        <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs flex items-center gap-2.5 animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-400 shrink-0" />
          <span>{uploadStatus}</span>
        </div>
      )}

      {profileUpdatedMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{profileUpdatedMsg}</span>
          </div>
          <button
            onClick={() => router.push("/dashboard/profile")}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs whitespace-nowrap cursor-pointer transition-colors shadow-md shadow-emerald-600/20"
          >
            View Candidate Profile →
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Resumes List */}
      {resumes.length === 0 ? (
        <div className="p-12 rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center">
            <FileText className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              No resumes uploaded yet
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Upload your resume (PDF, DOCX, or TXT) to let Gemini AI extract your
              experience, skills, and projects.
            </p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Upload Resume Now</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {resumes.map((resume) => {
            const parsed = resume.parsed_data;
            const isPreviewOpen = selectedResumePreview?.id === resume.id;

            return (
              <div
                key={resume.id}
                className="rounded-2xl border border-slate-800/80 bg-slate-900/50 hover:bg-slate-900/80 transition-all overflow-hidden"
              >
                {/* Main Card Row */}
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-indigo-950/60 border border-indigo-800/40 flex items-center justify-center text-indigo-400 shrink-0">
                      <FileText className="w-6 h-6" />
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h4 className="text-sm font-bold text-white truncate max-w-md">
                          {resume.file_name}
                        </h4>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold">
                          <Sparkles className="w-3 h-3 text-emerald-400" />
                          Parsed by Gemini
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          {formatDate(resume.created_at)}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                          {formatFileSize(resume.file_size)}
                        </span>
                        {parsed?.full_name && (
                          <>
                            <span>•</span>
                            <span className="text-slate-300 font-medium">
                              {parsed.full_name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2.5 self-end md:self-center shrink-0">
                    <button
                      onClick={() =>
                        setSelectedResumePreview(
                          isPreviewOpen ? null : resume
                        )
                      }
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                    >
                      <Eye className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{isPreviewOpen ? "Hide Details" : "View Parsed"}</span>
                    </button>

                    <a
                      href={resume.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700"
                      title="Download / View original file"
                    >
                      <Download className="w-4 h-4" />
                    </a>

                    <button
                      onClick={() => handleDelete(resume)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Delete resume"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded Parsed Preview Accordion */}
                {isPreviewOpen && parsed && (
                  <div className="px-5 pb-5 pt-3 border-t border-slate-800/80 bg-[#070A11]/60 space-y-3.5 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 block mb-0.5">
                          Extracted Candidate:
                        </span>
                        <span className="font-semibold text-white">
                          {parsed.full_name || "N/A"}
                        </span>
                        {parsed.headline && (
                          <span className="text-indigo-400 block mt-0.5">
                            {parsed.headline}
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">
                          Extracted Contact:
                        </span>
                        <span className="text-slate-200">
                          {parsed.email || "N/A"}
                        </span>
                      </div>
                    </div>

                    {parsed.summary && (
                      <div>
                        <span className="text-xs text-slate-400 block mb-1">
                          Extracted Summary:
                        </span>
                        <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
                          {parsed.summary}
                        </p>
                      </div>
                    )}

                    {parsed.skills && parsed.skills.length > 0 && (
                      <div>
                        <span className="text-xs text-slate-400 block mb-1.5">
                          Extracted Skills ({parsed.skills.length}):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {parsed.skills.map((skill, sIdx) => (
                            <span
                              key={sIdx}
                              className="text-[11px] px-2.5 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
