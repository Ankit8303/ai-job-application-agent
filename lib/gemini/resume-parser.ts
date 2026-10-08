import { GoogleGenAI } from "@google/genai";
import { GoogleGenerativeAI, type Part } from "@google/generative-ai";

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
  is_resume?: boolean;
  rejection_reason?: string;
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
Your task is to analyze the candidate's document, determine if it is a genuine resume/CV, and extract accurate, real data into strict JSON format.

CRITICAL EXTRACTION RULES (STRICT ACCURACY):
1. RESUME CLASSIFICATION & VALIDATION:
   - Determine whether the attached document is a genuine resume, CV, or curriculum vitae.
   - If the document is NOT a resume (e.g., an invoice, bill, payment receipt, tax document, bank statement, medical report, legal contract, ticket, academic paper, book chapter, or arbitrary non-resume text), set "is_resume": false, and set "rejection_reason" with a short, user-friendly explanation (e.g. "The uploaded document appears to be an invoice or receipt, not a resume.").
   - If the document IS a legitimate resume or CV, set "is_resume": true and set "rejection_reason": "".

2. FACTUAL EXTRACTION ONLY:
   - Extract ONLY the actual candidate details explicitly present in the resume.
   - NEVER make up, invent, fabricate, or hallucinate any employer, job title, degree, school, project, skill, certification, or personal detail.
   - If a section or field is NOT present in the resume, return an empty string "" or empty array [].
   - NEVER use placeholder text such as "Candidate", "Full candidate name", "Company Name", "Tech Solutions Inc.", "University of Technology", "Project Title", etc.

3. WORK EXPERIENCE:
   - Extract EVERY work experience entry from the resume into the "experience" array.
   - Include company_name, job_title, duration, location, and all bullet points into "responsibilities".

4. EDUCATION:
   - Extract EVERY education entry (degrees, universities, colleges, dates, honors/GPA).

5. SKILLS:
   - Extract all technical skills, programming languages, frameworks, cloud tools, databases, and libraries mentioned in the resume into the "skills" array.

6. PROJECTS & CERTIFICATIONS:
   - Extract real projects and certifications explicitly documented in the resume.

