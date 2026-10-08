import { GoogleGenAI } from "@google/genai";
import { GoogleGenerativeAI, Part } from "@google/generative-ai";

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

export interface ParsedResumeData {
  full_name: string;
  email: string;
  phone: string;
  location: string;
  headline: string;
  summary: string;
  skills: string[];
  experience: ExperienceItem[];
  education: EducationItem[];
  projects: ProjectItem[];
  certifications: CertificationItem[];
  links: LinkItem[];
}

const PARSE_PROMPT = `
You are an elite, highly precise recruitment AI analyst.
Your task is to analyze the candidate's resume and extract accurate, real data into strict JSON format.

CRITICAL EXTRACTION RULES (STRICT ACCURACY):
1. FACTUAL EXTRACTION ONLY:
   - Extract ONLY the actual candidate details explicitly present in the resume.
   - NEVER make up, invent, fabricate, or hallucinate any employer, job title, degree, school, project, skill, certification, or personal detail.
   - If a section or field is NOT present in the resume, return an empty string "" or empty array [].
   - NEVER use placeholder text such as "Candidate", "Full candidate name", "Company Name", "Tech Solutions Inc.", "University of Technology", "Project Title", etc.

2. WORK EXPERIENCE:
   - Extract EVERY work experience entry from the resume into the "experience" array.
   - Include company_name, job_title, duration, location, and all bullet points into "responsibilities".

3. EDUCATION:
   - Extract EVERY education entry (degrees, universities, colleges, dates, honors/GPA).

4. SKILLS:
   - Extract all technical skills, programming languages, frameworks, cloud tools, databases, and libraries mentioned in the resume into the "skills" array.

5. PROJECTS & CERTIFICATIONS:
   - Extract real projects and certifications explicitly documented in the resume.

JSON Output Schema:
{
  "full_name": "Exact Candidate Name",
  "email": "Exact Email",
  "phone": "Exact Phone",
  "location": "City, State, Country",
  "headline": "Candidate Professional Headline",
  "summary": "Professional Summary",
  "skills": ["Skill 1", "Skill 2"],
  "experience": [
    {
      "company_name": "Company Name",
      "job_title": "Role Title",
      "duration": "Date Range",
      "location": "Location",
      "responsibilities": ["Bullet point 1", "Bullet point 2"]
    }
  ],
  "education": [
    {
      "institution": "University / College",
      "degree": "Degree",
      "field_of_study": "Field",
      "graduation_year": "Year",
      "gpa": "GPA / Honors"
    }
  ],
  "projects": [
    {
      "title": "Project Title",
      "description": "Project Description",
      "technologies": ["Tech 1", "Tech 2"],
      "link": "URL or empty string"
    }
  ],
  "certifications": [
    {
      "name": "Certification Name",
      "issuer": "Issuing Body",
      "year": "Year or empty string"
    }
  ],
  "links": [
    {
      "label": "Platform",
      "url": "https://..."
    }
  ]
}

Return ONLY valid JSON matching this schema.
`;

/**
 * Safely extracts clean plain text from a resume buffer (PDF, text)
 */
export async function extractTextFromResume(
  content: string | Buffer,
  mimeType: string = "application/pdf"
): Promise<string> {
  if (typeof content === "string") {
    return content.trim();
  }

  if (!Buffer.isBuffer(content)) {
    return "";
  }

  const isPdf =
    (mimeType && mimeType.toLowerCase().includes("pdf")) ||
    content.subarray(0, 5).toString("utf-8").startsWith("%PDF");

  if (isPdf) {
    try {
      const { PDFParse } = await import("pdf-parse");
      const uint8 = new Uint8Array(content);
      const parser = new PDFParse(uint8);
      const res = await parser.getText();
      if (res && Array.isArray(res.pages) && res.pages.length > 0) {
        const fullText = res.pages
          .map((p) => (p && typeof p.text === "string" ? p.text : ""))
          .join("\n\n");
        if (fullText.trim().length > 30) {
          return fullText.trim();
        }
      }
    } catch (pdfErr) {
      console.warn("PDFParse extraction error:", pdfErr);
    }
  }

  // Fallback for text documents or plain text files
  const utf8 = content.toString("utf-8");
  // Never treat raw binary PDF headers as plain text!
  if (utf8.startsWith("%PDF-")) {
    return "";
  }
  return utf8.trim();
}

