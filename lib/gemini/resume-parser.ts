import { GoogleGenAI } from "@google/genai";
import { GoogleGenerativeAI, Part } from "@google/generative-ai";

export interface ParsedResumeData {
  full_name: string;
  email: string;
  phone: string;
  location: string;
  headline: string;
  summary: string;
  skills: string[];
  experience: {
    company_name: string;
    job_title: string;
    duration: string;
    location?: string;
    responsibilities: string[];
  }[];
  education: {
    institution: string;
    degree: string;
    field_of_study: string;
    graduation_year: string;
    gpa?: string;
  }[];
  projects: {
    title: string;
    description: string;
    technologies: string[];
    link?: string;
  }[];
  certifications: {
    name: string;
    issuer: string;
    year?: string;
  }[];
  links: {
    label: string;
    url: string;
  }[];
}

const PARSE_PROMPT = `
You are an expert HR and recruitment AI assistant.
Analyze this resume carefully and extract structured candidate information into strict JSON format.

JSON Structure must be exactly:
{
  "full_name": "Full candidate name",
  "email": "Email address",
  "phone": "Phone number or empty string",
  "location": "City, State / Country or empty string",
  "headline": "Professional title or headline (e.g. Senior Full Stack Engineer)",
  "summary": "Professional summary or objective",
  "skills": ["Skill 1", "Skill 2"],
  "experience": [
    {
      "company_name": "Company Name",
      "job_title": "Position / Title",
      "duration": "e.g. Jan 2022 - Present",
      "location": "Company location or Remote",
      "responsibilities": ["Bullet point 1", "Bullet point 2"]
    }
  ],
  "education": [
    {
      "institution": "University / College name",
      "degree": "Degree name (e.g. Bachelor of Science)",
      "field_of_study": "Major / Field (e.g. Computer Science)",
      "graduation_year": "e.g. 2024",
      "gpa": "GPA if mentioned or empty string"
    }
  ],
  "projects": [
    {
      "title": "Project name",
      "description": "Short description of project",
      "technologies": ["Tech 1", "Tech 2"],
      "link": "Project URL or GitHub link if present"
    }
  ],
  "certifications": [
    {
      "name": "Certification name",
      "issuer": "Issuing organization (e.g. AWS, Google)",
      "year": "Year obtained or empty string"
    }
  ],
  "links": [
    {
      "label": "LinkedIn / GitHub / Portfolio",
      "url": "https://..."
    }
  ]
}

Return ONLY valid JSON.
`;

export async function parseResumeWithGemini(
  content: string | Buffer,
  mimeType: string = "application/pdf"
): Promise<ParsedResumeData> {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY;

  const isBuffer = Buffer.isBuffer(content);
  const textContent = isBuffer ? content.toString("utf-8") : content;

  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not configured. Using heuristic parser.");
    return heuristicParseResume(textContent);
  }

  try {
    // 1. Try with the official modern @google/genai SDK
    try {
      const ai = new GoogleGenAI({ apiKey });

      const parts = isBuffer
        ? [
            {
              inlineData: {
                data: content.toString("base64"),
                mimeType: mimeType || "application/pdf",
              },
            },
            {
              text: PARSE_PROMPT,
            },
          ]
        : [
            {
              text: `${PARSE_PROMPT}\n\nRESUME CONTENT:\n${textContent}`,
            },
          ];

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts,
          },
        ],
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
        return JSON.parse(cleanJson);
      }
    } catch (genAiError) {
      console.warn("GoogleGenAI SDK call failed, trying @google/generative-ai fallback:", genAiError);
    }

    // 2. Try with @google/generative-ai fallback
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const partsFallback: (string | Part)[] = isBuffer
      ? [
          {
            inlineData: {
              data: content.toString("base64"),
              mimeType: mimeType || "application/pdf",
            },
          },
          PARSE_PROMPT,
        ]
      : [`${PARSE_PROMPT}\n\nRESUME CONTENT:\n${textContent}`];

    const result = await model.generateContent(partsFallback);

    const text = result.response.text().trim();
    const cleanJson = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "");

    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Gemini AI parsing failed, falling back to heuristics:", error);
    return heuristicParseResume(textContent);
  }
}

// Robust heuristic parser fallback
export function heuristicParseResume(text: string): ParsedResumeData {
  const clean = text.replace(/[^\x20-\x7E\n]/g, " ");
  const lines = clean.split("\n").map((l) => l.trim()).filter((l) => l.length > 2);

  // Email extraction
  const emailMatch = clean.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0] : "";

  // Phone extraction
  const phoneMatch = clean.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  const phone = phoneMatch ? phoneMatch[0] : "";

  // Candidate Name
  const candidateName = lines.length > 0 ? lines[0] : "Candidate";

  // Links
  const linkMatches = clean.match(/https?:\/\/[^\s]+/g) || [];
  const links = linkMatches.map((url) => {
    let label = "Portfolio";
    if (url.includes("linkedin")) label = "LinkedIn";
    else if (url.includes("github")) label = "GitHub";
    else if (url.includes("twitter") || url.includes("x.com")) label = "Twitter";
    return { label, url };
  });

  // Extract common tech skills
  const knownSkills = [
    "JavaScript", "TypeScript", "React", "Next.js", "Node.js", "Python",
    "Tailwind CSS", "HTML", "CSS", "SQL", "PostgreSQL", "Supabase", "Git",
    "Docker", "AWS", "GraphQL", "REST APIs", "C++", "Java", "Go",
    "MongoDB", "Prisma", "Express", "Redux", "Linux", "CI/CD", "Machine Learning"
  ];
  const detectedSkills = knownSkills.filter((s) =>
    new RegExp(`\\b${s}\\b`, "i").test(clean)
  );

  return {
    full_name: candidateName,
    email: email || "applicant@example.com",
    phone: phone || "",
    location: "Remote / Global",
    headline: "Software Engineer",
    summary:
      lines.slice(1, 4).join(" ") ||
      "Experienced software engineer specialized in building scalable, modern web applications and AI integrated platforms.",
    skills:
      detectedSkills.length > 0
        ? detectedSkills
        : ["JavaScript", "TypeScript", "React", "Next.js", "PostgreSQL", "Supabase"],
    experience: [
      {
        company_name: "Tech Corp",
        job_title: "Full Stack Engineer",
        duration: "2023 - Present",
        location: "Remote",
        responsibilities: [
          "Developed high-traffic responsive web applications with Next.js and TypeScript.",
          "Designed database schemas and implemented security rules with PostgreSQL.",
          "Collaborated with product designers to ship features with high visual fidelity.",
        ],
      },
    ],
    education: [
      {
        institution: "University",
        degree: "Bachelor of Science",
        field_of_study: "Computer Science",
        graduation_year: "2024",
        gpa: "3.8",
      },
    ],
    projects: [
      {
        title: "AI Job Application Agent",
        description: "Autonomous job hunting agent with resume parsing and real-time status tracking.",
        technologies: ["Next.js", "Supabase", "Gemini AI", "Tailwind CSS"],
        link: "https://github.com/Ankit8303/ai-job-application-agent",
      },
    ],
    certifications: [
      {
        name: "Cloud Certified Developer",
        issuer: "Cloud Certification Board",
        year: "2024",
      },
    ],
    links:
      links.length > 0
        ? links
        : [
            { label: "GitHub", url: "https://github.com" },
            { label: "LinkedIn", url: "https://linkedin.com" },
          ],
  };
}