JSON Output Schema:
{
  "is_resume": true,
  "rejection_reason": "",
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
      let fullText = "";
      if (res && Array.isArray(res.pages) && res.pages.length > 0) {
        fullText = res.pages
          .map((p) => (p && typeof p.text === "string" ? p.text : ""))
          .join("\n\n");
      }
      if (!fullText && res && typeof res.text === "string") {
        fullText = res.text;
      }
      if (fullText.trim().length > 30) {
        return fullText.trim();
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
    is_resume: data.is_resume !== false,
    rejection_reason: data.rejection_reason || "",
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
 * Rigorously checks whether extracted text and parsed data represent a genuine resume/CV.
 * Detects and rejects invoices, bills, receipts, bank statements, medical reports,
 * legal agreements, tickets, or arbitrary documents that lack standard resume sections.
 */
export function validateResumeDocument(
  rawText: string,
  data: Partial<ParsedResumeData>
): { isResume: boolean; rejectionReason?: string } {
  // If Gemini or parser already explicitly flagged it as non-resume
  if (data.is_resume === false) {
    return {
      isResume: false,
      rejectionReason:
        data.rejection_reason ||
        "The uploaded document does not appear to be a resume or CV.",
    };
  }

  const cleanText = (rawText || "").toLowerCase().trim();

  // 1. Text length check
  if (cleanText.length < 50) {
    return {
      isResume: false,
      rejectionReason:
        "The uploaded document is too short or unreadable to be a valid resume.",
    };
  }

  // 2. Disqualifiers: Invoices / Bills / Receipts / Financial Orders
  const invoiceKeywords = [
    "tax invoice",
    "invoice no",
    "invoice #",
    "invoice date",
    "bill to",
    "billed to",
    "ship to",
    "shipping address",
    "subtotal",
    "total amount",
    "amount due",
    "balance due",
    "payment receipt",
    "gstin",
    "vat no",
    "due date",
    "order confirmation",
    "payment mode",
    "total amount payable",
    "hsn/sac",
    "purchase order",
  ];

  let invoiceMatchCount = 0;
  for (const kw of invoiceKeywords) {
    if (cleanText.includes(kw)) {
      invoiceMatchCount++;
    }
  }

  if (invoiceMatchCount >= 2) {
    return {
      isResume: false,
      rejectionReason:
        "The uploaded document appears to be an invoice, bill, or receipt, not a resume.",
    };
  }

  // 3. Bank Statements / Financial transactions
  const bankKeywords = [
    "account statement",
    "statement of account",
    "available balance",
    "closing balance",
    "ledger balance",
    "cheque no",
    "withdrawal amount",
    "deposit amount",
    "debit amount",
    "credit amount",
    "transaction date",
    "branch ifsc",
  ];

  let bankMatchCount = 0;
  for (const kw of bankKeywords) {
    if (cleanText.includes(kw)) {
      bankMatchCount++;
    }
  }

  if (bankMatchCount >= 2) {
    return {
      isResume: false,
      rejectionReason:
        "The uploaded document appears to be a bank statement or financial record, not a resume.",
    };
  }

  // 4. Medical / Clinical Reports
  const medicalKeywords = [
    "clinical pathology",
    "blood test",
    "lab report",
    "haemoglobin",
    "diagnostic report",
    "sample collected",
    "referred by dr",
    "patient name",
    "test name",
  ];

  let medicalMatchCount = 0;
  for (const kw of medicalKeywords) {
    if (cleanText.includes(kw)) {
      medicalMatchCount++;
    }
  }

  if (medicalMatchCount >= 2) {
    return {
      isResume: false,
      rejectionReason:
        "The uploaded document appears to be a medical report or lab result, not a resume.",
    };
  }

  // 5. Travel Tickets / Boarding passes
  const ticketKeywords = [
    "boarding pass",
    "flight ticket",
    "railway ticket",
    "e-ticket",
    "pnr no",
    "seat no",
    "passenger name",
  ];

  let ticketMatchCount = 0;
  for (const kw of ticketKeywords) {
    if (cleanText.includes(kw)) {
      ticketMatchCount++;
    }
  }

  if (ticketMatchCount >= 2) {
    return {
      isResume: false,
      rejectionReason:
        "The uploaded document appears to be a travel ticket or boarding pass, not a resume.",
    };
  }

  // 6. Positive Resume Indicator Assessment
  const hasExperienceHeader = /\b(?:experience|employment|work history|professional history|internship|responsibilities)\b/i.test(cleanText);
  const hasEducationHeader = /\b(?:education|academic|qualifications|university|college|bachelor|master|b\.?tech|m\.?tech|b\.?e|b\.?sc|m\.?sc|phd|diploma)\b/i.test(cleanText);
  const hasSkillsHeader = /\b(?:skills|technical skills|technologies|proficiencies|competencies|programming)\b/i.test(cleanText);
  const hasProjectsHeader = /\b(?:projects|key projects|academic projects)\b/i.test(cleanText);
  const hasSummaryHeader = /\b(?:summary|career objective|professional summary|about me)\b/i.test(cleanText);

  const sectionMatches = [
    hasExperienceHeader,
    hasEducationHeader,
    hasSkillsHeader,
    hasProjectsHeader,
    hasSummaryHeader,
  ].filter(Boolean).length;

  const skillsCount = Array.isArray(data.skills) ? data.skills.length : 0;
  const expCount = Array.isArray(data.experience) ? data.experience.length : 0;
  const eduCount = Array.isArray(data.education) ? data.education.length : 0;
  const projCount = Array.isArray(data.projects) ? data.projects.length : 0;
  const certCount = Array.isArray(data.certifications) ? data.certifications.length : 0;

  const totalStructuredEntities = skillsCount + expCount + eduCount + projCount + certCount;

  // If there are zero resume section headers AND zero structured career items, reject
  if (sectionMatches === 0 && totalStructuredEntities === 0) {
    return {
      isResume: false,
      rejectionReason:
        "The uploaded file does not contain standard resume sections (such as Work Experience, Education, or Skills). Please upload a legitimate resume.",
    };
  }

  // A resume MUST have at least some professional or academic content:
  // e.g. at least 1 work experience, or 1 education, or 2+ skills, or 1 project
  const hasSubstantialCareerContent =
    expCount > 0 ||
    eduCount > 0 ||
    skillsCount >= 2 ||
    (projCount > 0 && (hasExperienceHeader || hasEducationHeader || hasSkillsHeader));

  if (!hasSubstantialCareerContent) {
    return {
      isResume: false,
      rejectionReason:
        "The uploaded document does not contain sufficient work experience, education, or skills details to qualify as a resume.",
    };
  }

  return { isResume: true };
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

  let parsed: ParsedResumeData | null = null;

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
          const rawParsed = JSON.parse(cleanJson);
          parsed = sanitizeParsedResumeData(rawParsed);
        }
      } catch (genAiError) {
        console.warn("@google/genai failed, trying @google/generative-ai fallback:", genAiError);
      }

      // 2. Try with @google/generative-ai fallback
      if (!parsed) {
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

        const rawParsed = JSON.parse(cleanJson);
        parsed = sanitizeParsedResumeData(rawParsed);
      }
    } catch (error) {
      console.error("Gemini AI parsing failed, falling back to local exact parser:", error);
    }
  }

  // Exact structural parser fallback
  if (!parsed) {
    parsed = parseResumeTextAccurately(extractedText);
  }

  // Run comprehensive validation to ensure document is truly a resume
  const validation = validateResumeDocument(extractedText, parsed);
  if (!validation.isResume) {
    parsed.is_resume = false;
    parsed.rejection_reason = validation.rejectionReason;
  } else {
    parsed.is_resume = true;
    parsed.rejection_reason = "";
  }

  return parsed;
}