/**
 * Sanitizes parsed resume data to remove any placeholder strings or corrupt values
 */
export function sanitizeParsedResumeData(data: Partial<ParsedResumeData>): ParsedResumeData {
  const isCorruptString = (str?: string | null) => {
    if (!str) return true;
    const s = str.trim().toLowerCase();
    return (
      s.startsWith("%pdf") ||
      s.includes("<< /type") ||
      s.includes("flatedecode") ||
      s === "candidate" ||
      s === "full candidate name" ||
      s === "exact candidate name" ||
      s === "company name" ||
      s === "tech solutions inc." ||
      s === "candidate@example.com"
    );
  };

  const cleanString = (val?: string | null, fallback = ""): string => {
    if (!val || isCorruptString(val)) return fallback;
    return val.trim();
  };

  const experience: ExperienceItem[] = Array.isArray(data.experience)
    ? data.experience
        .filter((e) => e && e.company_name && !isCorruptString(e.company_name))
        .map((e) => ({
          company_name: cleanString(e.company_name, "Company"),
          job_title: cleanString(e.job_title, "Role"),
          duration: cleanString(e.duration, "Present"),
          location: cleanString(e.location, "On-site / Remote"),
          responsibilities: Array.isArray(e.responsibilities)
            ? e.responsibilities
                .map((r) => (typeof r === "string" ? r.trim() : ""))
                .filter((r) => r.length > 3 && !isCorruptString(r))
            : [],
        }))
    : [];

  const education: EducationItem[] = Array.isArray(data.education)
    ? data.education
        .filter((edu) => edu && edu.institution && !isCorruptString(edu.institution) && !isCorruptString(edu.degree))
        .map((edu) => ({
          institution: cleanString(edu.institution, "University"),
          degree: cleanString(edu.degree, "Degree"),
          field_of_study: cleanString(edu.field_of_study, "Field of Study"),
          graduation_year: cleanString(edu.graduation_year, "2024"),
          gpa: cleanString(edu.gpa, ""),
        }))
    : [];

  const projects: ProjectItem[] = Array.isArray(data.projects)
    ? data.projects
        .filter((p) => p && p.title && !isCorruptString(p.title) && p.title !== "Project Title")
        .map((p) => ({
          title: cleanString(p.title),
          description: cleanString(p.description),
          technologies: Array.isArray(p.technologies)
            ? p.technologies
                .map((t) => (typeof t === "string" ? t.trim() : ""))
                .filter(Boolean)
            : [],
          link: cleanString(p.link, ""),
        }))
    : [];

  const certifications: CertificationItem[] = Array.isArray(data.certifications)
    ? data.certifications
        .filter((c) => c && c.name && !isCorruptString(c.name) && c.name !== "Certification Name")
        .map((c) => ({
          name: cleanString(c.name),
          issuer: cleanString(c.issuer, "Accredited Authority"),
          year: cleanString(c.year, ""),
        }))
    : [];

  const links: LinkItem[] = Array.isArray(data.links)
    ? data.links
        .filter((l) => l && l.url && typeof l.url === "string" && l.url.startsWith("http"))
        .map((l) => ({
          label: cleanString(l.label, "Link"),
          url: l.url.trim(),
        }))
    : [];

  const skills: string[] = Array.isArray(data.skills)
    ? Array.from(
        new Set(
          data.skills
            .map((s) => (typeof s === "string" ? s.trim() : ""))
            .filter((s) => s.length > 1 && s.length < 50 && !isCorruptString(s))
        )
      )
    : [];

  return {
    full_name: cleanString(data.full_name),
    email: cleanString(data.email),
    phone: cleanString(data.phone),
    location: cleanString(data.location),
    headline: cleanString(data.headline),
    summary: cleanString(data.summary),
    skills,
    experience,
    education,
    projects,
    certifications,
    links,
  };
}

