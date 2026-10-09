import { CompanyRatingMetrics } from "./company-ratings";

export type JobTier = "all" | "indian" | "global" | "remote" | "career_pages";

export type JobPlatform =
  // Indian Platforms
  | "naukri"
  | "cutshort"
  | "instahyre"
  | "hirist"
  | "foundit"
  | "internshala"
  // Global Platforms
  | "linkedin"
  | "indeed"
  | "wellfound"
  | "dice"
  | "builtin"
  | "levels_fyi"
  | "yc_startups"
  // Remote Platforms
  | "remote_ok"
  | "weworkremotely"
  | "arc_dev"
  | "remotive"
  | "himalayas"
  | "toptal"
  // ATS & Direct Career Pages
  | "workday"
  | "ashby"
  | "greenhouse"
  | "lever"
  | "career_pages"
  | "all"
  | string;

export interface JobRequirements {
  matched_skills: string[];
  missing_skills: string[];
  experience_required: string;
  education: string;
  key_responsibilities: string[];
  why_you_match: string[];
}

export interface JobItem {
  id: string;
  user_id: string;
  platform: JobPlatform;
  title: string;
  company: string;
  company_logo?: string | null;
  location: string;
  salary?: string | null;
  currency?: "INR" | "USD" | "EUR" | string;
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
  // Extended recruiter & company reputation fields
  posted_at?: string; // Recruiter posting timestamp (ISO string)
  company_ratings?: CompanyRatingMetrics;
  requirements?: JobRequirements;
  source_tier?: JobTier;
}

export interface PlatformConfig {
  id: string;
  name: string;
  tier: JobTier;
  domain: string;
  accentColor: string;
  badgeBg: string;
  borderColor: string;
  textColor: string;
  description: string;
  country?: string; // e.g. "IN" or "GLOBAL" or "REMOTE"
}

