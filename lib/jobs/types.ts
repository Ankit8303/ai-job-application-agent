export type JobPlatform = "greenhouse" | "lever" | "workable" | "wellfound" | "all";

export interface JobItem {
  id: string;
  user_id: string;
  platform: "greenhouse" | "lever" | "workable" | "wellfound" | string;
  title: string;
  company: string;
  company_logo?: string | null;
  location: string;
  salary?: string | null;
  job_type: string;
  experience_level: string;
  description: string;
  tags: string[];
  match_score: number;
  job_url: string;
  source_url?: string | null;
  applied_status: string;
  saved_status: boolean;
  fetched_at: string;
  created_at: string;
}

export interface PlatformConfig {
  id: "greenhouse" | "lever" | "workable" | "wellfound";
  name: string;
  domain: string;
  querySite: string;
  accentColor: string;
  badgeBg: string;
  borderColor: string;
  textColor: string;
  description: string;
}

export const PLATFORMS: Record<"greenhouse" | "lever" | "workable" | "wellfound", PlatformConfig> = {
  greenhouse: {
    id: "greenhouse",
    name: "Greenhouse",
    domain: "boards.greenhouse.io",
    querySite: "site:boards.greenhouse.io",
    accentColor: "#10B981", // Emerald
    badgeBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    borderColor: "border-emerald-500/30",
    textColor: "text-emerald-400",
    description: "High-growth tech startups and top unicorns",
  },
  lever: {
    id: "lever",
    name: "Lever",
    domain: "jobs.lever.co",
    querySite: "site:jobs.lever.co",
    accentColor: "#3B82F6", // Blue
    badgeBg: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    borderColor: "border-blue-500/30",
    textColor: "text-blue-400",
    description: "Modern engineering teams and fast-growing companies",
  },
  workable: {
    id: "workable",
    name: "Workable",
    domain: "apply.workable.com",
    querySite: "site:apply.workable.com",
    accentColor: "#06B6D4", // Cyan
    badgeBg: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
    borderColor: "border-cyan-500/30",
    textColor: "text-cyan-400",
    description: "Global enterprises and remote-first technology hubs",
  },
  wellfound: {
    id: "wellfound",
    name: "Wellfound",
    domain: "wellfound.com/jobs",
    querySite: "site:wellfound.com/jobs",
    accentColor: "#F59E0B", // Amber
    badgeBg: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    borderColor: "border-amber-500/30",
    textColor: "text-amber-400",
    description: "Early-stage innovators and seed-to-Series B startups",
  },
};
