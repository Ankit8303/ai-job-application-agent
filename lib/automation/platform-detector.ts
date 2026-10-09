import { PlatformDetectionResult, SupportedPlatform } from "./types";

/**
 * Detects the ATS platform or job portal from URL and platform metadata.
 */
export function detectJobPlatform(
  jobUrl: string,
  platformHint?: string
): PlatformDetectionResult {
  const normalizedUrl = (jobUrl || "").toLowerCase();
  const normalizedHint = (platformHint || "").toLowerCase();

  // 1. Greenhouse ATS
  if (
    normalizedUrl.includes("greenhouse.io") ||
    normalizedUrl.includes("boards.greenhouse.io") ||
    normalizedUrl.includes("job-boards.greenhouse.io") ||
    normalizedHint === "greenhouse"
  ) {
    return {
      platform: "greenhouse",
      displayName: "Greenhouse ATS",
      atsFamily: "greenhouse",
      isSupportedDirectly: true,
      confidence: 0.98,
    };
  }

  // 2. Lever ATS
  if (
    normalizedUrl.includes("jobs.lever.co") ||
    normalizedUrl.includes("lever.co") ||
    normalizedHint === "lever"
  ) {
    return {
      platform: "lever",
      displayName: "Lever ATS",
      atsFamily: "lever",
      isSupportedDirectly: true,
      confidence: 0.98,
    };
  }

  // 3. Workable ATS
  if (
    normalizedUrl.includes("workable.com") ||
    normalizedUrl.includes("apply.workable.com") ||
    normalizedHint === "workable"
  ) {
    return {
      platform: "workable",
      displayName: "Workable ATS",
      atsFamily: "workable",
      isSupportedDirectly: true,
      confidence: 0.96,
    };
  }

  // 4. Ashby ATS
  if (
    normalizedUrl.includes("ashbyhq.com") ||
    normalizedUrl.includes("jobs.ashbyhq.com") ||
    normalizedHint === "ashby"
  ) {
    return {
      platform: "ashby",
      displayName: "Ashby ATS",
      atsFamily: "ashby",
      isSupportedDirectly: true,
      confidence: 0.97,
    };
  }

  // 5. Internshala
  if (normalizedUrl.includes("internshala.com") || normalizedHint === "internshala") {
    return {
      platform: "internshala",
      displayName: "Internshala",
      atsFamily: "internshala",
      isSupportedDirectly: true,
      confidence: 0.95,
    };
  }

  // 6. Naukri
  if (normalizedUrl.includes("naukri.com") || normalizedHint === "naukri") {
    return {
      platform: "naukri",
      displayName: "Naukri",
      atsFamily: "naukri",
      isSupportedDirectly: true,
      confidence: 0.95,
    };
  }

  // 7. Cutshort
  if (normalizedUrl.includes("cutshort.io") || normalizedHint === "cutshort") {
    return {
      platform: "cutshort",
      displayName: "Cutshort",
      atsFamily: "generic",
      isSupportedDirectly: true,
      confidence: 0.9,
    };
  }

  // 8. Instahyre
  if (normalizedUrl.includes("instahyre.com") || normalizedHint === "instahyre") {
    return {
      platform: "instahyre",
      displayName: "Instahyre",
      atsFamily: "generic",
      isSupportedDirectly: true,
      confidence: 0.9,
    };
  }

  // 9. RemoteOK
  if (normalizedUrl.includes("remoteok.com") || normalizedHint === "remote_ok") {
    return {
      platform: "remote_ok",
      displayName: "RemoteOK",
      atsFamily: "generic",
      isSupportedDirectly: true,
      confidence: 0.85,
    };
  }

  // 10. Jobicy
  if (normalizedUrl.includes("jobicy.com") || normalizedHint === "jobicy") {
    return {
      platform: "jobicy",
      displayName: "Jobicy",
      atsFamily: "generic",
      isSupportedDirectly: true,
      confidence: 0.85,
    };
  }

  // Default: Company Direct Site / Generic ATS
  return {
    platform: "generic",
    displayName: "Direct Company Career Portal",
    atsFamily: "generic",
    isSupportedDirectly: true,
    confidence: 0.8,
  };
}