export const PLATFORMS: Record<string, PlatformConfig> = {
  // ── 🇮🇳 Indian Portals ──────────────────────────────
  naukri: {
    id: "naukri",
    name: "Naukri",
    tier: "indian",
    domain: "naukri.com",
    accentColor: "#0A66C2",
    badgeBg: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    borderColor: "border-blue-500/30",
    textColor: "text-blue-400",
    description: "India's #1 corporate hiring network across top MNCs and tech hubs",
    country: "IN",
  },
  cutshort: {
    id: "cutshort",
    name: "Cutshort",
    tier: "indian",
    domain: "cutshort.io",
    accentColor: "#10B981",
    badgeBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    borderColor: "border-emerald-500/30",
    textColor: "text-emerald-400",
    description: "Fast-track tech hiring with direct founder and engineering manager connects",
    country: "IN",
  },
  instahyre: {
    id: "instahyre",
    name: "Instahyre",
    tier: "indian",
    domain: "instahyre.com",
    accentColor: "#8B5CF6",
    badgeBg: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    borderColor: "border-purple-500/30",
    textColor: "text-purple-400",
    description: "AI-driven talent match at high-growth Indian startups & tech unicorns",
    country: "IN",
  },
  hirist: {
    id: "hirist",
    name: "Hirist",
    tier: "indian",
    domain: "hirist.tech",
    accentColor: "#F59E0B",
    badgeBg: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    borderColor: "border-amber-500/30",
    textColor: "text-amber-400",
    description: "Dedicated tech & engineering jobs with verified CTC benchmarks",
    country: "IN",
  },
  foundit: {
    id: "foundit",
    name: "Foundit",
    tier: "indian",
    domain: "foundit.in",
    accentColor: "#EC4899",
    badgeBg: "bg-pink-500/10 text-pink-400 border-pink-500/30",
    borderColor: "border-pink-500/30",
    textColor: "text-pink-400",
    description: "Formerly Monster India; enterprise roles across IT, finance, & sales",
    country: "IN",
  },
  internshala: {
    id: "internshala",
    name: "Internshala",
    tier: "indian",
    domain: "internshala.com",
    accentColor: "#06B6D4",
    badgeBg: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
    borderColor: "border-cyan-500/30",
    textColor: "text-cyan-400",
    description: "Fresher jobs, graduate developer roles, and certified paid internships",
    country: "IN",
  },

  // ── 🌐 Global Portals ──────────────────────────────
  linkedin: {
    id: "linkedin",
    name: "LinkedIn",
    tier: "global",
    domain: "linkedin.com/jobs",
    accentColor: "#0284C7",
    badgeBg: "bg-sky-500/10 text-sky-400 border-sky-500/30",
    borderColor: "border-sky-500/30",
    textColor: "text-sky-400",
    description: "World's largest professional hiring network and verified recruiters",
    country: "GLOBAL",
  },
  indeed: {
    id: "indeed",
    name: "Indeed",
    tier: "global",
    domain: "indeed.com",
    accentColor: "#2563EB",
    badgeBg: "bg-blue-600/10 text-blue-300 border-blue-600/30",
    borderColor: "border-blue-600/30",
    textColor: "text-blue-300",
    description: "Comprehensive multi-national job directory & candidate reviews",
    country: "GLOBAL",
  },
  wellfound: {
    id: "wellfound",
    name: "Wellfound",
    tier: "global",
    domain: "wellfound.com/jobs",
    accentColor: "#EF4444",
    badgeBg: "bg-red-500/10 text-red-400 border-red-500/30",
    borderColor: "border-red-500/30",
    textColor: "text-red-400",
    description: "Seed to Series C startups with transparent salary + equity terms",
    country: "GLOBAL",
  },
  dice: {
    id: "dice",
    name: "Dice",
    tier: "global",
    domain: "dice.com",
    accentColor: "#E11D48",
    badgeBg: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    borderColor: "border-rose-500/30",
    textColor: "text-rose-400",
    description: "High-paying tech contracting, cybersec, and systems architecture",
    country: "GLOBAL",
  },
  builtin: {
    id: "builtin",
    name: "BuiltIn",
    tier: "global",
    domain: "builtin.com",
    accentColor: "#14B8A6",
    badgeBg: "bg-teal-500/10 text-teal-400 border-teal-500/30",
    borderColor: "border-teal-500/30",
    textColor: "text-teal-400",
    description: "Hub-based startup and tech communities across major metropolitan hubs",
    country: "GLOBAL",
  },
  levels_fyi: {
    id: "levels_fyi",
    name: "Levels.fyi",
    tier: "global",
    domain: "levels.fyi/jobs",
    accentColor: "#10B981",
    badgeBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    borderColor: "border-emerald-500/30",
    textColor: "text-emerald-400",
    description: "Top-tier verified engineering and product roles with level compensation",
    country: "GLOBAL",
  },
  yc_startups: {
    id: "yc_startups",
    name: "YC Startups",
    tier: "global",
    domain: "workatastartup.com",
    accentColor: "#F97316",
    badgeBg: "bg-orange-500/10 text-orange-400 border-orange-500/30",
    borderColor: "border-orange-500/30",
    textColor: "text-orange-400",
    description: "Direct hiring from Y Combinator founders and founding teams",
    country: "GLOBAL",
  },

  // ── 🌍 Remote-First Boards ─────────────────────────
  remote_ok: {
    id: "remote_ok",
    name: "RemoteOK",
    tier: "remote",
    domain: "remoteok.com",
    accentColor: "#EF4444",
    badgeBg: "bg-red-500/10 text-red-400 border-red-500/30",
    borderColor: "border-red-500/30",
    textColor: "text-red-400",
    description: "Worldwide remote roles for digital nomads and distributed teams",
    country: "REMOTE",
  },
  weworkremotely: {
    id: "weworkremotely",
    name: "WeWorkRemotely",
    tier: "remote",
    domain: "weworkremotely.com",
    accentColor: "#F59E0B",
    badgeBg: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    borderColor: "border-amber-500/30",
    textColor: "text-amber-400",
    description: "Largest remote work community with 100% remote job security",
    country: "REMOTE",
  },
  arc_dev: {
    id: "arc_dev",
    name: "Arc.dev",
    tier: "remote",
    domain: "arc.dev",
    accentColor: "#6366F1",
    badgeBg: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
    borderColor: "border-indigo-500/30",
    textColor: "text-indigo-400",
    description: "Pre-vetted remote software engineering and tech lead roles globally",
    country: "REMOTE",
  },
  remotive: {
    id: "remotive",
    name: "Remotive",
    tier: "remote",
    domain: "remotive.com",
    accentColor: "#3B82F6",
    badgeBg: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    borderColor: "border-blue-500/30",
    textColor: "text-blue-400",
    description: "Hand-curated global remote tech, design, and customer success roles",
    country: "REMOTE",
  },
  himalayas: {
    id: "himalayas",
    name: "Himalayas",
    tier: "remote",
    domain: "himalayas.app",
    accentColor: "#10B981",
    badgeBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    borderColor: "border-emerald-500/30",
    textColor: "text-emerald-400",
    description: "Modern remote directory with timezone and compensation transparency",
    country: "REMOTE",
  },
  toptal: {
    id: "toptal",
    name: "Toptal",
    tier: "remote",
    domain: "toptal.com",
    accentColor: "#22C55E",
    badgeBg: "bg-green-500/10 text-green-400 border-green-500/30",
    borderColor: "border-green-500/30",
    textColor: "text-green-400",
    description: "Elite top 3% freelance and high-paying contract engineering talent",
    country: "REMOTE",
  },
  jobicy: {
    id: "jobicy",
    name: "Jobicy",
    tier: "remote",
    domain: "jobicy.com",
    accentColor: "#0EA5E9",
    badgeBg: "bg-sky-500/10 text-sky-400 border-sky-500/30",
    borderColor: "border-sky-500/30",
    textColor: "text-sky-400",
    description: "Verified global tech roles with direct applicant tracking links",
    country: "REMOTE",
  },

  // ── 🏢 Direct Career Sites & Enterprise ATS ─────────
  career_pages: {
    id: "career_pages",
    name: "Company Career Sites",
    tier: "career_pages",
    domain: "careers.*",
    accentColor: "#8B5CF6",
    badgeBg: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    borderColor: "border-purple-500/30",
    textColor: "text-purple-400",
    description: "Direct official employer portals (e.g. Google, Apple, Stripe, Swiggy)",
    country: "GLOBAL",
  },
  workday: {
    id: "workday",
    name: "Workday",
    tier: "career_pages",
    domain: "myworkdayjobs.com",
    accentColor: "#F59E0B",
    badgeBg: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    borderColor: "border-amber-500/30",
    textColor: "text-amber-400",
    description: "Fortune 500, global banks, and enterprise leaders",
    country: "GLOBAL",
  },
  ashby: {
    id: "ashby",
    name: "Ashby",
    tier: "career_pages",
    domain: "jobs.ashbyhq.com",
    accentColor: "#EC4899",
    badgeBg: "bg-pink-500/10 text-pink-400 border-pink-500/30",
    borderColor: "border-pink-500/30",
    textColor: "text-pink-400",
    description: "Hypergrowth tech unicorns and modern AI teams",
    country: "GLOBAL",
  },
  greenhouse: {
    id: "greenhouse",
    name: "Greenhouse",
    tier: "career_pages",
    domain: "boards.greenhouse.io",
    accentColor: "#10B981",
    badgeBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    borderColor: "border-emerald-500/30",
    textColor: "text-emerald-400",
    description: "High-growth tech startups and unicorn engineering squads",
    country: "GLOBAL",
  },
  lever: {
    id: "lever",
    name: "Lever",
    tier: "career_pages",
    domain: "jobs.lever.co",
    accentColor: "#3B82F6",
    badgeBg: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    borderColor: "border-blue-500/30",
    textColor: "text-blue-400",
    description: "Modern engineering teams and fast-growing product companies",
    country: "GLOBAL",
  },
};

