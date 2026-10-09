"use client";

import { JobFilterOptions } from "@/lib/jobs/types";
import {
  Filter,
  X,
  RotateCcw,
  Clock,
  Sparkles,
  DollarSign,
  Building,
  Briefcase,
  Star,
  Layers,
} from "lucide-react";

interface AdvancedFiltersProps {
  filters: JobFilterOptions;
  onChange: (updated: Partial<JobFilterOptions>) => void;
  onReset: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export function AdvancedFilters({
  filters,
  onChange,
  onReset,
  isOpen,
  onClose,
}: AdvancedFiltersProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-md h-full bg-slate-900 border-l border-slate-800 p-6 shadow-2xl flex flex-col justify-between overflow-y-auto text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-indigo-400" />
              <h3 className="text-lg font-bold text-white">Advanced Search Filters</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 1. Recruiter Date Posted */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" /> Recruiter Posting Date
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "all", label: "Any Time" },
                { id: "24h", label: "Past 24 Hours" },
                { id: "3d", label: "Past 3 Days" },
                { id: "7d", label: "Past Week" },
                { id: "30d", label: "Past Month" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChange({ datePosted: item.id as any })}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    filters.datePosted === item.id
                      ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30"
                      : "bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Sort Order */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" /> Sort Results By
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "latest", label: "⚡ Latest Posted First" },
                { id: "match", label: "🎯 Highest AI Match" },
                { id: "rating", label: "⭐ Best Company Rating" },
                { id: "salary", label: "💰 Highest Salary" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChange({ sortBy: item.id as any })}
                  className={`px-3 py-2.5 rounded-xl text-xs font-semibold border text-left transition-all cursor-pointer ${
                    filters.sortBy === item.id
                      ? "bg-indigo-600 border-indigo-500 text-white shadow-md"
                      : "bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Workplace Mode */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-blue-400" /> Workplace Mode
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: "all", label: "All" },
                { id: "remote", label: "Remote" },
                { id: "hybrid", label: "Hybrid" },
                { id: "onsite", label: "On-site" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChange({ workplace: item.id as any })}
                  className={`px-2.5 py-2 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer ${
                    filters.workplace === item.id
                      ? "bg-indigo-600 border-indigo-500 text-white"
                      : "bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Experience Level */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-purple-400" /> Experience Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "all", label: "All Levels" },
                { id: "entry", label: "Entry / Junior" },
                { id: "mid", label: "Mid-Level" },
                { id: "senior", label: "Senior Level" },
                { id: "lead", label: "Lead / Staff" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChange({ experienceLevel: item.id as any })}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    filters.experienceLevel === item.id
                      ? "bg-indigo-600 border-indigo-500 text-white"
                      : "bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Minimum Company Rating */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-400" /> Minimum Company Scorecard
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: 0, label: "Any Rating" },
                { val: 4.0, label: "★ 4.0+ Stars" },
                { val: 4.5, label: "★ 4.5+ Stars" },
              ].map((item) => (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => onChange({ minRating: item.val })}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    filters.minRating === item.val
                      ? "bg-indigo-600 border-indigo-500 text-white"
                      : "bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 6. Minimum AI Match Score */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Minimum AI Match Score
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: 0, label: "All Matches" },
                { val: 85, label: "85%+ Match" },
                { val: 90, label: "90%+ Top Match" },
              ].map((item) => (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => onChange({ minMatchScore: item.val })}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    filters.minMatchScore === item.val
                      ? "bg-indigo-600 border-indigo-500 text-white"
                      : "bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}
