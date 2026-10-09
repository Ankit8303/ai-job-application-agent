"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  User,
  Briefcase,
  GraduationCap,
  Code,
  Award,
  Link as LinkIcon,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Medal,
  Globe,
  Sparkles,
  UploadCloud,
  FileText,
  AlertTriangle,
  ArrowRight,
  Bot,
} from "lucide-react";
import { ProfileCompletenessCard } from "./profile-completeness-card";
import { FillMissingFieldsDialog } from "./jobs/fill-missing-fields-dialog";

export interface ExperienceItem {
  company_name: string;
  job_title: string;
  duration: string;
  location?: string;
  responsibilities: string[];
}

export interface EducationItem {
  institution: string;
  degree: string;
  field_of_study: string;
  graduation_year: string;
  gpa?: string;
}

export interface ProjectItem {
  title: string;
  description: string;
  technologies: string[];
  link?: string;
}

export interface CertificationItem {
  name: string;
  issuer: string;
  year?: string;
}

export interface LinkItem {
  label: string;
  url: string;
}

export interface ProfileData {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  location: string | null;
  headline: string | null;
  summary: string | null;
  skills: string[];
  experience: ExperienceItem[];
  education: EducationItem[];
  projects: ProjectItem[];
  certifications: CertificationItem[];
  links: LinkItem[];
  onboarded?: boolean;
}

interface ProfileFormProps {
  initialProfile: ProfileData;
  pendingApplications?: Array<{
    id: string;
    company_name: string;
    position: string;
    platform?: string;
    missing_fields?: string[];
    status?: string;
  }>;
}

type TabType =
  | "personal"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "certifications"
  | "links";