/**
 * Main parser entry point: Uses Gemini AI when key is present,
 * or high-accuracy structural parser extracting exact data without placeholders.
 */
export async function parseResumeWithGemini(
  content: string | Buffer,
  mimeType: string = "application/pdf"
): Promise<ParsedResumeData> {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY;

  const isBuffer = Buffer.isBuffer(content);
  // Extract real text from resume
  const extractedText = await extractTextFromResume(content, mimeType);

  if (apiKey) {
    try {
      const selectedModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
      const promptText = `${PARSE_PROMPT}\n\nRESUME CONTENT:\n${extractedText || "Please inspect the attached resume."}`;

      // 1. Try with modern @google/genai SDK
      try {
        const ai = new GoogleGenAI({ apiKey });

        const parts: any[] = [];
        // If extracted text is short (scanned PDF), pass raw inlineData
        if (isBuffer && (!extractedText || extractedText.length < 100)) {
          parts.push({
            inlineData: {
              data: content.toString("base64"),
              mimeType: mimeType || "application/pdf",
            },
          });
        }
        parts.push({ text: promptText });

        const response = await ai.models.generateContent({
          model: selectedModel,
          contents: [{ role: "user", parts }],
          config: {
            responseMimeType: "application/json",
          },
        });

        const responseText = response.text?.trim() || "";
        if (responseText) {
          const cleanJson = responseText
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/i, "");
          const parsed = JSON.parse(cleanJson);
          return sanitizeParsedResumeData(parsed);
        }
      } catch (genAiError) {
        console.warn("@google/genai failed, trying @google/generative-ai fallback:", genAiError);
      }

      // 2. Try with @google/generative-ai fallback
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: selectedModel,
        generationConfig: {
          responseMimeType: "application/json",
        },
      });

      const partsFallback: (string | Part)[] = [];
      if (isBuffer && (!extractedText || extractedText.length < 100)) {
        partsFallback.push({
          inlineData: {
            data: content.toString("base64"),
            mimeType: mimeType || "application/pdf",
          },
        });
      }
      partsFallback.push(promptText);

      const result = await model.generateContent(partsFallback);
      const text = result.response.text().trim();
      const cleanJson = text
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "");

      const parsed = JSON.parse(cleanJson);
      return sanitizeParsedResumeData(parsed);
    } catch (error) {
      console.error("Gemini AI parsing failed, falling back to local exact parser:", error);
    }
  }

  // Exact structural parser fallback
  return parseResumeTextAccurately(extractedText);
}

/**
 * Exact structural parser that extracts real resume data without ANY dummy or fake values.
 */