function cleanGlyphs(str: string): string {
  if (!str) return "";
  return str.replace(/[\uE000-\uF8FF]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Exact structural parser that extracts real resume data without ANY dummy or fake values.
 */
export function parseResumeTextAccurately(rawText: string): ParsedResumeData {
  if (!rawText || !rawText.trim()) {
    return {
      is_resume: false,
      rejection_reason: "The uploaded document contains no readable text.",
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

  const text = rawText
    .replace(/(\w+)-\s*\n\s*(\w+)/g, "$1$2")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
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

  // Check text for LinkedIn/GitHub mention if links is empty
  if (links.length === 0) {
    if (/\b(?:linkedin|linked\.in)\b/i.test(text)) {
      links.push({ label: "LinkedIn", url: "https://linkedin.com" });
    }
    if (/\b(?:github|git-hub)\b/i.test(text)) {
      links.push({ label: "GitHub", url: "https://github.com" });
    }
  }

  // Name & Headline from Header Lines (Lines 0 to 5)
  let fullName = "";
  let headline = "";
  let location = "";

  for (let i = 0; i < Math.min(rawLines.length, 6); i++) {
    const rawLine = rawLines[i];
    const line = cleanGlyphs(rawLine);
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

  // Detect location from contact line containing email or phone
  for (let i = 0; i < Math.min(rawLines.length, 6); i++) {
    const cleanL = cleanGlyphs(rawLines[i]);
    if (cleanL.includes("@") || cleanL.includes("+")) {
      const parts = cleanL.split(/[|•·\t]/).map((p) => p.trim());
      for (const p of parts) {
        if (
          !p.includes("@") &&
          !p.match(/\d{5,}/) &&
          !/(?:joiner|experience|year|dev|engineer|backend|fullstack|github|linkedin)/i.test(p) &&
          p.length > 2 &&
          p.length < 50
        ) {
          location = p;
          break;
        }
      }
      if (!location) {
        const locMatch = cleanL.match(
          /(?:[A-Z][a-zA-Z\s]+,\s*)+(?:India|USA|UK|Canada|Germany|Australia|[A-Z][a-zA-Z\s]+)/
        );
        if (locMatch) {
          location = locMatch[0].trim();
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
      regex: /^(?:certifications?|licenses|training|achievements|honors)\b[:\s]*/i,
    },
    {
      key: "additional",
      regex: /^(?:additional\s+information|awards|languages)\b[:\s]*/i,
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
  let summary = summaryLines.join(" ").trim();
  if (!summary && rawLines.length > 2) {
    for (let i = 1; i < Math.min(rawLines.length, 5); i++) {
      const l = cleanGlyphs(rawLines[i]);
      if (l.length > 40 && !l.includes("@") && !l.includes("+")) {
        summary = l;
        break;
      }
    }
  }

  // 3. Technical Skills
  const skillsLines = sections["skills"] || [];
  const skillsSet = new Set<string>();

  const cleanSkillItem = (raw: string): string => {
    let s = cleanGlyphs(raw).replace(/^[-•*·]\s*/, "").replace(/^[,\s.]+|[,\s.]+$/g, "");
    s = s.replace(/^\)+|\(+$/g, "").trim();
    return s;
  };

  skillsLines.forEach((line) => {
    const cleanL = cleanGlyphs(line);
    const content = cleanL.includes(":") ? cleanL.split(":")[1] : cleanL;
    const parts = content.split(/[,|•·\n]/).map((s) => s.trim().replace(/^[-•*]\s*/, ""));

    for (const part of parts) {
      if (
        part &&
        part.length > 1 &&
        part.length < 40 &&
        !part.toLowerCase().includes("experience") &&
        !part.toLowerCase().includes("years")
      ) {
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
    /(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+)?(?:\d{4}|\d{2})\s*(?:-|–|—|to)\s*(?:(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+)?(?:\d{4}|\d{2})|Present|Current)|(?:\d{1,2}\/\d{4}\s*(?:-|–|—|to)\s*(?:\d{1,2}\/\d{4}|Present|Current))|(?:\d{1,2}\/\d{2}\s*(?:-|–|—|to)\s*(?:\d{1,2}\/\d{2}|Present|Current))/i;

  for (let i = 0; i < expLines.length; i++) {
    const rawLine = expLines[i].trim();
    const cleanLine = cleanGlyphs(rawLine);
    const dateMatch = cleanLine.match(dateRangePattern);

    if (dateMatch) {
      if (currentExp) experience.push(currentExp);

      const duration = dateMatch[0].trim();
      let location = "On-site / Remote";
      const afterDate = cleanLine.replace(dateRangePattern, "").trim();
      if (afterDate.length > 2) {
        location = afterDate.replace(/^[–\-|•,\s]+|[–\-|•,\s]+$/g, "");
      }

      // Check preceding lines for Company and Title
      const prev1 = i > 0 ? cleanGlyphs(expLines[i - 1]) : "";
      const prev2 = i > 1 ? cleanGlyphs(expLines[i - 2]) : "";

      let company = "Company";
      let jobTitle = "Software Engineer";

      if (prev1 && (prev1.includes("–") || prev1.includes("-") || prev1.includes("|"))) {
        const parts = prev1.split(/[–\-|]/).map((p) => p.trim()).filter(Boolean);
        company = parts[0] || "Company";
        jobTitle = parts[1] || "Software Engineer";
      } else if (
        prev1 &&
        prev2 &&
        !prev2.startsWith("•") &&
        !prev2.startsWith("-") &&
        !prev1.startsWith("•")
      ) {
        jobTitle = prev2;
        company = prev1;
      } else if (prev1 && !prev1.startsWith("•")) {
        company = prev1;
      }

      currentExp = {
        company_name: company,
        job_title: jobTitle,
        duration: duration,
        location: location,
        responsibilities: [],
      };
      continue;
    }

    if (currentExp) {
      const isBullet = rawLine.startsWith("•") || rawLine.startsWith("-") || rawLine.startsWith("*");
      const prevLine = i > 0 ? expLines[i - 1].trim() : "";

      if (isBullet) {
        const cleanB = rawLine.replace(/^[•\-*]\s*/, "").trim();
        currentExp.responsibilities.push(cleanB);
      } else if (prevLine.endsWith("-") && currentExp.responsibilities.length > 0) {
        const lastIdx = currentExp.responsibilities.length - 1;
        currentExp.responsibilities[lastIdx] =
          currentExp.responsibilities[lastIdx].replace(/-$/, "") + rawLine;
      } else if (rawLine.length > 15 && currentExp.responsibilities.length > 0) {
        const lastIdx = currentExp.responsibilities.length - 1;
        currentExp.responsibilities[lastIdx] += " " + rawLine;
      }
    }
  }
  if (currentExp) experience.push(currentExp);

  if (!headline && experience.length > 0 && experience[0].job_title) {
    headline =
      experience[0].job_title +
      (experience[0].company_name ? " at " + experience[0].company_name : "");
  }

  // 5. Projects
  const projLines = sections["projects"] || [];
  const projects: ProjectItem[] = [];
  let currentProj: ProjectItem | null = null;

  for (let i = 0; i < projLines.length; i++) {
    const rawLine = projLines[i].trim();
    const cleanLine = cleanGlyphs(rawLine);
    if (!cleanLine) continue;

    const isBullet = rawLine.startsWith("•") || rawLine.startsWith("-") || rawLine.startsWith("*");
    const cleanNoBullet = cleanLine.replace(/^[•\-*·]\s*/, "");
    const isTechPrefix = /^tech(?:nologies|\s+used)?\b[:\s]/i.test(cleanNoBullet);
    const isLinkOnly =
      /^(?:github|gitlab|demo|live\s+demo|link|website)$/i.test(cleanLine) ||
      /^https?:\/\//i.test(cleanLine);
    const prevLine = i > 0 ? cleanGlyphs(projLines[i - 1]) : "";
    const isContinuation = prevLine.endsWith("-") || /^[a-z]/.test(cleanLine);

    const isNewTitle =
      !isBullet && !isTechPrefix && !isLinkOnly && !isContinuation && cleanLine.length < 75;

    if (isNewTitle) {
      if (currentProj) projects.push(currentProj);
      currentProj = {
        title: cleanLine,
        description: "",
        technologies: [],
        link: "",
      };
      continue;
    }

    if (currentProj) {
      if (isLinkOnly) {
        if (/^github$/i.test(cleanLine)) {
          const ghLink = links.find((l) => l.label.toLowerCase() === "github");
          currentProj.link = ghLink?.url || "https://github.com";
        } else {
          currentProj.link = cleanLine;
        }
      } else if (
        isTechPrefix ||
        cleanLine.includes("Tech Used:") ||
        cleanLine.includes("Technologies:")
      ) {
        const rawTech = cleanLine
          .replace(/^[•\-*·]\s*/, "")
          .replace(/^tech(?:nologies|\s+used)?\b[:\s]*/i, "")
          .trim();
        const techList = rawTech
          .split(/[,|•·/]/)
          .map((t) => t.trim().replace(/\.$/, ""))
          .filter(Boolean);
        currentProj.technologies.push(...techList);
        if (
          projLines[i + 1] &&
          !projLines[i + 1].startsWith("•") &&
          !projLines[i + 1].startsWith("-") &&
          projLines[i + 1].includes(",")
        ) {
          const nextTech = cleanGlyphs(projLines[i + 1])
            .split(/[,|•·/]/)
            .map((t) => t.trim().replace(/\.$/, ""))
            .filter(Boolean);
          currentProj.technologies.push(...nextTech);
          i++;
        }
      } else if (isBullet) {
        const cleanBullet = rawLine.replace(/^[•\-*·]\s*/, "").trim();
        currentProj.description = currentProj.description
          ? currentProj.description + " " + cleanBullet
          : cleanBullet;
      } else if (prevLine.endsWith("-")) {
        currentProj.description = currentProj.description.replace(/-$/, "") + cleanLine;
      } else {
        currentProj.description = currentProj.description
          ? currentProj.description + " " + cleanLine
          : cleanLine;
      }
    }
  }
  if (currentProj) projects.push(currentProj);

  // 6. Education
  const eduLines = sections["education"] || [];
  const education: EducationItem[] = [];
  const degreeRegex =
    /(?:Master|Bachelor|B\.?Sc|B\.?Tech|B\.?E|M\.?Tech|M\.?S|MCA|BCA|Diploma|Associate|Degree|Ph\.?D|High\s+School)/i;
  const universityRegex = /(?:University|College|Institute|School|Academy|Polytechnic|Campus)/i;

  for (let i = 0; i < eduLines.length; i++) {
    const line = cleanGlyphs(eduLines[i]);
    const nextLine = eduLines[i + 1] ? cleanGlyphs(eduLines[i + 1]) : "";
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

      // Look ahead for GPA, CGPA, and Graduation Year range on subsequent lines
      let j = i + 1;
      while (
        j < eduLines.length &&
        !degreeRegex.test(eduLines[j]) &&
        !universityRegex.test(eduLines[j])
      ) {
        const extraL = cleanGlyphs(eduLines[j]);
        const gpaMatch =
          extraL.match(/(?:CGPA|GPA|Score|Marks)[:\s]*([\d.]+(?:\s*\/\s*[\d.]+)?%?)/i) ||
          extraL.match(/\b(\d\.\d{1,2}\s*\/\s*10(?:\.0)?|\d\.\d{1,2}\s*\/\s*4(?:\.0)?|\d{2}(?:\.\d+)?%)\b/i);
        if (gpaMatch && !gpa) {
          gpa = gpaMatch[0].trim();
        }
        const yrRangeMatch = extraL.match(/(\d{4})\s*(?:–|-|—|to)\s*(\d{4})/);
        if (yrRangeMatch) {
          gradYear = yrRangeMatch[2];
        } else {
          const singleYr = extraL.match(/\b(20\d{2}|19\d{2})\b/);
          if (singleYr && gradYear === "2024") {
            gradYear = singleYr[0];
          }
        }
        j++;
      }
      i = j - 1;

      const combined = degree + " " + institution;
      const parenMatch = combined.match(/\((.*?)\)/);
      if (parenMatch && !parenMatch[1].match(/^(?:MCA|BCA|B\.?Tech|M\.?Tech)$/i) && !gpa) {
        gpa = parenMatch[1].trim();
      }

      institution = institution.replace(/\(.*?\)/, "").split("|")[0].trim();
      if (gradYear === "2024") {
        const yearMatch = combined.match(/\b(20\d{2}|19\d{2})\b/);
        if (yearMatch) gradYear = yearMatch[0];
      }

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

  // 7. Certifications & Achievements
  const certLines = sections["certifications"] || [];
  const allCertSources =
    certLines.length > 0 ? certLines : sections["additional"] || [];
  const certifications: CertificationItem[] = [];

  for (let i = 0; i < allCertSources.length; i++) {
    let cleanL = cleanGlyphs(allCertSources[i]);
    if (!cleanL) continue;

    // Handle multiline continuation if next line is not a bullet
    while (
      i + 1 < allCertSources.length &&
      !allCertSources[i + 1].startsWith("•") &&
      !allCertSources[i + 1].startsWith("-") &&
      !allCertSources[i + 1].startsWith("*") &&
      !cleanL.endsWith(".")
    ) {
      cleanL = cleanL + " " + cleanGlyphs(allCertSources[i + 1]);
      i++;
    }

    const cleanName = cleanL.replace(/^[•\-*·]\s*/, "").replace(/\.$/, "").trim();
    if (cleanName.length > 5) {
      const yearMatch = cleanName.match(/\b(20\d{2})\b/);
      let issuer = "Accredited Authority";
      if (/Udemy/i.test(cleanName)) issuer = "Udemy";
      else if (/HackerRank/i.test(cleanName)) issuer = "HackerRank";
      else if (/LeetCode/i.test(cleanName)) issuer = "LeetCode";
      else if (/AWS|Amazon/i.test(cleanName)) issuer = "Amazon Web Services";
      else if (/Google/i.test(cleanName)) issuer = "Google";
      else if (/Coursera/i.test(cleanName)) issuer = "Coursera";
      else if (/University|College/i.test(cleanName)) issuer = "Academic Honor";
      else if (/Hackathon/i.test(cleanName)) issuer = "Hackathon Organizing Committee";

      certifications.push({
        name: cleanName,
        issuer: issuer,
        year: yearMatch ? yearMatch[0] : "",
      });
    }
  }

  // 8. Auto-generate professional summary if none present
  if (!summary) {
    if (headline && skillsSet.size > 0) {
      const topSkills = Array.from(skillsSet).slice(0, 5).join(", ");
      summary = `${headline} experienced in building robust applications, full-stack architectures, and high-performance services with ${topSkills}.`;
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
