"use client";

import { useMemo } from "react";
import {
  CheckCircle2,
  Circle,
  Sparkles,
  Save,
  Loader2,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { ProfileData } from "./profile-form";

interface ProfileCompletenessCardProps {
  profile: ProfileData;
  saving?: boolean;
  onSave?: () => void;
  saveSuccess?: boolean;
}

export function ProfileCompletenessCard({
  profile,
  saving = false,
  onSave,
  saveSuccess = false,
}: ProfileCompletenessCardProps) {
  // Calculate percentage & breakdown
  const { percentage, checklist, strengthLabel, colorTheme } = useMemo(() => {
    const items = [
      {
        id: "personal",
        label: "Personal & Contact Info",
        weight: 20,
        completed: Boolean(
          profile.full_name &&
          profile.headline &&
          (profile.phone || profile.location)
        ),
      },
      {
        id: "summary",
        label: "Professional Summary",
        weight: 15,
        completed: Boolean(profile.summary && profile.summary.trim().length >= 20),
      },
      {
        id: "skills",
        label: "Skills (min. 3 skills)",
        weight: 15,
        completed: Boolean(profile.skills && profile.skills.length >= 3),
      },
      {
        id: "experience",
        label: "Work Experience",
        weight: 20,
        completed: Boolean(profile.experience && profile.experience.length >= 1),
      },
      {
        id: "education",
        label: "Education & Degree",
        weight: 15,
        completed: Boolean(profile.education && profile.education.length >= 1),
      },
      {
        id: "extras",
        label: "Projects or Certifications",
        weight: 15,
        completed: Boolean(
          (profile.projects && profile.projects.length >= 1) ||
          (profile.certifications && profile.certifications.length >= 1) ||
          (profile.links && profile.links.length >= 1)
        ),
      },
    ];

    const score = items.reduce(
      (acc, item) => (item.completed ? acc + item.weight : acc),
      0
    );

    // Dynamic color coding based on %
    let theme = {
      strokeColor: "#F43F5E", // Rose (< 40%)
      textColor: "text-rose-400",
      bgColor: "bg-rose-500/10",
      borderColor: "border-rose-500/20",
      badgeBg: "bg-rose-500/15 text-rose-300 border-rose-500/30",
      gradient: "from-rose-500 to-pink-600",
    };
    let label = "Needs Work";

    if (score >= 90) {
      theme = {
        strokeColor: "#10B981", // Emerald (90%+)
        textColor: "text-emerald-400",
        bgColor: "bg-emerald-500/10",
        borderColor: "border-emerald-500/20",
        badgeBg: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
        gradient: "from-emerald-500 to-teal-500",
      };
      label = "All-Star Profile";
    } else if (score >= 70) {
      theme = {
        strokeColor: "#6366F1", // Indigo (70-89%)
        textColor: "text-indigo-400",
        bgColor: "bg-indigo-500/10",
        borderColor: "border-indigo-500/20",
        badgeBg: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
        gradient: "from-indigo-500 to-purple-600",
      };
      label = "Strong Profile";
    } else if (score >= 40) {
      theme = {
        strokeColor: "#F59E0B", // Amber (40-69%)
        textColor: "text-amber-400",
        bgColor: "bg-amber-500/10",
        borderColor: "border-amber-500/20",
        badgeBg: "bg-amber-500/15 text-amber-300 border-amber-500/30",
        gradient: "from-amber-500 to-orange-500",
      };
      label = "Good Progress";
    }

    return {
      percentage: score,
      checklist: items,
      strengthLabel: label,
      colorTheme: theme,
    };
  }, [profile]);

  // SVG Circular math
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * percentage) / 100;

  return (
    <div className="rounded-3xl bg-[#090D16] border border-slate-800 p-6 shadow-xl space-y-6 relative overflow-hidden backdrop-blur-md">
      {/* Glow ambient background */}
      <div className="absolute -top-12 -right-12 w-44 h-44 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-400" />
          Profile Completeness
        </h3>
        <span
          className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${colorTheme.badgeBg}`}
        >
          {strengthLabel}
        </span>
      </div>

      {/* Circular Progress Gauge */}
      <div className="flex flex-col items-center justify-center py-2 relative">
        <div className="relative w-32 h-32 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
            {/* Background track circle */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              className="text-slate-800/80"
              strokeWidth="8"
              stroke="currentColor"
              fill="transparent"
            />
            {/* Animated progress circle */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke={colorTheme.strokeColor}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              style={{
                transition: "stroke-dashoffset 0.6s ease-in-out, stroke 0.4s ease",
              }}
            />
          </svg>

          {/* Centered Percentage Value */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-black text-white tracking-tight">
              {percentage}%
            </span>
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
              Complete
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-400 mt-3 text-center max-w-[220px] leading-relaxed">
          {percentage === 100
            ? "Your candidate profile is 100% complete and ready for AI job applications!"
            : "Complete all sections to boost your AI job matching accuracy to 95%+."}
        </p>
      </div>

      {/* Checklist items */}
      <div className="space-y-2.5 pt-3 border-t border-slate-800/80">
        <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block mb-1">
          Profile Checklist
        </span>
        {checklist.map((item) => (
          <div
            key={item.id}
            className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-xl transition-colors ${
              item.completed
                ? "bg-slate-900/60 text-slate-200"
                : "bg-slate-900/30 text-slate-400"
            }`}
          >
            <div className="flex items-center gap-2">
              {item.completed ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <Circle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              )}
              <span className={item.completed ? "font-medium" : ""}>
                {item.label}
              </span>
            </div>
            <span className="text-[10px] font-mono font-semibold text-slate-400">
              +{item.weight}%
            </span>
          </div>
        ))}
      </div>

      {/* Solid Save Button Action */}
      {onSave && (
        <div className="pt-2">
          {saveSuccess && (
            <div className="mb-2 text-center text-xs text-emerald-400 font-semibold flex items-center justify-center gap-1.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Saved successfully!</span>
            </div>
          )}

          <button
            onClick={onSave}
            disabled={saving}
            className="w-full h-11 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving to Supabase...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Profile Changes</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