/**
 * Resolves platform config dynamically for any platform or URL
 */
export function resolvePlatformConfig(platformKey: string, jobUrl?: string): PlatformConfig {
  const normalizedKey = (platformKey || "").toLowerCase();
  if (PLATFORMS[normalizedKey]) {
    return PLATFORMS[normalizedKey];
  }

  // Derive from URL patterns
  if (jobUrl) {
    const u = jobUrl.toLowerCase();
    // Indian
    if (u.includes("naukri.com")) return PLATFORMS.naukri;
    if (u.includes("cutshort.io")) return PLATFORMS.cutshort;
    if (u.includes("instahyre.com")) return PLATFORMS.instahyre;
    if (u.includes("hirist.tech") || u.includes("hirist.com")) return PLATFORMS.hirist;
    if (u.includes("foundit.in")) return PLATFORMS.foundit;
    if (u.includes("internshala.com")) return PLATFORMS.internshala;
    // Remote
    if (u.includes("remoteok.com")) return PLATFORMS.remote_ok;
    if (u.includes("weworkremotely.com")) return PLATFORMS.weworkremotely;
    if (u.includes("arc.dev")) return PLATFORMS.arc_dev;
    if (u.includes("remotive.com")) return PLATFORMS.remotive;
    if (u.includes("himalayas.app")) return PLATFORMS.himalayas;
    if (u.includes("toptal.com")) return PLATFORMS.toptal;
    if (u.includes("jobicy.com")) return PLATFORMS.jobicy;
    // Global
    if (u.includes("levels.fyi")) return PLATFORMS.levels_fyi;
    if (u.includes("dice.com")) return PLATFORMS.dice;
    if (u.includes("builtin.com")) return PLATFORMS.builtin;
    if (u.includes("workatastartup.com")) return PLATFORMS.yc_startups;
    if (u.includes("linkedin.com")) return PLATFORMS.linkedin;
    if (u.includes("indeed.com")) return PLATFORMS.indeed;
    if (u.includes("wellfound.com")) return PLATFORMS.wellfound;
    // ATS
    if (u.includes("myworkdayjobs.com")) return PLATFORMS.workday;
    if (u.includes("ashbyhq.com")) return PLATFORMS.ashby;
    if (u.includes("greenhouse.io")) return PLATFORMS.greenhouse;
    if (u.includes("lever.co")) return PLATFORMS.lever;
  }

  return {
    id: normalizedKey || "career_pages",
    name: platformKey ? platformKey.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Company Career Site",
    tier: "career_pages",
    domain: jobUrl ? new URL(jobUrl).hostname : "careers.direct",
    accentColor: "#8B5CF6",
    badgeBg: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    borderColor: "border-purple-500/30",
    textColor: "text-purple-400",
    description: "Direct official employer portal",
    country: "GLOBAL",
  };
}

export interface JobFilterOptions {
  searchQuery: string;
  selectedPlatforms: string[];
  selectedTier: JobTier;
  datePosted: "all" | "24h" | "3d" | "7d" | "30d";
  workplace: "all" | "remote" | "hybrid" | "onsite";
  experienceLevel: "all" | "entry" | "mid" | "senior" | "lead";
  jobType: "all" | "fulltime" | "contract" | "parttime" | "internship";
  minSalary: number;
  minRating: number;
  minMatchScore: number;
  sortBy: "latest" | "match" | "rating" | "salary";
  status: "all" | "saved" | "applied" | "not_applied";
}