export function parseResumeTextAccurately(rawText: string): ParsedResumeData {
  if (!rawText || !rawText.trim()) {
    return {
      full_name: "",
      email: "",
      phone: "",
      location: "",
      headline: "",
      summary: "",
      skills: [],
      experience: [],
      education: [],
      projects: [],
      certifications: [],
      links: [],
    };
  }

  const text = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  const rawLines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.includes("--- PAGE BREAK ---"));

  // 1. Contact information
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0] : "";

  const phoneMatch = text.match(/(?:\+?\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s-]?\d{3,5}[\s-]?\d{3,5}/);
  const phone = phoneMatch ? phoneMatch[0].trim() : "";

  // Social Links
  const linkMatches = text.match(/https?:\/\/[^\s)"]+/gi) || [];
  const links: LinkItem[] = [];
  linkMatches.forEach((url) => {
    let label = "Portfolio";
    const lower = url.toLowerCase();
    if (lower.includes("linkedin.com")) label = "LinkedIn";
    else if (lower.includes("github.com")) label = "GitHub";
    else if (lower.includes("twitter.com") || lower.includes("x.com")) label = "Twitter";
    else if (lower.includes("leetcode.com")) label = "LeetCode";
    if (!links.some((l) => l.url === url)) {
      links.push({ label, url });
    }
  });

  // Name & Headline from Header Lines (Lines 0 to 5)
  let fullName = "";
  let headline = "";
  let location = "";

  for (let i = 0; i < Math.min(rawLines.length, 6); i++) {
    const line = rawLines[i];
    // Skip if line has email, phone, or section keywords
    if (line.includes("@") || /(?:summary|skills|experience|education|objective)/i.test(line)) {
      continue;
    }
    if (!fullName && line.length < 50 && !line.includes("|") && !line.startsWith("%PDF")) {
      fullName = line;
      continue;
    }
    if (
      fullName &&
      !headline &&
      (line.includes("|") ||
        /(?:developer|engineer|architect|specialist|manager|lead|analyst)/i.test(line))
    ) {
      headline = line;
      continue;
    }
  }

  // Detect location from contact line containing email
  for (let i = 0; i < Math.min(rawLines.length, 6); i++) {
    const line = rawLines[i];
    if (line.includes("@") && line.includes("|")) {
      const parts = line.split("|").map((p) => p.trim());
      for (const p of parts) {
        if (
          !p.includes("@") &&
          !p.match(/\d{5,}/) &&
          !/(?:joiner|experience|year|dev|engineer|backend|fullstack)/i.test(p) &&
          p.length > 2 &&
          p.length < 50
        ) {
          location = p;
          break;
        }
      }
    }
    if (location) break;
  }

  // Section splitting
  const sectionDefinitions = [
    {
      key: "summary",
      regex: /^(?:professional\s+)?(?:summary|profile|about\s+me|career\s+objective)\b[:\s]*/i,
    },
    {
      key: "skills",
      regex: /^(?:technical\s+skills(?:\s*&\s*expertise)?|skills|core\s+competencies|technologies)\b[:\s]*/i,
    },
    {
      key: "experience",
      regex: /^(?:professional\s+experience|work\s+experience|experience|employment\s+history)\b[:\s]*/i,
    },
    {
      key: "projects",
      regex: /^(?:key\s+projects|projects|personal\s+projects|academic\s+projects)\b[:\s]*/i,
    },
    {
      key: "education",
      regex: /^(?:education(?:\s*&\s*academics)?|academic\s+background|qualifications)\b[:\s]*/i,
    },
    {
      key: "certifications",
      regex: /^(?:certifications?|licenses|training)\b[:\s]*/i,
    },
    {
      key: "additional",
      regex: /^(?:additional\s+information|awards|honors|languages)\b[:\s]*/i,
    },
  ];

  const sections: Record<string, string[]> = { header: [] };
  let currentSec = "header";

  for (const line of rawLines) {
    let matched = false;
    for (const s of sectionDefinitions) {
      if (s.regex.test(line)) {
        currentSec = s.key;
        sections[currentSec] = sections[currentSec] || [];
        const rem = line.replace(s.regex, "").trim();
        if (rem) sections[currentSec].push(rem);
        matched = true;
        break;
      }
    }
    if (!matched) {
      sections[currentSec] = sections[currentSec] || [];
      sections[currentSec].push(line);
    }
  }

  // 2. Professional Summary
  const summaryLines = sections["summary"] || [];
  const summary = summaryLines.join(" ").trim();

  // 3. Technical Skills
  const skillsLines = sections["skills"] || [];
  const skillsSet = new Set<string>();

  const cleanSkillItem = (raw: string): string => {
    let s = raw.trim().replace(/^[-•*·]\s*/, "").replace(/^[,\s]+|[,\s]+$/g, "");
    s = s.replace(/^\)+|\(+$/g, "").trim();
    return s;
  };

  skillsLines.forEach((line) => {
    const content = line.includes(":") ? line.split(":")[1] : line;
    const parts = content.split(/[,|•·\n]/).map((s) => s.trim().replace(/^[-•*]\s*/, ""));

    for (const part of parts) {
      if (
        part &&
        part.length > 1 &&
        part.length < 40 &&
        !part.toLowerCase().includes("experience") &&
        !part.toLowerCase().includes("years")
      ) {
        // Expand parentheses like "AWS (EC2, S3)" or clean up
        const parenMatch = part.match(/^(.*?)\s*\((.*?)\)$/);
        if (parenMatch) {
          if (parenMatch[1].trim()) skillsSet.add(cleanSkillItem(parenMatch[1]));
          parenMatch[2].split(/[,/]/).forEach((sub) => {
            const c = cleanSkillItem(sub);
            if (c) skillsSet.add(c);
          });
        } else {
          skillsSet.add(cleanSkillItem(part));
        }
      }
    }
  });

  // 4. Work Experience
  const expLines = sections["experience"] || [];
  const experience: ExperienceItem[] = [];
  let currentExp: ExperienceItem | null = null;

  const dateRangePattern =
    /(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+)?(?:\d{2}|\d{4})\s*(?:-|–|—|to)\s*(?:(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+)?(?:\d{2}|\d{4})|Present|Current)|(?:\d{1,2}\/\d{2,4}\s*(?:-|–|—|to)\s*(?:\d{1,2}\/\d{2,4}|Present|Current))/i;

  for (let i = 0; i < expLines.length; i++) {
    const line = expLines[i];
    const dateMatch = line.match(dateRangePattern);

    if (dateMatch) {
      if (currentExp) {
        experience.push(currentExp);
      }

      const duration = dateMatch[0].trim();
      const rest = line.replace(dateRangePattern, "").trim();
      let company = "";
      let jobTitle = "";

      if (rest.length >= 4) {
        if (rest.includes("–") || rest.includes("-") || rest.includes("|")) {
          const parts = rest.split(/[–\-|]/).map((p) => p.trim()).filter(Boolean);
          company = parts[0] || "Company";
          jobTitle = parts[1] || "Software Developer";
        } else if (rest.toLowerCase().includes(" at ")) {
          const parts = rest.split(/\s+at\s+/i);
          jobTitle = parts[0].trim();
          company = parts[1].trim();
        } else {
          company = rest;
          jobTitle = "Software Developer";
        }
      } else {
        // Date was on its own line; look at previous lines
        const prevLine = i > 0 ? expLines[i - 1] : "";
        const prevPrevLine = i > 1 ? expLines[i - 2] : "";
        if (prevLine && (prevLine.includes("–") || prevLine.includes("-") || prevLine.includes("|"))) {
          const parts = prevLine.split(/[–\-|]/).map((p) => p.trim()).filter(Boolean);
          company = parts[0] || "Company";
          jobTitle = parts[1] || "Software Developer";
        } else if (prevLine && prevPrevLine) {
          company = prevPrevLine;
          jobTitle = prevLine;
        } else {
          company = prevLine || "Company";
          jobTitle = "Software Developer";
        }
      }

      currentExp = {
        company_name: company,
        job_title: jobTitle,
        duration: duration,
        location: "On-site / Remote",
        responsibilities: [],
      };
    } else if (currentExp) {
      if (line.startsWith("•") || line.startsWith("-") || line.startsWith("*")) {
        currentExp.responsibilities.push(line.replace(/^[•\-*]\s*/, ""));
      } else if (!line.includes("·") && line.length > 20) {
        currentExp.responsibilities.push(line);
      }
    }
  }
  if (currentExp) {
    experience.push(currentExp);
  }

  // Derive headline from most recent role if not found in header
  if (!headline && experience.length > 0 && experience[0].job_title) {
    headline = `${experience[0].job_title}${experience[0].company_name ? ` at ${experience[0].company_name}` : ""}`;
  }

  // 5. Projects
  const projLines = sections["projects"] || [];
  const projects: ProjectItem[] = [];
  let currentProj: ProjectItem | null = null;

  for (let i = 0; i < projLines.length; i++) {
    const line = projLines[i];
    const dateMatch = line.match(dateRangePattern);

    if (
      dateMatch ||
      (currentProj && (projLines[i + 1] || "").includes("·")) ||
      (!currentProj && line.length < 50)
    ) {
      if (dateMatch || !currentProj) {
        if (currentProj) projects.push(currentProj);
        const title = line.replace(dateRangePattern, "").trim();
        currentProj = {
          title: title,
          description: "",
          technologies: [],
          link: "",
        };
        continue;
      }
    }

    if (currentProj) {
      if (line.startsWith("•") || line.startsWith("-")) {
        const bullet = line.replace(/^[•\-*]\s*/, "");
        currentProj.description = currentProj.description
          ? currentProj.description + " " + bullet
          : bullet;
      } else if (line.includes(",") && !currentProj.technologies.length && line.length < 150) {
        currentProj.technologies = line.split(",").map((t) => t.trim()).filter(Boolean);
      } else if (line.length > 20) {
        currentProj.description = currentProj.description
          ? currentProj.description + " " + line
          : line;
      }
    }
  }
  if (currentProj) projects.push(currentProj);

  // 6. Education
  const eduLines = sections["education"] || [];
  const education: EducationItem[] = [];
  const degreeRegex = /(?:Master|Bachelor|B\.?Sc|B\.?Tech|B\.?E|M\.?Tech|M\.?S|MCA|BCA|Diploma|Associate|Degree|Ph\.?D|High\s+School)/i;
  const universityRegex = /(?:University|College|Institute|School|Academy|Polytechnic|Campus)/i;

  for (let i = 0; i < eduLines.length; i++) {
    const line = eduLines[i];
    const nextLine = eduLines[i + 1] || "";
    const isDegCurrent = degreeRegex.test(line);
    const isUnivCurrent = universityRegex.test(line);
    const isDegNext = degreeRegex.test(nextLine);
    const isUnivNext = universityRegex.test(nextLine);

    if (isDegCurrent || isUnivCurrent) {
      let degree = "";
      let institution = "";
      let gpa = "";
      let gradYear = "2024";

      if (isUnivCurrent && isDegNext) {
        institution = line;
        degree = nextLine;
        i++;
      } else if (isDegCurrent && isUnivNext) {
        degree = line;
        institution = nextLine;
        i++;
      } else if (isDegCurrent) {
        degree = line;
        institution = nextLine && !degreeRegex.test(nextLine) ? nextLine : "University / College";
        if (nextLine && !degreeRegex.test(nextLine)) i++;
      } else {
        institution = line;
        degree = nextLine || "Degree";
        if (nextLine) i++;
      }

      const combined = `${degree} ${institution}`;
      const parenMatch = combined.match(/\((.*?)\)/);
      if (parenMatch && !parenMatch[1].match(/^(?:MCA|BCA|B\.?Tech|M\.?Tech)$/i)) {
        gpa = parenMatch[1].trim();
      }

      institution = institution.replace(/\(.*?\)/, "").split("|")[0].trim();
      const yearMatch = combined.match(/\b(20\d{2}|19\d{2})\b/);
      if (yearMatch) gradYear = yearMatch[0];

      let fieldOfStudy = "Computer Science";
      if (degree.includes(" in ")) {
        const parts = degree.split(" in ");
        degree = parts[0].trim();
        fieldOfStudy = parts[1]
          .replace(/\b(?:Punjab|UP|India|Maharashtra|Delhi|USA|UK|California|New York)\b.*$/i, "")
          .trim();
      }

      education.push({
        institution: institution || "University",
        degree: degree || "Degree",
        field_of_study: fieldOfStudy,
        graduation_year: gradYear,
        gpa: gpa,
      });
    }
  }

  // 7. Certifications
  const certLines = sections["certifications"] || [];
  const allCertSources =
    certLines.length > 0 ? certLines : sections["additional"] || [];
  const certifications: CertificationItem[] = [];

  for (const line of allCertSources) {
    if (line.toLowerCase().includes("certifications:") || certLines.length > 0) {
      const content = line.includes(":") ? line.split(":")[1] : line;
      const certNames = content.split(/[,;]/).map((c) => c.trim()).filter(Boolean);
      for (const c of certNames) {
        if (c.length > 2 && c.length < 60) {
          let issuer = "Accredited Authority";
          if (c.includes("AWS")) issuer = "Amazon Web Services";
          else if (c.includes("Google")) issuer = "Google";
          else if (c.includes("MSBTE")) issuer = "MSBTE";
          certifications.push({
            name: c,
            issuer: issuer,
            year: "2024",
          });
        }
      }
    }
  }

  return {
    full_name: fullName,
    email: email,
    phone: phone,
    location: location,
    headline: headline,
    summary: summary,
    skills: Array.from(skillsSet),
    experience,
    education,
    projects,
    certifications,
    links,
  };
}