export function ProfileForm({ initialProfile, pendingApplications = [] }: ProfileFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryAppId = searchParams.get("applicationId");
  const queryMissing = searchParams.get("missing")?.split(",").filter(Boolean);

  const supabase = createClient();
  const resumeFileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<ProfileData>(initialProfile);
  const [activeTab, setActiveTab] = useState<TabType>("personal");
  const [newSkill, setNewSkill] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Automation continuation state
  const [continuingAppId, setContinuingAppId] = useState<string | null>(null);
  const [continueError, setContinueError] = useState<string | null>(null);
  const [continueSuccess, setContinueSuccess] = useState<string | null>(null);
  const [dialogApp, setDialogApp] = useState<{ id: string; title: string; company: string; missing: string[] } | null>(null);

  // Resume auto-fill state
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [autoFillStatus, setAutoFillStatus] = useState("");
  const [autoFillResult, setAutoFillResult] = useState<{
    fileName: string;
    skillsCount: number;
    expCount: number;
    eduCount: number;
  } | null>(null);

  // Keep state synced with server initialProfile updates
  useEffect(() => {
    setProfile(initialProfile);
  }, [initialProfile]);

  const handleResumeAutoFill = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

    setIsAutoFilling(true);
    setAutoFillStatus("Uploading & extracting resume information with AI...");
    setSaveError(null);
    setSaveSuccess(false);
    setAutoFillResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/resume/upload-and-parse", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to parse resume.");
      }

      if (data.profile) {
        setProfile(data.profile);
        setAutoFillResult({
          fileName: file.name,
          skillsCount: Array.isArray(data.profile.skills) ? data.profile.skills.length : 0,
          expCount: Array.isArray(data.profile.experience) ? data.profile.experience.length : 0,
          eduCount: Array.isArray(data.profile.education) ? data.profile.education.length : 0,
        });
        setSaveSuccess(true);
      }
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to auto-fill profile from resume.";
      setSaveError(msg);
    } finally {
      setIsAutoFilling(false);
      setAutoFillStatus("");
      if (resumeFileInputRef.current) resumeFileInputRef.current.value = "";
    }
  };

  const handleFieldChange = (field: keyof ProfileData, value: unknown) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    setSaveSuccess(false);
  };

  // Skills handlers
  const handleAddSkill = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newSkill.trim()) return;
    if (!profile.skills.includes(newSkill.trim())) {
      setProfile((prev) => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()],
      }));
    }
    setNewSkill("");
    setSaveSuccess(false);
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setProfile((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skillToRemove),
    }));
    setSaveSuccess(false);
  };

  // Experience handlers
  const handleAddExperience = () => {
    const newItem: ExperienceItem = {
      company_name: "Company Name",
      job_title: "Position Title",
      duration: "2023 - Present",
      location: "Remote / On-site",
      responsibilities: ["Key contribution or core project responsibility."],
    };
    setProfile((prev) => ({
      ...prev,
      experience: [newItem, ...prev.experience],
    }));
    setSaveSuccess(false);
  };

  const handleUpdateExperience = (
    index: number,
    field: keyof ExperienceItem,
    value: unknown
  ) => {
    const updated = [...profile.experience];
    updated[index] = { ...updated[index], [field]: value };
    setProfile((prev) => ({ ...prev, experience: updated }));
    setSaveSuccess(false);
  };

  const handleRemoveExperience = (index: number) => {
    setProfile((prev) => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== index),
    }));
    setSaveSuccess(false);
  };

  // Education handlers
  const handleAddEducation = () => {
    const newItem: EducationItem = {
      institution: "Institution / College Name",
      degree: "Bachelor of Technology / Science",
      field_of_study: "Computer Science",
      graduation_year: "2024",
      gpa: "",
    };
    setProfile((prev) => ({
      ...prev,
      education: [...prev.education, newItem],
    }));
    setSaveSuccess(false);
  };

  const handleUpdateEducation = (
    index: number,
    field: keyof EducationItem,
    value: string
  ) => {
    const updated = [...profile.education];
    updated[index] = { ...updated[index], [field]: value };
    setProfile((prev) => ({ ...prev, education: updated }));
    setSaveSuccess(false);
  };

  const handleRemoveEducation = (index: number) => {
    setProfile((prev) => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index),
    }));
    setSaveSuccess(false);
  };

  // Projects handlers
  const handleAddProject = () => {
    const newItem: ProjectItem = {
      title: "Project Name",
      description: "Overview of architecture, core features, and outcomes.",
      technologies: ["React", "TypeScript", "Node.js"],
      link: "https://",
    };
    setProfile((prev) => ({
      ...prev,
      projects: [...prev.projects, newItem],
    }));
    setSaveSuccess(false);
  };

  const handleUpdateProject = (
    index: number,
    field: keyof ProjectItem,
    value: unknown
  ) => {
    const updated = [...profile.projects];
    updated[index] = { ...updated[index], [field]: value };
    setProfile((prev) => ({ ...prev, projects: updated }));
    setSaveSuccess(false);
  };

  const handleRemoveProject = (index: number) => {
    setProfile((prev) => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== index),
    }));
    setSaveSuccess(false);
  };

  // Certifications handlers
  const handleAddCertification = () => {
    const newItem: CertificationItem = {
      name: "Certification Name",
      issuer: "Issuing Organization (e.g. AWS, Google)",
      year: "2024",
    };
    setProfile((prev) => ({
      ...prev,
      certifications: [...prev.certifications, newItem],
    }));
    setSaveSuccess(false);
  };

  const handleUpdateCertification = (
    index: number,
    field: keyof CertificationItem,
    value: string
  ) => {
    const updated = [...profile.certifications];
    updated[index] = { ...updated[index], [field]: value };
    setProfile((prev) => ({ ...prev, certifications: updated }));
    setSaveSuccess(false);
  };

  const handleRemoveCertification = (index: number) => {
    setProfile((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index),
    }));
    setSaveSuccess(false);
  };

  // Links handlers
  const handleAddLink = () => {
    const newItem: LinkItem = { label: "Website", url: "https://" };
    setProfile((prev) => ({ ...prev, links: [...prev.links, newItem] }));
    setSaveSuccess(false);
  };

  const handleUpdateLink = (index: number, field: keyof LinkItem, value: string) => {
    const updated = [...profile.links];
    updated[index] = { ...updated[index], [field]: value };
    setProfile((prev) => ({ ...prev, links: updated }));
    setSaveSuccess(false);
  };

  const handleRemoveLink = (index: number) => {
    setProfile((prev) => ({
      ...prev,
      links: prev.links.filter((_, i) => i !== index),
    }));
    setSaveSuccess(false);
  };

  // Save changes to Supabase
  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const updateData = {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        phone: profile.phone,
        location: profile.location,
        headline: profile.headline,
        summary: profile.summary,
        skills: profile.skills,
        experience: profile.experience,
        education: profile.education,
        projects: profile.projects,
        certifications: profile.certifications,
        links: profile.links,
        onboarded: true,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("profiles")
        .upsert(updateData);

      if (error) {
        throw new Error(error.message);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to save profile changes.";
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  // Quick tab switch for missing fields
  const jumpToFieldTab = (fieldStr: string) => {
    const f = fieldStr.toLowerCase();
    if (
      f.includes("link") ||
      f.includes("linkedin") ||
      f.includes("github") ||
      f.includes("portfolio") ||
      f.includes("website")
    ) {
      setActiveTab("links");
    } else if (
      f.includes("experience") ||
      f.includes("company") ||
      f.includes("employer") ||
      f.includes("job")
    ) {
      setActiveTab("experience");
    } else if (f.includes("skill")) {
      setActiveTab("skills");
    } else if (f.includes("education") || f.includes("degree")) {
      setActiveTab("education");
    } else {
      setActiveTab("personal");
    }
  };

  // Continue automation after candidate fills missing profile fields
  const handleSaveAndContinueAutomation = async (appId: string) => {
    setContinuingAppId(appId);
    setContinueError(null);
    setContinueSuccess(null);

    try {
      // Step 1: Save current profile
      const updateData = {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        phone: profile.phone,
        location: profile.location,
        headline: profile.headline,
        summary: profile.summary,
        skills: profile.skills,
        experience: profile.experience,
        education: profile.education,
        projects: profile.projects,
        certifications: profile.certifications,
        links: profile.links,
        onboarded: true,
        updated_at: new Date().toISOString(),
      };

      const { error: saveErr } = await supabase.from("profiles").upsert(updateData);
      if (saveErr) throw new Error("Failed to save profile: " + saveErr.message);

      // Step 2: Call continue endpoint
      const res = await fetch("/api/jobs/apply/continue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: appId }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to continue automation");
      }

      if (!data.isComplete && data.missingFields?.length > 0) {
        setContinueError(`Still missing: ${data.missingFields.join(", ")}. Please complete these fields.`);
      } else {
        setContinueSuccess("Profile verified! AI agent submitted your application successfully. Redirecting to Application Tracker...");
        setTimeout(() => {
          router.push("/dashboard/application-status");
        }, 2000);
      }
    } catch (err: any) {
      console.error(err);
      setContinueError(err?.message || "Error continuing application");
    } finally {
      setContinuingAppId(null);
    }
  };

  // Tabs metadata with proper icons and badges
  const tabs = [
    {
      id: "personal" as TabType,
      label: "Personal Info",
      icon: User,
      count: null,
    },
    {
      id: "experience" as TabType,
      label: "Experience",
      icon: Briefcase,
      count: profile.experience.length,
    },
    {
      id: "education" as TabType,
      label: "Education",
      icon: GraduationCap,
      count: profile.education.length,
    },
    {
      id: "skills" as TabType,
      label: "Skills",
      icon: Code,
      count: profile.skills.length,
    },
    {
      id: "projects" as TabType,
      label: "Projects",
      icon: Award,
      count: profile.projects.length,
    },
    {
      id: "certifications" as TabType,
      label: "Certifications",
      icon: Medal,
      count: profile.certifications.length,
    },
    {
      id: "links" as TabType,
      label: "Social Links",
      icon: Globe,
      count: profile.links.length,
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* LEFT / MAIN COLUMN: Tabs & Form Content */}
      <div className="lg:col-span-8 space-y-6">
        {/* Missing Profile Information for Automated Applications Banner */}
        {((pendingApplications && pendingApplications.length > 0) || queryAppId) && (
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-amber-950/50 via-[#101420] to-amber-950/30 border-2 border-amber-500/50 shadow-2xl shadow-amber-500/10 space-y-4 animate-in fade-in duration-300">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                      Missing Profile Information for AI Application
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                      Action Required
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    The Browserbase agent detected required fields on the employer application form that are not yet filled in your profile. Complete them below to resume automated submission.
                  </p>
                </div>
              </div>
            </div>

            {/* List of Applications with Missing Info */}
            <div className="space-y-3 pt-1">
              {(pendingApplications.length > 0
                ? pendingApplications
                : queryAppId
                ? [
                    {
                      id: queryAppId,
                      company_name: "Selected Role",
                      position: "Pending Application",
                      missing_fields: queryMissing || ["Phone", "Resume"],
                    },
                  ]
                : []
              ).map((app) => {
                const missingList = Array.isArray(app.missing_fields) && app.missing_fields.length > 0
                  ? app.missing_fields
                  : queryMissing || ["Phone Number", "LinkedIn URL"];

                const isCurrentAppContinuing = continuingAppId === app.id;

                return (
                  <div
                    key={app.id}
                    className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{app.position}</span>
                        <span className="text-xs text-slate-400">• {app.company_name}</span>
                        {app.platform && (
                          <span className="text-[10px] px-2 py-0.2 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                            {app.platform}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center flex-wrap gap-1.5 mt-2.5">
                        <span className="text-xs text-amber-400 font-semibold mr-1">Missing:</span>
                        {missingList.map((field, fIdx) => (
                          <button
                            key={fIdx}
                            type="button"
                            onClick={() => jumpToFieldTab(field)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold cursor-pointer transition-colors"
                            title={`Click to switch to ${field} field`}
                          >
                            <span>★ {field}</span>
                            <span className="text-[10px] text-amber-400/80 underline ml-0.5">Edit →</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setDialogApp({
                            id: app.id,
                            title: app.position,
                            company: app.company_name,
                            missing: missingList,
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-300 border border-slate-700 transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>Fill in Dialog</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSaveAndContinueAutomation(app.id)}
                        disabled={isCurrentAppContinuing}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all cursor-pointer"
                      >
                        {isCurrentAppContinuing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                            <span>Verifying & Submitting...</span>
                          </>
                        ) : (
                          <>
                            <span>Save & Continue</span>
                            <ArrowRight className="w-4 h-4 text-slate-950" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Error or Success banners for continue action */}
            {continueError && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{continueError}</span>
              </div>
            )}

            {continueSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{continueSuccess}</span>
              </div>
            )}
          </div>
        )}

        {/* Quick Resume Auto-Fill Action Banner */}
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-[#0E1322] via-[#090D16] to-[#0E1322] border border-indigo-500/20 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center gap-3 relative">
            <div className="p-2.5 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shrink-0">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white tracking-tight">
                  Auto-Fill Profile From Resume
                </h4>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                  100% Exact AI Parser
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Upload your PDF or DOCX resume to instantly populate all tabs with your exact details.
              </p>
            </div>
          </div>

          <div className="relative shrink-0 w-full sm:w-auto">
            <input
              type="file"
              ref={resumeFileInputRef}
              onChange={handleResumeAutoFill}
              accept=".pdf,.docx,.doc,.txt"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => resumeFileInputRef.current?.click()}
              disabled={isAutoFilling}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-60"
            >
              {isAutoFilling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>{autoFillStatus || "Parsing Resume..."}</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4 text-white" />
                  <span>Upload & Auto-Fill</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Auto-fill Success Result Notification */}
        {autoFillResult && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Profile successfully populated from <strong>{autoFillResult.fileName}</strong>: {autoFillResult.skillsCount} skills, {autoFillResult.expCount} experience entries, and {autoFillResult.eduCount} education records loaded!
              </span>
            </div>
            <span className="text-[10px] text-emerald-400/80 font-mono shrink-0">Ready to edit</span>
          </div>
        )}

        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#090D16] border border-slate-800 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-medium text-xs whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-semibold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Status Alerts */}
        {saveSuccess && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Profile saved successfully to Supabase!</span>
          </div>
        )}

        {saveError && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        {/* TAB 1: Personal Details */}
        {activeTab === "personal" && (
          <div className="p-6 sm:p-7 rounded-3xl bg-[#090D16] border border-slate-800 space-y-5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-600/15 text-indigo-400">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Personal & Contact Details
                  </h3>
                  <p className="text-xs text-slate-400">
                    Basic information used across your job applications.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={profile.full_name || ""}
                  onChange={(e) => handleFieldChange("full_name", e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-900 border border-slate-700/80 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={profile.email || ""}
                  onChange={(e) => handleFieldChange("email", e.target.value)}
                  placeholder="alex@domain.com"
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-900 border border-slate-700/80 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={profile.phone || ""}
                  onChange={(e) => handleFieldChange("phone", e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-900 border border-slate-700/80 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Location / City
                </label>
                <input
                  type="text"
                  value={profile.location || ""}
                  onChange={(e) => handleFieldChange("location", e.target.value)}
                  placeholder="San Francisco, CA / Remote"
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-900 border border-slate-700/80 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Professional Headline
                </label>
                <input
                  type="text"
                  value={profile.headline || ""}
                  onChange={(e) => handleFieldChange("headline", e.target.value)}
                  placeholder="e.g. Senior Full Stack Engineer • AI & Cloud Systems"
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-900 border border-slate-700/80 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Professional Summary
                </label>
                <textarea
                  rows={4}
                  value={profile.summary || ""}
                  onChange={(e) => handleFieldChange("summary", e.target.value)}
                  placeholder="Comprehensive career summary highlighting your technical strengths, accomplishments, and value..."
                  className="w-full p-3.5 rounded-xl bg-slate-900 border border-slate-700/80 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Work Experience */}
        {activeTab === "experience" && (
          <div className="p-6 sm:p-7 rounded-3xl bg-[#090D16] border border-slate-800 space-y-6 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Work Experience ({profile.experience.length})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Employment history and key technical responsibilities.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddExperience}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Position</span>
              </button>
            </div>

            <div className="space-y-4">
              {profile.experience.map((exp, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3.5 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                      Position #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveExperience(idx)}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-slate-400 block mb-1">
                        Company Name *
                      </label>
                      <input
                        type="text"
                        value={exp.company_name}
                        onChange={(e) =>
                          handleUpdateExperience(idx, "company_name", e.target.value)
                        }
                        className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-400 block mb-1">
                        Job Title *
                      </label>
                      <input
                        type="text"
                        value={exp.job_title}
                        onChange={(e) =>
                          handleUpdateExperience(idx, "job_title", e.target.value)
                        }
                        className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-400 block mb-1">
                        Duration (e.g. Jan 2022 - Present)
                      </label>
                      <input
                        type="text"
                        value={exp.duration}
                        onChange={(e) =>
                          handleUpdateExperience(idx, "duration", e.target.value)
                        }
                        className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-400 block mb-1">
                        Location
                      </label>
                      <input
                        type="text"
                        value={exp.location || ""}
                        onChange={(e) =>
                          handleUpdateExperience(idx, "location", e.target.value)
                        }
                        className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">
                      Responsibilities & Bullet Points (one per line)
                    </label>
                    <textarea
                      rows={3}
                      value={
                        Array.isArray(exp.responsibilities)
                          ? exp.responsibilities.join("\n")
                          : exp.responsibilities || ""
                      }
                      onChange={(e) =>
                        handleUpdateExperience(
                          idx,
                          "responsibilities",
                          e.target.value.split("\n").filter(Boolean)
                        )
                      }
                      className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: Education */}
        {activeTab === "education" && (
          <div className="p-6 sm:p-7 rounded-3xl bg-[#090D16] border border-slate-800 space-y-6 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Education & Degrees ({profile.education.length})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Degrees, universities, colleges, and graduation details.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddEducation}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Education</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {profile.education.map((edu, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      Degree #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveEducation(idx)}
                      className="px-2 py-0.5 rounded-lg bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 text-xs font-medium cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">
                      Institution / University
                    </label>
                    <input
                      type="text"
                      value={edu.institution}
                      onChange={(e) =>
                        handleUpdateEducation(idx, "institution", e.target.value)
                      }
                      className="w-full h-9 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-medium text-slate-400 block mb-1">
                        Degree
                      </label>
                      <input
                        type="text"
                        value={edu.degree}
                        onChange={(e) =>
                          handleUpdateEducation(idx, "degree", e.target.value)
                        }
                        className="w-full h-9 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-400 block mb-1">
                        Graduation Year
                      </label>
                      <input
                        type="text"
                        value={edu.graduation_year}
                        onChange={(e) =>
                          handleUpdateEducation(idx, "graduation_year", e.target.value)
                        }
                        className="w-full h-9 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-medium text-slate-400 block mb-1">
                        Field of Study / Major
                      </label>
                      <input
                        type="text"
                        value={edu.field_of_study}
                        onChange={(e) =>
                          handleUpdateEducation(idx, "field_of_study", e.target.value)
                        }
                        className="w-full h-9 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-400 block mb-1">
                        GPA / Score (Optional)
                      </label>
                      <input
                        type="text"
                        value={edu.gpa || ""}
                        onChange={(e) =>
                          handleUpdateEducation(idx, "gpa", e.target.value)
                        }
                        placeholder="e.g. 3.8 / 4.0"
                        className="w-full h-9 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: Skills */}
        {activeTab === "skills" && (
          <div className="p-6 sm:p-7 rounded-3xl bg-[#090D16] border border-slate-800 space-y-6 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
                  <Code className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Skills & Competencies ({profile.skills.length})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Keywords used by AI matching to find relevant job positions.
                  </p>
                </div>
              </div>
            </div>

            {/* Solid Add Skill Form */}
            <form onSubmit={handleAddSkill} className="flex gap-2.5">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                placeholder="Type skill name (e.g. Docker, Python, React, AWS) and press Add..."
                className="flex-1 h-11 px-4 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                className="px-5 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Skill</span>
              </button>
            </form>

            {/* Skills Pill Cloud */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-200 text-xs font-semibold group hover:bg-indigo-500/25 transition-colors"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="text-indigo-400 hover:text-rose-400 transition-colors"
                      title="Remove skill"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Projects */}
        {activeTab === "projects" && (
          <div className="p-6 sm:p-7 rounded-3xl bg-[#090D16] border border-slate-800 space-y-6 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-pink-500/15 text-pink-400">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Projects ({profile.projects.length})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Notable projects and technical achievements.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddProject}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Project</span>
              </button>
            </div>

            <div className="space-y-4">
              {profile.projects.map((proj, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-pink-400 uppercase tracking-wider">
                      Project #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveProject(idx)}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 text-xs font-medium cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-slate-400 block mb-1">
                        Project Title *
                      </label>
                      <input
                        type="text"
                        value={proj.title}
                        onChange={(e) =>
                          handleUpdateProject(idx, "title", e.target.value)
                        }
                        className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-400 block mb-1">
                        URL / GitHub Link
                      </label>
                      <input
                        type="text"
                        value={proj.link || ""}
                        onChange={(e) =>
                          handleUpdateProject(idx, "link", e.target.value)
                        }
                        placeholder="https://github.com/..."
                        className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-indigo-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">
                      Project Description
                    </label>
                    <textarea
                      rows={2}
                      value={proj.description}
                      onChange={(e) =>
                        handleUpdateProject(idx, "description", e.target.value)
                      }
                      className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">
                      Technologies (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={
                        Array.isArray(proj.technologies)
                          ? proj.technologies.join(", ")
                          : proj.technologies || ""
                      }
                      onChange={(e) =>
                        handleUpdateProject(
                          idx,
                          "technologies",
                          e.target.value.split(",").map((t) => t.trim()).filter(Boolean)
                        )
                      }
                      className="w-full h-9 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-300"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: Certifications */}
        {activeTab === "certifications" && (
          <div className="p-6 sm:p-7 rounded-3xl bg-[#090D16] border border-slate-800 space-y-6 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
                  <Medal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Certifications & Licenses ({profile.certifications.length})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Industry credentials and accredited certificates.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddCertification}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Certification</span>
              </button>
            </div>

            <div className="space-y-4">
              {profile.certifications.map((cert, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                      Certification #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCertification(idx)}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 text-xs font-medium cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-medium text-slate-400 block mb-1">
                        Certification Name *
                      </label>
                      <input
                        type="text"
                        value={cert.name}
                        onChange={(e) =>
                          handleUpdateCertification(idx, "name", e.target.value)
                        }
                        className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-400 block mb-1">
                        Issuing Organization
                      </label>
                      <input
                        type="text"
                        value={cert.issuer}
                        onChange={(e) =>
                          handleUpdateCertification(idx, "issuer", e.target.value)
                        }
                        placeholder="e.g. AWS, Google"
                        className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">
                      Year Obtained / Validity
                    </label>
                    <input
                      type="text"
                      value={cert.year || ""}
                      onChange={(e) =>
                        handleUpdateCertification(idx, "year", e.target.value)
                      }
                      placeholder="e.g. 2024"
                      className="w-full sm:w-1/3 h-9 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 7: Social Links */}
        {activeTab === "links" && (
          <div className="p-6 sm:p-7 rounded-3xl bg-[#090D16] border border-slate-800 space-y-6 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Socials & Web Presence ({profile.links.length})
                  </h3>
                  <p className="text-xs text-slate-400">
                    LinkedIn, GitHub, Portfolio website, and social links.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddLink}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Link</span>
              </button>
            </div>

            <div className="space-y-3">
              {profile.links.map((link, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900/80 border border-slate-800"
                >
                  <input
                    type="text"
                    value={link.label}
                    onChange={(e) =>
                      handleUpdateLink(idx, "label", e.target.value)
                    }
                    placeholder="Platform (e.g. GitHub, LinkedIn)"
                    className="w-1/3 h-10 px-3.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-medium"
                  />
                  <input
                    type="url"
                    value={link.url}
                    onChange={(e) =>
                      handleUpdateLink(idx, "url", e.target.value)
                    }
                    placeholder="https://..."
                    className="flex-1 h-10 px-3.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-300"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveLink(idx)}
                    className="p-2 rounded-xl bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 transition-colors cursor-pointer"
                    title="Remove link"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Sticky Profile Completeness Card */}
      <div className="lg:col-span-4 sticky top-20 space-y-4">
        <ProfileCompletenessCard
          profile={profile}
          saving={saving}
          onSave={handleSave}
          saveSuccess={saveSuccess}
        />
      </div>

      {/* Fill Missing Fields Dialog Modal */}
      {dialogApp && (
        <FillMissingFieldsDialog
          isOpen={Boolean(dialogApp)}
          onClose={() => setDialogApp(null)}
          applicationId={dialogApp.id}
          jobTitle={dialogApp.title}
          companyName={dialogApp.company}
          missingFields={dialogApp.missing}
          onSuccess={() => {
            setDialogApp(null);
            router.push("/dashboard/application-status");
          }}
        />
      )}
    </div>
  );
}
