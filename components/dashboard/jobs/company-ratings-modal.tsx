"use client";

import { CompanyRatingMetrics } from "@/lib/jobs/company-ratings";
import {
  Star,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  DollarSign,
  Heart,
  X,
  Users,
  Award,
} from "lucide-react";

interface CompanyRatingsModalProps {
  company: string;
  ratings?: CompanyRatingMetrics;
  isOpen: boolean;
  onClose: () => void;
}

export function CompanyRatingsModal({
  company,
  ratings,
  isOpen,
  onClose,
}: CompanyRatingsModalProps) {
  if (!isOpen || !ratings) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-indigo-950/40 text-white overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow accent */}
        <div className="absolute -top-24 -right-24 w-52 h-52 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between pb-5 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Verified Reputation
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Users className="w-3 h-3 text-slate-400" />
                {ratings.reviews_count.toLocaleString()} employee reviews
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white mt-1.5 tracking-tight">
              {company} Scorecard
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Big Overall Rating Banner */}
        <div className="my-5 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-emerald-500/10 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300 font-extrabold text-2xl shadow-inner">
              {ratings.overall.toFixed(1)}
            </div>
            <div>
              <div className="flex items-center gap-1 text-amber-400">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-4 h-4 ${
                      s <= Math.round(ratings.overall)
                        ? "fill-amber-400 text-amber-400"
                        : "text-slate-700"
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                {ratings.recommend_percent}% of employees recommend working here
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
              Tier Status
            </span>
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 justify-end">
              <Award className="w-3.5 h-3.5" /> High Trust
            </span>
          </div>
        </div>

        {/* 4 Pillars Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* 1. Culture & Work Environment */}
          <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-800 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                <Heart className="w-3.5 h-3.5 text-rose-400" />
                Culture & Values
              </span>
              <span className="text-sm font-bold text-white font-mono">
                {ratings.culture.toFixed(1)} / 5
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-rose-500 h-1.5 rounded-full"
                style={{ width: `${(ratings.culture / 5) * 100}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Work-life balance, collaborative environment & leadership
            </p>
          </div>

          {/* 2. Timely Payment & Reliability */}
          <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-800 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Timely Payment
              </span>
              <span className="text-sm font-bold text-emerald-400 font-mono">
                {ratings.timely_payment.toFixed(1)} / 5
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full"
                style={{ width: `${(ratings.timely_payment / 5) * 100}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Guaranteed on-time payroll, bonus disbursements & benefits
            </p>
          </div>

          {/* 3. Learning & Growth */}
          <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-800 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                Learning & Growth
              </span>
              <span className="text-sm font-bold text-blue-400 font-mono">
                {ratings.growth.toFixed(1)} / 5
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-blue-500 h-1.5 rounded-full"
                style={{ width: `${(ratings.growth / 5) * 100}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Mentorship, career upward mobility & skill development
            </p>
          </div>

          {/* 4. Median Salary Package */}
          <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-800 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                Median Package
              </span>
              <span className="text-xs font-bold text-amber-300 font-mono">
                Top 15%
              </span>
            </div>
            <div className="text-base font-extrabold text-white mt-1">
              {ratings.median_salary}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Based on verified level & compensation reports
            </p>
          </div>
        </div>

        {/* Highlights */}
        {ratings.highlights && ratings.highlights.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-800">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Company Strengths
            </h4>
            <div className="flex flex-wrap gap-2">
              {ratings.highlights.map((h, i) => (
                <span
                  key={i}
                  className="text-xs px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium"
                >
                  ✓ {h}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-white transition-colors cursor-pointer"
          >
            Close Scorecard
          </button>
        </div>
      </div>
    </div>
  );
}
