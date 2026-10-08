"use client";

import { PLATFORMS, JobPlatform } from "@/lib/jobs/types";
import { Check, Globe, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlatformCardProps {
  platformKey: "greenhouse" | "lever" | "workable" | "wellfound";
  isSelected: boolean;
  count?: number;
  onSelect: (platform: JobPlatform) => void;
}

export function PlatformCard({
  platformKey,
  isSelected,
  count,
  onSelect,
}: PlatformCardProps) {
  const config = PLATFORMS[platformKey];

  return (
    <button
      type="button"
      onClick={() => onSelect(isSelected ? "all" : platformKey)}
      className={cn(
        "relative flex flex-col p-4 rounded-2xl border text-left transition-all duration-200 group w-full overflow-hidden",
        isSelected
          ? "bg-slate-900/90 border-indigo-500/80 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/50"
          : "bg-slate-900/40 border-slate-800/80 hover:bg-slate-900/70 hover:border-slate-700/80"
      )}
    >
      {/* Ambient background glow when selected */}
      {isSelected && (
        <div
          className="absolute -right-10 -bottom-10 w-32 h-32 rounded-full blur-2xl opacity-20 pointer-events-none"
          style={{ backgroundColor: config.accentColor }}
        />
      )}

      <div className="flex items-center justify-between w-full mb-2">
        <div className="flex items-center space-x-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shadow-inner"
            style={{
              backgroundColor: `${config.accentColor}20`,
              color: config.accentColor,
              border: `1px solid ${config.accentColor}40`,
            }}
          >
            {config.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <span className="font-semibold text-sm text-white flex items-center gap-1.5">
              {config.name}
              {isSelected && (
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-indigo-500 text-white text-[10px]">
                  <Check className="w-2.5 h-2.5" />
                </span>
              )}
            </span>
            <span className="text-[11px] text-slate-400 block truncate max-w-[140px]">
              {config.domain}
            </span>
          </div>
        </div>

        {typeof count === "number" && (
          <span
            className={cn(
              "text-[11px] font-medium px-2 py-0.5 rounded-full border",
              isSelected
                ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                : "bg-slate-800/60 text-slate-400 border-slate-700/50"
            )}
          >
            {count} jobs
          </span>
        )}
      </div>

      <p className="text-xs text-slate-400 line-clamp-1 mt-1">
        {config.description}
      </p>

      <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/60 text-[11px]">
        <span
          className="font-medium flex items-center gap-1"
          style={{ color: isSelected ? config.accentColor : "#94A3B8" }}
        >
          <Sparkles className="w-3 h-3" />
          Live search ready
        </span>
        <span className="text-slate-500 group-hover:text-slate-300 transition-colors">
          {isSelected ? "Filtering active" : "Click to filter"}
        </span>
      </div>
    </button>
  );
}
