import { DetectedField } from "./types";

export interface CandidateProfileData {
  id?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  location?: string;
  headline?: string;
  summary?: string;
  skills?: string[];
  links?: Array<{ name?: string; url?: string; platform?: string }> | string[];
  experience?: Array<{
    title?: string;
    company?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    current?: boolean;
    description?: string;
  }>;
  education?: Array<{
    institution?: string;
    degree?: string;
    field?: string;
    year?: string;
  }>;
}

export interface CandidateResumeData {
  id?: string;
  file_name?: string;
  file_url?: string;
  storage_path?: string;
}

export interface MappingResult {
  isComplete: boolean;
  missingFields: string[];
  mappedValues: Record<string, string>;
  unmappedRequiredFields: DetectedField[];
}

/**
 * Extracts links (LinkedIn, GitHub, Portfolio) from candidate links array
 */
function extractProfileLinks(links?: CandidateProfileData["links"]): {
  linkedin?: string;
  github?: string;
  portfolio?: string;
} {
  const result: { linkedin?: string; github?: string; portfolio?: string } = {};
  if (!Array.isArray(links)) return result;

  for (const item of links) {
    if (typeof item === "string") {
      const lower = item.toLowerCase();
      if (lower.includes("linkedin.com")) result.linkedin = item;
      else if (lower.includes("github.com")) result.github = item;
      else if (!result.portfolio && (lower.startsWith("http://") || lower.startsWith("https://"))) {
        result.portfolio = item;
      }
    } else if (item && typeof item === "object") {
      const url = item.url || "";
      const name = (item.name || item.platform || "").toLowerCase();
      const lowerUrl = url.toLowerCase();

      if (name.includes("linkedin") || lowerUrl.includes("linkedin.com")) {
        result.linkedin = url;
      } else if (name.includes("github") || lowerUrl.includes("github.com")) {
        result.github = url;
      } else if (name.includes("portfolio") || name.includes("website") || name.includes("personal")) {
        result.portfolio = url;
      } else if (!result.portfolio && url) {
        result.portfolio = url;
      }
    }
  }

  return result;
}

/**
 * Matches a detected form field label/name to a profile field value
 */
export function matchProfileField(
  field: DetectedField,
  profile: CandidateProfileData,
  resume?: CandidateResumeData | null
): { value: string | null; key: string | null } {
  const label = (field.label || "").toLowerCase();
  const name = (field.name || "").toLowerCase();
  const id = (field.id || "").toLowerCase();
  const combined = `${label} ${name} ${id}`;

  const fullName = profile.full_name || "";
  const nameParts = fullName.trim().split(/\s+/);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

  const extractedLinks = extractProfileLinks(profile.links);

  // Resume file upload
  if (field.type === "file" || combined.includes("resume") || combined.includes("cv")) {
    if (resume?.file_url || resume?.storage_path) {
      return { value: resume.file_url || resume.storage_path || "resume.pdf", key: "resume" };
    }
    return { value: null, key: "resume" };
  }

  // First name
  if (
    combined.includes("first name") ||
    combined.includes("firstname") ||
    combined.includes("given name") ||
    combined.includes("fname")
  ) {
    return { value: firstName || null, key: "first_name" };
  }

  // Last name / Surname
  if (
    combined.includes("last name") ||
    combined.includes("lastname") ||
    combined.includes("surname") ||
    combined.includes("family name") ||
    combined.includes("lname")
  ) {
    return { value: lastName || null, key: "last_name" };
  }

  // Full name
  if (
    combined.includes("full name") ||
    combined.includes("your name") ||
    combined.includes("applicant name") ||
    combined === "name" ||
    name === "name"
  ) {
    return { value: fullName || null, key: "full_name" };
  }

  // Email
  if (
    field.type === "email" ||
    combined.includes("email") ||
    combined.includes("e-mail")
  ) {
    return { value: profile.email || null, key: "email" };
  }

  // Phone / Mobile
  if (
    field.type === "tel" ||
    combined.includes("phone") ||
    combined.includes("mobile") ||
    combined.includes("contact number") ||
    combined.includes("telephone")
  ) {
    return { value: profile.phone || null, key: "phone" };
  }

  // LinkedIn
  if (combined.includes("linkedin")) {
    return { value: extractedLinks.linkedin || null, key: "linkedin_url" };
  }

  // GitHub
  if (combined.includes("github") || combined.includes("git")) {
    return { value: extractedLinks.github || null, key: "github_url" };
  }

  // Portfolio / Website / Personal URL
  if (
    combined.includes("portfolio") ||
    combined.includes("website") ||
    combined.includes("personal url") ||
    combined.includes("homepage") ||
    combined.includes("blog")
  ) {
    return { value: extractedLinks.portfolio || null, key: "portfolio_url" };
  }

  // Location / City / Address
  if (
    combined.includes("location") ||
    combined.includes("city") ||
    combined.includes("address") ||
    combined.includes("residence")
  ) {
    return { value: profile.location || null, key: "location" };
  }

  // Current company
  if (combined.includes("current company") || combined.includes("current employer")) {
    const currentExp = profile.experience?.find((e) => e.current) || profile.experience?.[0];
    return { value: currentExp?.company || null, key: "current_company" };
  }

  // Headline / Title
  if (combined.includes("headline") || combined.includes("job title") || combined.includes("role")) {
    return { value: profile.headline || null, key: "headline" };
  }

  // Summary / Cover Letter / Note
  if (
    combined.includes("cover letter") ||
    combined.includes("summary") ||
    combined.includes("about you") ||
    combined.includes("additional information") ||
    combined.includes("note to recruiter")
  ) {
    return { value: profile.summary || null, key: "summary" };
  }

  return { value: null, key: null };
}

/**
 * Checks all detected fields against profile data.
 * Identifies any required fields that cannot be populated from the candidate's profile.
 */
export function mapDetectedFieldsToProfile(
  detectedFields: DetectedField[],
  profile: CandidateProfileData,
  resume?: CandidateResumeData | null
): MappingResult {
  const missingFields: string[] = [];
  const mappedValues: Record<string, string> = {};
  const unmappedRequiredFields: DetectedField[] = [];

  for (const field of detectedFields) {
    const { value, key } = matchProfileField(field, profile, resume);

    if (value) {
      mappedValues[field.id || field.name] = value;
      field.mappedProfileKey = key || undefined;
      field.detectedValue = value;
    } else if (field.required) {
      unmappedRequiredFields.push(field);
      const friendlyName = field.label || field.name || "Required form field";
      if (!missingFields.includes(friendlyName)) {
        missingFields.push(friendlyName);
      }
    }
  }

  return {
    isComplete: missingFields.length === 0,
    missingFields,
    mappedValues,
    unmappedRequiredFields,
  };
}
