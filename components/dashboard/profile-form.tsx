"use client";

import { useState } from "react";
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
  Calendar,
  Building,
} from "lucide-react";

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
}

export function ProfileForm({ initialProfile }: ProfileFormProps) {
  const supabase = createClient();

  const [profile, setProfile] = useState<ProfileData>(initialProfile);
  const [newSkill, setNewSkill] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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

  // Experience handlers (support multiple)
  const handleAddExperience = () => {
    const newItem: ExperienceItem = {
      company_name: "Company Name",
      job_title: "Role / Position Title",
      duration: "2023 - Present",
      location: "Remote / On-site",
      responsibilities: ["Key achievement or responsibility bullet point."],
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

  // Education handlers (support multiple)
  const handleAddEducation = () => {
    const newItem: EducationItem = {
      institution: "College / University Name",
      degree: "Bachelor of Science / B.Tech",
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

  // Projects handlers (support multiple)
  const handleAddProject = () => {
    const newItem: ProjectItem = {
      title: "Project Name",
      description: "Detailed description of the application architecture and features.",
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

  // Certifications handlers (support multiple)
  const handleAddCertification = () => {
    const newItem: CertificationItem = {
      name: "Certification / License Name",
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

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-white">
              Candidate Profile
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-medium">
              Synchronized & Active
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Complete details extracted from your resume. All entries are fully editable and saved to Supabase.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {saveSuccess && (
            <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/25 px-3 py-1.5 rounded-xl animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>Saved to Supabase!</span>
            </div>
          )}

          {saveError && (
            <div className="inline-flex items-center gap-1.5 text-xs text-rose-400 font-semibold bg-rose-500/10 border border-rose-500/25 px-3 py-1.5 rounded-xl">
              <AlertCircle className="w-4 h-4" />
              <span>{saveError}</span>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Profile</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 1. Personal & Contact Details */}
      <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-5">
        <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <User className="w-4 h-4 text-indigo-400" />
          Personal & Contact Details
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">
              Full Name *
            </label>
            <input
              type="text"
              value={profile.full_name || ""}
              onChange={(e) => handleFieldChange("full_name", e.target.value)}
              placeholder="e.g. Ankit Chauhan"
              className="w-full h-10 px-3.5 rounded-xl bg-slate-900 border border-slate-700/80 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              value={profile.email || ""}
              onChange={(e) => handleFieldChange("email", e.target.value)}
              placeholder="email@example.com"
              className="w-full h-10 px-3.5 rounded-xl bg-slate-900 border border-slate-700/80 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">
              Phone Number
            </label>
            <input
              type="tel"
              value={profile.phone || ""}
              onChange={(e) => handleFieldChange("phone", e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="w-full h-10 px-3.5 rounded-xl bg-slate-900 border border-slate-700/80 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">
              Location / City
            </label>
            <input
              type="text"
              value={profile.location || ""}
              onChange={(e) => handleFieldChange("location", e.target.value)}
              placeholder="San Francisco, CA / Remote"
              className="w-full h-10 px-3.5 rounded-xl bg-slate-900 border border-slate-700/80 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-medium text-slate-300 block mb-1.5">
              Professional Headline
            </label>
            <input
              type="text"
              value={profile.headline || ""}
              onChange={(e) => handleFieldChange("headline", e.target.value)}
              placeholder="e.g. Senior Full Stack Engineer • AI & Cloud Architecture"
              className="w-full h-10 px-3.5 rounded-xl bg-slate-900 border border-slate-700/80 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-medium text-slate-300 block mb-1.5">
              Professional Summary
            </label>
            <textarea
              rows={4}
              value={profile.summary || ""}
              onChange={(e) => handleFieldChange("summary", e.target.value)}
              placeholder="Comprehensive summary of your background, experience, key strengths, and objectives..."
              className="w-full p-3.5 rounded-xl bg-slate-900 border border-slate-700/80 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
            />
          </div>
        </div>
      </div>

      {/* 2. Skills Section */}
      <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Code className="w-4 h-4 text-purple-400" />
            Skills & Competencies ({profile.skills.length})
          </h3>
        </div>

        {/* Add skill form */}
        <form onSubmit={handleAddSkill} className="flex gap-2">
          <input
            type="text"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            placeholder="Type skill name (e.g. Python, Docker, Next.js, Kubernetes) and press Enter..."
            className="flex-1 h-10 px-3.5 rounded-xl bg-slate-900 border border-slate-700/80 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="px-4 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Skill</span>
          </button>
        </form>

        {/* Skills pill cloud */}
        <div className="flex flex-wrap gap-2 pt-2">
          {profile.skills.map((skill, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium group hover:bg-indigo-500/20 transition-colors"
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

      {/* 3. Work Experience (Multiple Entries Supported) */}
      <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-amber-400" />
              Work Experience ({profile.experience.length})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              All past and present employment roles, internships, and freelance positions.
            </p>
          </div>
          <button
            onClick={handleAddExperience}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Position</span>
          </button>
        </div>

        <div className="space-y-4">
          {profile.experience.map((exp, idx) => (
            <div
              key={idx}
              className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3.5 relative group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  Position #{idx + 1}
                </span>
                <button
                  onClick={() => handleRemoveExperience(idx)}
                  className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  title="Remove experience"
                >
                  <Trash2 className="w-4 h-4" />
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
                    className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">
                    Job Title / Role *
                  </label>
                  <input
                    type="text"
                    value={exp.job_title}
                    onChange={(e) =>
                      handleUpdateExperience(idx, "job_title", e.target.value)
                    }
                    className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">
                    Duration / Dates (e.g. Jan 2022 - Present)
                  </label>
                  <input
                    type="text"
                    value={exp.duration}
                    onChange={(e) =>
                      handleUpdateExperience(idx, "duration", e.target.value)
                    }
                    className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">
                    Location (e.g. New York, NY / Remote)
                  </label>
                  <input
                    type="text"
                    value={exp.location || ""}
                    onChange={(e) =>
                      handleUpdateExperience(idx, "location", e.target.value)
                    }
                    className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">
                  Responsibilities & Achievements (one bullet per line)
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
                  placeholder="Led the re-architecture of microservices...&#10;Boosted query response times by 35%..."
                  className="w-full p-3 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Education (Multiple Degrees & Institutions Supported) */}
      <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-emerald-400" />
              Education & Degrees ({profile.education.length})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              All universities, colleges, degrees, diplomas, and high schools.
            </p>
          </div>
          <button
            onClick={handleAddEducation}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Education</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {profile.education.map((edu, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5 relative"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Degree / School #{idx + 1}
                </span>
                <button
                  onClick={() => handleRemoveEducation(idx)}
                  className="p-1 rounded text-slate-500 hover:text-rose-400"
                  title="Remove education"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-0.5">
                  Institution / University
                </label>
                <input
                  type="text"
                  value={edu.institution}
                  onChange={(e) =>
                    handleUpdateEducation(idx, "institution", e.target.value)
                  }
                  className="w-full h-8 px-2.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-0.5">
                    Degree Name
                  </label>
                  <input
                    type="text"
                    value={edu.degree}
                    onChange={(e) =>
                      handleUpdateEducation(idx, "degree", e.target.value)
                    }
                    className="w-full h-8 px-2.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-0.5">
                    Graduation Year / Dates
                  </label>
                  <input
                    type="text"
                    value={edu.graduation_year}
                    onChange={(e) =>
                      handleUpdateEducation(idx, "graduation_year", e.target.value)
                    }
                    className="w-full h-8 px-2.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-0.5">
                    Field of Study / Major
                  </label>
                  <input
                    type="text"
                    value={edu.field_of_study}
                    onChange={(e) =>
                      handleUpdateEducation(idx, "field_of_study", e.target.value)
                    }
                    className="w-full h-8 px-2.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-0.5">
                    GPA / Score (Optional)
                  </label>
                  <input
                    type="text"
                    value={edu.gpa || ""}
                    onChange={(e) =>
                      handleUpdateEducation(idx, "gpa", e.target.value)
                    }
                    placeholder="e.g. 3.8 / 4.0"
                    className="w-full h-8 px-2.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Projects & Certifications Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Projects (Multiple) */}
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-pink-400" />
                Projects ({profile.projects.length})
              </h3>
            </div>
            <button
              onClick={handleAddProject}
              className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Add</span>
            </button>
          </div>

          <div className="space-y-3">
            {profile.projects.map((proj, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 relative"
              >
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    value={proj.title}
                    onChange={(e) =>
                      handleUpdateProject(idx, "title", e.target.value)
                    }
                    placeholder="Project Title"
                    className="font-semibold text-xs text-white bg-transparent border-b border-slate-700 focus:outline-none focus:border-indigo-500 pb-0.5 w-3/4"
                  />
                  <button
                    onClick={() => handleRemoveProject(idx)}
                    className="text-slate-500 hover:text-rose-400 text-xs"
                  >
                    ✕
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={proj.description}
                  onChange={(e) =>
                    handleUpdateProject(idx, "description", e.target.value)
                  }
                  placeholder="Project overview & impact..."
                  className="w-full p-2 rounded bg-slate-950 border border-slate-700 text-xs text-slate-300 leading-relaxed"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={Array.isArray(proj.technologies) ? proj.technologies.join(", ") : proj.technologies || ""}
                    onChange={(e) =>
                      handleUpdateProject(
                        idx,
                        "technologies",
                        e.target.value.split(",").map((t) => t.trim()).filter(Boolean)
                      )
                    }
                    placeholder="Technologies (comma-separated)"
                    className="w-full h-7 px-2 rounded bg-slate-950 border border-slate-700 text-[11px] text-slate-300"
                  />
                  <input
                    type="text"
                    value={proj.link || ""}
                    onChange={(e) =>
                      handleUpdateProject(idx, "link", e.target.value)
                    }
                    placeholder="Project URL / GitHub"
                    className="w-full h-7 px-2 rounded bg-slate-950 border border-slate-700 text-[11px] text-indigo-400"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Certifications (Multiple) */}
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Medal className="w-4 h-4 text-amber-400" />
                Certifications ({profile.certifications.length})
              </h3>
            </div>
            <button
              onClick={handleAddCertification}
              className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Add</span>
            </button>
          </div>

          <div className="space-y-3">
            {profile.certifications.map((cert, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 relative"
              >
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    value={cert.name}
                    onChange={(e) =>
                      handleUpdateCertification(idx, "name", e.target.value)
                    }
                    placeholder="Certification Name (e.g. AWS Solutions Architect)"
                    className="font-semibold text-xs text-white bg-transparent border-b border-slate-700 focus:outline-none focus:border-indigo-500 pb-0.5 w-3/4"
                  />
                  <button
                    onClick={() => handleRemoveCertification(idx)}
                    className="text-slate-500 hover:text-rose-400 text-xs"
                  >
                    ✕
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={cert.issuer}
                    onChange={(e) =>
                      handleUpdateCertification(idx, "issuer", e.target.value)
                    }
                    placeholder="Issuing Authority"
                    className="w-full h-7 px-2 rounded bg-slate-950 border border-slate-700 text-xs text-slate-300"
                  />
                  <input
                    type="text"
                    value={cert.year || ""}
                    onChange={(e) =>
                      handleUpdateCertification(idx, "year", e.target.value)
                    }
                    placeholder="Year Issued"
                    className="w-full h-7 px-2 rounded bg-slate-950 border border-slate-700 text-xs text-slate-300"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 6. Links & Portfolio */}
      <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-cyan-400" />
            Socials & External Links ({profile.links.length})
          </h3>
          <button
            onClick={handleAddLink}
            className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>Add Link</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {profile.links.map((link, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800"
            >
              <input
                type="text"
                value={link.label}
                onChange={(e) =>
                  handleUpdateLink(idx, "label", e.target.value)
                }
                placeholder="Platform (e.g. GitHub, LinkedIn)"
                className="w-1/3 h-8 px-2.5 rounded bg-slate-950 border border-slate-700 text-xs text-white font-medium"
              />
              <input
                type="url"
                value={link.url}
                onChange={(e) =>
                  handleUpdateLink(idx, "url", e.target.value)
                }
                placeholder="https://..."
                className="flex-1 h-8 px-2.5 rounded bg-slate-950 border border-slate-700 text-xs text-slate-300"
              />
              <button
                onClick={() => handleRemoveLink(idx)}
                className="text-slate-500 hover:text-rose-400 p-1"
                title="Remove link"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
