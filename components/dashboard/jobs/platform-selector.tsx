"use client";

import { useState } from "react";
import { JobPlatform, JobTier, PLATFORMS } from "@/lib/jobs/types";
import {
  Globe,
  Briefcase,
  Building2,
  Sparkles,
  Layers,
  MapPin,
  Laptop,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PlatformSelectorProps {
  selectedPlatform: JobPlatform;
  selectedTier: JobTier;
  onSelectPlatform: (platform: JobPlatform, tier?: JobTier) => void;
  onSelectTier: (tier: JobTier) => void;
  platformCounts: Record<string, number>;
  totalJobsCount: number;
}

export function PlatformSelector({
  selectedPlatform,
  selectedTier,
  onSelectPlatform,
  onSelectTier,
  platformCounts,
  totalJobsCount,
}: PlatformSelectorProps) {
  // Category tabs definition
  const tiers: Array<{ id: JobTier; label: string; icon: any; flag?: string }> = [
    { id: "all", label: "All Platforms", icon: Globe },
    { id: "indian", label: "Indian Portals", icon: MapPin, flag: "🇮🇳" },
    { id: "remote", label: "Dedicated Remote", icon: Laptop, flag: "🌍" },
    { id: "global", label: "Global Tech", icon: Sparkles, flag: "🌐" },
    { id: "career_pages", label: "Company Career Sites", icon: Building2, flag: "🏢" },
  ];

  // Specific platforms mapped to each tier
  const tierPlatformsMap: Record<JobTier, Array<{ id: string; name: string }>> = {
    all: [
      { id: "all", name: "All Sources" },
      { id: "naukri", name: "Naukri (IN)" },
      { id: "internshala", name: "Internshala (IN)" },
      { id: "instahyre", name: "Instahyre (IN)" },
      { id: "cutshort", name: "Cutshort (IN)" },
      { id: "remote_ok", name: "RemoteOK" },
      { id: "levels_fyi", name: "Levels.fyi" },
      { id: "ashby", name: "Ashby ATS" },
      { id: "greenhouse", name: "Greenhouse ATS" },
      { id: "lever", name: "Lever ATS" },
      { id: "career_pages", name: "Company Career Sites" },
    ],
    indian: [
      { id: "all", name: "All Indian Tech" },
      { id: "naukri", name: "Naukri" },
      { id: "cutshort", name: "Cutshort" },
      { id: "instahyre", name: "Instahyre" },
      { id: "hirist", name: "Hirist" },
      { id: "foundit", name: "Foundit" },
      { id: "internshala", name: "Internshala" },
    ],
    remote: [
      { id: "all", name: "All Remote" },
      { id: "remote_ok", name: "RemoteOK" },
      { id: "jobicy", name: "Jobicy" },
      { id: "ashby", name: "Ashby Remote" },
      { id: "greenhouse", name: "Greenhouse Remote" },
      { id: "weworkremotely", name: "WeWorkRemotely" },
      { id: "arc_dev", name: "Arc.dev" },
      { id: "himalayas", name: "Himalayas" },
    ],
    global: [
      { id: "all", name: "All Global Tech" },
      { id: "ashby", name: "Ashby Unicorns" },
      { id: "greenhouse", name: "Greenhouse Tech" },
      { id: "levels_fyi", name: "Levels.fyi" },
      { id: "linkedin", name: "LinkedIn" },
      { id: "indeed", name: "Indeed" },
      { id: "yc_startups", name: "YC Startups" },
      { id: "wellfound", name: "Wellfound" },
    ],
    career_pages: [
      { id: "all", name: "All Direct Sites" },
      { id: "ashby", name: "Ashby ATS" },
      { id: "greenhouse", name: "Greenhouse ATS" },
      { id: "lever", name: "Lever ATS" },
      { id: "career_pages", name: "Direct Company Sites" },
    ],
  };

  const currentPlatformList = tierPlatformsMap[selectedTier] || tierPlatformsMap.all;

  // Calculate sum for the active tier
  const getTierCount = (tierId: JobTier) => {
    if (tierId === "all") return totalJobsCount;
    return platformCounts[tierId] ?? 0;
  };

  const getPillCount = (pillId: string) => {
    if (pillId === "all") {
      return getTierCount(selectedTier);
    }
    if (pillId === "career_pages") {
      return platformCounts.career_pages ?? (platformCounts.ashby || 0) + (platformCounts.greenhouse || 0) + (platformCounts.lever || 0);
    }
    if (selectedTier !== "all" && platformCounts[`${selectedTier}:${pillId}`] !== undefined) {
      return platformCounts[`${selectedTier}:${pillId}`];
    }
    return platformCounts[pillId] || 0;
  };

  return (
    <div className="space-y-3.5">
      {/* 1. Regional & Tier Header Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-400" />
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-300">
            Select Job Market & Platforms
          </h2>
        </div>

        {selectedPlatform !== "all" && (
          <button
            type="button"
            onClick={() => {
              onSelectTier("all");
              onSelectPlatform("all", "all");
            }}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium cursor-pointer"
          >
            Reset to All Sources
          </button>
        )}
      </div>

      {/* Main Category Tabs (Indian / Remote / Global / Career Sites) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-800">
        {tiers.map((t) => {
          const isTierActive = selectedTier === t.id;
          const count = getTierCount(t.id);
          const Icon = t.icon;

          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                onSelectTier(t.id);
                onSelectPlatform("all", t.id);
              }}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer shrink-0",
                isTierActive
                  ? "bg-gradient-to-r from-indigo-600 to-indigo-500 border-indigo-400/80 text-white shadow-lg shadow-indigo-600/30 scale-[1.01]"
                  : "bg-slate-900/60 hover:bg-slate-800/80 border-slate-800 text-slate-300 hover:border-slate-700"
              )}
            >
              <span className="text-sm">{t.flag}</span>
              <span>{t.label}</span>
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-mono",
                  isTierActive ? "bg-indigo-700/80 text-white" : "bg-slate-800 text-slate-400"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 2. Granular Sub-Platform Pills for the Active Tier */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800 pl-1">
        {currentPlatformList.map((p) => {
          const isSelected =
            selectedPlatform === p.id ||
            (p.id === "all" && (selectedPlatform === "all" || selectedPlatform === selectedTier));
          const count = getPillCount(p.id);
          const config = PLATFORMS[p.id];

          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelectPlatform(p.id, selectedTier)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer shrink-0",
                isSelected
                  ? "bg-slate-800 border-indigo-400 text-white shadow-sm ring-1 ring-indigo-500/50"
                  : "bg-slate-950/60 hover:bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200"
              )}
            >
              {config?.accentColor && (
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: config.accentColor }}
                />
              )}
              <span>{p.name}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-400">
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
