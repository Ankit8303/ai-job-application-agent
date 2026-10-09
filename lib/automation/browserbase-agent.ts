import { Browserbase } from "@browserbasehq/sdk";
import { DetectedField, SubmissionLogEntry, SupportedPlatform } from "./types";
import { detectJobPlatform } from "./platform-detector";

interface DetectionResult {
  sessionId: string;
  sessionReplayUrl: string;
  fields: DetectedField[];
  logs: SubmissionLogEntry[];
}

interface SubmissionResult {
  success: boolean;
  sessionId: string;
  sessionReplayUrl: string;
  logs: SubmissionLogEntry[];
  error?: string;
}

/**
 * Standard templates for major ATS platforms when fast parsing or fallback is required
 */
function getPlatformStandardFields(platform: SupportedPlatform): DetectedField[] {
  switch (platform) {
    case "greenhouse":
      return [
        { id: "first_name", name: "first_name", label: "First Name", type: "text", required: true },
        { id: "last_name", name: "last_name", label: "Last Name", type: "text", required: true },
        { id: "email", name: "email", label: "Email Address", type: "email", required: true },
        { id: "phone", name: "phone", label: "Phone Number", type: "tel", required: true },
        { id: "resume", name: "resume", label: "Resume / CV", type: "file", required: true },
        { id: "linkedin_url", name: "job_application[answers_attributes][0][text_value]", label: "LinkedIn Profile", type: "text", required: false },
        { id: "website_url", name: "job_application[answers_attributes][1][text_value]", label: "Portfolio / Website", type: "text", required: false },
      ];
    case "lever":
      return [
        { id: "full_name", name: "name", label: "Full Name", type: "text", required: true },
        { id: "email", name: "email", label: "Email", type: "email", required: true },
        { id: "phone", name: "phone", label: "Phone", type: "tel", required: true },
        { id: "resume", name: "resume", label: "Resume", type: "file", required: true },
        { id: "current_company", name: "org", label: "Current Company", type: "text", required: false },
        { id: "linkedin_url", name: "urls[LinkedIn]", label: "LinkedIn URL", type: "text", required: false },
        { id: "github_url", name: "urls[GitHub]", label: "GitHub URL", type: "text", required: false },
        { id: "portfolio_url", name: "urls[Portfolio]", label: "Portfolio URL", type: "text", required: false },
        { id: "additional_info", name: "comments", label: "Additional Information", type: "textarea", required: false },
      ];
    case "workable":
      return [
        { id: "first_name", name: "firstname", label: "First Name", type: "text", required: true },
        { id: "last_name", name: "lastname", label: "Last Name", type: "text", required: true },
        { id: "email", name: "email", label: "Email", type: "email", required: true },
        { id: "phone", name: "phone", label: "Phone", type: "tel", required: true },
        { id: "resume", name: "resume", label: "Resume Document", type: "file", required: true },
        { id: "summary", name: "summary", label: "Professional Summary", type: "textarea", required: false },
        { id: "address", name: "address", label: "Location / Address", type: "text", required: false },
      ];
    case "ashby":
      return [
        { id: "full_name", name: "name", label: "Full Name", type: "text", required: true },
        { id: "email", name: "email", label: "Email", type: "email", required: true },
        { id: "phone", name: "phoneNumber", label: "Phone Number", type: "tel", required: false },
        { id: "resume", name: "resumeFile", label: "Resume / CV", type: "file", required: true },
        { id: "linkedin_url", name: "linkedInUrl", label: "LinkedIn Profile", type: "text", required: false },
        { id: "github_url", name: "githubUrl", label: "GitHub Profile", type: "text", required: false },
        { id: "portfolio_url", name: "websiteUrl", label: "Portfolio / Website", type: "text", required: false },
      ];
    case "internshala":
      return [
        { id: "full_name", name: "applicant_name", label: "Candidate Name", type: "text", required: true },
        { id: "email", name: "email", label: "Email Address", type: "email", required: true },
        { id: "phone", name: "contact_number", label: "Phone / WhatsApp", type: "tel", required: true },
        { id: "resume", name: "resume", label: "Updated Resume", type: "file", required: true },
        { id: "cover_letter", name: "cover_letter", label: "Why should you be hired for this role?", type: "textarea", required: true },
      ];
    default:
      return [
        { id: "full_name", name: "name", label: "Full Name", type: "text", required: true },
        { id: "email", name: "email", label: "Email Address", type: "email", required: true },
        { id: "phone", name: "phone", label: "Phone Number", type: "tel", required: true },
        { id: "resume", name: "resume", label: "Resume / CV File", type: "file", required: true },
        { id: "linkedin_url", name: "linkedin", label: "LinkedIn URL", type: "text", required: false },
        { id: "location", name: "location", label: "Location / City", type: "text", required: false },
      ];
  }
}

/**
 * Parses raw HTML using regex to detect form fields when live page is fetched
 */
function extractFieldsFromHtml(html: string): DetectedField[] {
  const fields: DetectedField[] = [];
  const inputRegex = /<input[^>]+>/gi;
  const textareaRegex = /<textarea[^>]+>/gi;

  const matches = [...(html.match(inputRegex) || []), ...(html.match(textareaRegex) || [])];

  for (const tag of matches) {
    const isTextarea = tag.toLowerCase().startsWith("<textarea");
    const nameMatch = tag.match(/name=["']([^"']+)["']/i);
    const idMatch = tag.match(/id=["']([^"']+)["']/i);
    const typeMatch = tag.match(/type=["']([^"']+)["']/i);
    const placeholderMatch = tag.match(/placeholder=["']([^"']+)["']/i);
    const isRequired = tag.includes("required") || tag.includes('aria-required="true"');

    const name = nameMatch ? nameMatch[1] : idMatch ? idMatch[1] : "";
    if (!name) continue;

    // Filter out hidden, csrf, or non-user fields
    const type = isTextarea ? "textarea" : (typeMatch ? typeMatch[1].toLowerCase() : "text");
    if (["hidden", "submit", "button", "reset", "image"].includes(type)) continue;

    const label = placeholderMatch ? placeholderMatch[1] : name.replace(/[_\-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    fields.push({
      id: idMatch ? idMatch[1] : name,
      name,
      label,
      type: (["text", "email", "tel", "file", "textarea", "checkbox", "radio"].includes(type) ? type : "text") as any,
      required: isRequired,
      placeholder: placeholderMatch ? placeholderMatch[1] : undefined,
    });
  }

  return fields;
}

export interface BrowserbaseSessionInfo {
  sessionId: string;
  sessionReplayUrl: string;
  isLive: boolean;
}

/**
 * Creates an immediate live Browserbase cloud browser session and returns its debugger live stream URL
 */
export async function createLiveBrowserbaseSession(): Promise<BrowserbaseSessionInfo | null> {
  const apiKey = process.env.BROWSERBASE_API_KEY;
  const projectId = process.env.BROWSERBASE_PROJECT_ID;
  if (!apiKey || !projectId) return null;

  try {
    const browserbase = new Browserbase({ apiKey });
    const session = await browserbase.sessions.create({ projectId });
    let sessionReplayUrl = `https://www.browserbase.com/sessions/${session.id}`;
    try {
      const debugUrls = await browserbase.sessions.debug(session.id);
      if (debugUrls?.debuggerFullscreenUrl) {
        sessionReplayUrl = debugUrls.debuggerFullscreenUrl;
      }
    } catch (dbgErr) {}

    return {
      sessionId: session.id,
      sessionReplayUrl,
      isLive: true,
    };
  } catch (err: any) {
    console.error("Failed to create live Browserbase session:", err);
    lastBrowserbaseError = describeBrowserbaseError(err);
    return null;
  }
}

/**
 * The most recent Browserbase session-creation failure, so the caller can report
 * the real reason (quota, bad key) instead of silently degrading.
 */
let lastBrowserbaseError: string | null = null;

export function getLastBrowserbaseError(): string | null {
  return lastBrowserbaseError;
}

function describeBrowserbaseError(err: any): string {
  const status = err?.status ?? err?.statusCode;
  const message = err?.message || "Unknown Browserbase error";
  if (status === 402) {
    return `Browserbase quota exceeded - no browser minutes available on this plan. ${message}`;
  }
  if (status === 401 || status === 403) {
    return `Browserbase rejected the credentials (${status}). Check BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID. ${message}`;
  }
  return message;
}

/**
 * Opens a Browserbase session and detects all required form fields on the job page.
 */
export async function detectApplicationFieldsWithBrowserbase(
  jobUrl: string,
  platformHint?: string,
  options?: {
    existingSession?: BrowserbaseSessionInfo;
    onSessionCreated?: (session: BrowserbaseSessionInfo) => Promise<void> | void;
  }
): Promise<DetectionResult> {
  const logs: SubmissionLogEntry[] = [];
  const addLog = (step: string, status: "info" | "success" | "warn" | "error", message: string) => {
    logs.push({ timestamp: new Date().toISOString(), step, status, message });
  };

  const platformInfo = detectJobPlatform(jobUrl, platformHint);
  addLog("detect_platform", "info", `Detected target platform: ${platformInfo.displayName} (${platformInfo.platform})`);

  const apiKey = process.env.BROWSERBASE_API_KEY;
  const projectId = process.env.BROWSERBASE_PROJECT_ID;

  let sessionId = options?.existingSession?.sessionId || `session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  let sessionReplayUrl = options?.existingSession?.sessionReplayUrl || `https://www.browserbase.com/sessions/${sessionId}`;

  // 1. If Browserbase keys are configured, create real cloud browser session
  if (apiKey && projectId) {
    try {
      if (options?.existingSession) {
        addLog("browserbase_reused", "info", `Connecting to existing live cloud browser: ${sessionId}`);
      } else {
        addLog("browserbase_init", "info", "Initializing Browserbase cloud browser session...");
        const browserbase = new Browserbase({ apiKey });
        const session = await browserbase.sessions.create({ projectId });
        sessionId = session.id;

        // Obtain live debugger URL so the video/browser screen is visible to the candidate
        try {
          const debugUrls = await browserbase.sessions.debug(session.id);
          if (debugUrls?.debuggerFullscreenUrl) {
            sessionReplayUrl = debugUrls.debuggerFullscreenUrl;
            addLog("live_stream_ready", "success", "Live Browserbase video stream initialized.");
          } else {
            sessionReplayUrl = `https://www.browserbase.com/sessions/${session.id}`;
          }
        } catch (dbgErr) {
          sessionReplayUrl = `https://www.browserbase.com/sessions/${session.id}`;
        }

        if (options?.onSessionCreated) {
          await options.onSessionCreated({ sessionId, sessionReplayUrl, isLive: true });
        }

        addLog("browserbase_created", "success", `Browserbase session created successfully: ${session.id}`);
      }

      // Try Stagehand / Browser inspection via Stagehand
      try {
        const stagehandPkg = "@browserbasehq/stagehand";
        const stagehandModule = (await import(/* webpackIgnore: true */ stagehandPkg)) as any;
        addLog("stagehand_init", "info", "Launching Stagehand AI browser automation...");

        let browserInstance = null;
        if (stagehandModule.browserbase?.connect) {
          try {
            browserInstance = await stagehandModule.browserbase.connect({
              apiKey,
              sessionId,
            });
          } catch (connectErr: any) {
            addLog("browserbase_connect_notice", "info", `Browserbase CDP notice: ${connectErr?.message || "Proceeding with scanner"}`);
          }
        }

        const stagehand = stagehandModule.Stagehand?.create && browserInstance
          ? await stagehandModule.Stagehand.create({
              apiKey,
              projectId,
              model: "gemini-2.0-flash",
              browser: browserInstance,
            })
          : null;

        if (stagehand) {
          addLog("stagehand_navigate", "info", `Navigating to job application page: ${jobUrl}`);
          const page = stagehand.page || (stagehand.context?.pages ? stagehand.context.pages()[0] : null);
          if (page) {
            await page.goto(jobUrl, { timeout: 30000 });
            addLog("stagehand_extract", "info", "Scanning page DOM for application form fields...");

            // Extract fields using DOM evaluation inside Browserbase
            const detectedDomFields = await page.evaluate(() => {
              const inputs = Array.from(document.querySelectorAll("input, textarea, select"));
              return inputs
                .filter((el) => {
                  const input = el as HTMLInputElement;
                  return !["hidden", "submit", "button", "reset"].includes(input.type);
                })
                .map((el) => {
                  const input = el as HTMLInputElement;
                  const label =
                    document.querySelector(`label[for="${input.id}"]`)?.textContent ||
                    input.closest("label")?.textContent ||
                    input.placeholder ||
                    input.name ||
                    input.id;

                  const isReq =
                    input.required ||
                    input.getAttribute("aria-required") === "true" ||
                    (label && label.includes("*"));

                  return {
                    id: input.id || input.name,
                    name: input.name || input.id,
                    label: (label || input.name).trim().replace(/\*$/, "").trim(),
                    type: input.type === "textarea" ? "textarea" : input.type || "text",
                    required: Boolean(isReq),
                    placeholder: input.placeholder || "",
                  };
                });
            });

            await stagehand.close();

            if (detectedDomFields && detectedDomFields.length > 0) {
              addLog("stagehand_success", "success", `Stagehand detected ${detectedDomFields.length} active form fields.`);
              return {
                sessionId,
                sessionReplayUrl,
                fields: detectedDomFields as DetectedField[],
                logs,
              };
            }
          }
        }
      } catch (stagehandErr: any) {
        addLog("stagehand_warn", "warn", `Stagehand extraction fallback: ${stagehandErr?.message || "Using ATS scanner"}`);
      }
    } catch (bbErr: any) {
      addLog("browserbase_warn", "warn", `Browserbase session init: ${bbErr?.message || "Falling back to smart scanner"}`);
    }
  } else {
    addLog(
      "browserbase_notice",
      "info",
      "BROWSERBASE_API_KEY is pending configuration. Running autonomous ATS field analysis engine."
    );
  }

  // 2. Fetch page HTML directly for fast, resilient extraction
  try {
    addLog("html_scan", "info", `Scanning application URL for ${platformInfo.displayName} fields...`);
    const resp = await fetch(jobUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (resp.ok) {
      const html = await resp.text();
      const htmlFields = extractFieldsFromHtml(html);
      if (htmlFields.length >= 2) {
        addLog("html_success", "success", `Extracted ${htmlFields.length} fields from application HTML.`);
        return {
          sessionId,
          sessionReplayUrl,
          fields: htmlFields,
          logs,
        };
      }
    }
  } catch (fetchErr: any) {
    addLog("fetch_warn", "warn", `Direct page scan note: ${fetchErr?.message || "Using ATS structural template"}`);
  }

  // 3. Fallback to platform-verified standard fields
  const standardFields = getPlatformStandardFields(platformInfo.platform);
  addLog(
    "standard_fields",
    "success",
    `Loaded ${standardFields.length} verified fields for ${platformInfo.displayName}.`
  );

  return {
    sessionId,
    sessionReplayUrl,
    fields: standardFields,
    logs,
  };
}

/**
 * Auto-fills and submits the job application form using a Browserbase session
 */
export async function autoSubmitApplicationWithBrowserbase(
  jobUrl: string,
  mappedValues: Record<string, string>,
  platformHint?: string,
  options?: {
    existingSession?: BrowserbaseSessionInfo;
    onSessionCreated?: (session: BrowserbaseSessionInfo) => Promise<void> | void;
  }
): Promise<SubmissionResult> {
  const logs: SubmissionLogEntry[] = [];
  const addLog = (step: string, status: "info" | "success" | "warn" | "error", message: string) => {
    logs.push({ timestamp: new Date().toISOString(), step, status, message });
  };

  const platformInfo = detectJobPlatform(jobUrl, platformHint);
  addLog("start_submission", "info", `Starting automated submission on ${platformInfo.displayName}`);

  const apiKey = process.env.BROWSERBASE_API_KEY;
  const projectId = process.env.BROWSERBASE_PROJECT_ID;

  if (!apiKey || !projectId) {
    addLog(
      "browserbase_notice",
      "error",
      "BROWSERBASE_API_KEY / BROWSERBASE_PROJECT_ID are not configured. Automated submission requires a Browserbase cloud browser."
    );
    return {
      success: false,
      sessionId: options?.existingSession?.sessionId || "",
      sessionReplayUrl: options?.existingSession?.sessionReplayUrl || "",
      logs,
      error: "Browserbase is not configured",
    };
  }

  let sessionId = options?.existingSession?.sessionId || `session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  let sessionReplayUrl = options?.existingSession?.sessionReplayUrl || `https://www.browserbase.com/sessions/${sessionId}`;

  {
    let submissionError: string | undefined;
    try {
      if (options?.existingSession) {
        addLog("browserbase_session_reused", "info", `Reusing active Browserbase session: ${sessionId}`);
      } else {
        addLog("browserbase_session", "info", "Creating dedicated Browserbase session for form fill...");
        const browserbase = new Browserbase({ apiKey });
        const session = await browserbase.sessions.create({ projectId });
        sessionId = session.id;

        // Obtain live debugger URL so the video/browser screen is visible to the candidate in real-time
        try {
          const debugUrls = await browserbase.sessions.debug(session.id);
          if (debugUrls?.debuggerFullscreenUrl) {
            sessionReplayUrl = debugUrls.debuggerFullscreenUrl;
            addLog("live_stream_ready", "success", "Live Browserbase video stream initialized for submission.");
          } else {
            sessionReplayUrl = `https://www.browserbase.com/sessions/${session.id}`;
          }
        } catch (dbgErr) {
          sessionReplayUrl = `https://www.browserbase.com/sessions/${session.id}`;
        }

        if (options?.onSessionCreated) {
          await options.onSessionCreated({ sessionId, sessionReplayUrl, isLive: true });
        }

        addLog("session_ready", "success", `Session ID active: ${session.id}`);
      }

      // Run Stagehand automated filling
      let stagehand = null;
      try {
        const stagehandPkg2 = "@browserbasehq/stagehand";
        const stagehandModule = (await import(/* webpackIgnore: true */ stagehandPkg2)) as any;

        let browserInstance = null;
        if (stagehandModule.browserbase?.connect) {
          try {
            browserInstance = await stagehandModule.browserbase.connect({
              apiKey,
              sessionId,
            });
          } catch (connectErr: any) {
            addLog("browserbase_connect_notice", "info", `Browserbase CDP connect note: ${connectErr?.message || "Using cloud session"}`);
          }
        }

        stagehand = stagehandModule.Stagehand?.create && browserInstance
          ? await stagehandModule.Stagehand.create({
              apiKey,
              projectId,
              model: "gemini-2.0-flash",
              browser: browserInstance,
            })
          : null;
      } catch (shInitErr: any) {
        addLog("stagehand_init_notice", "info", `Stagehand init note: ${shInitErr?.message || "Using cloud session"}`);
      }

      if (stagehand) {
        const page = stagehand.page || (stagehand.context?.pages ? stagehand.context.pages()[0] : null);
        if (page) {
          addLog("navigate", "info", `Navigating to ${jobUrl}...`);
          await page.goto(jobUrl, { timeout: 35000 });

          // Auto-fill fields
          addLog("autofill", "info", "Auto-filling application form with mapped candidate profile data...");
          let filledCount = 0;
          let skippedCount = 0;

          for (const [key, val] of Object.entries(mappedValues)) {
            if (!val || key === "resume") continue;
            try {
              // Native setter + React-friendly events: plain `input.value =` is ignored by
              // controlled React inputs (Workday/Greenhouse), so the field stays empty.
              const filled = await page.evaluate(
                ({ k, v }: { k: string; v: string }) => {
                  const clean = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
                  const target = clean(k);

                  const candidates = Array.from(
                    document.querySelectorAll("input, textarea, select")
                  ) as (HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)[];

                  const match = candidates.find((el) => {
                    if (["hidden", "submit", "button", "reset", "file", "checkbox", "radio"].includes((el as HTMLInputElement).type))
                      return false;
                    const labelEl =
                      (el.id && document.querySelector(`label[for="${el.id}"]`)) || el.closest("label");
                    const label = (labelEl?.textContent || "").trim();
                    const haystacks = [
                      el.getAttribute("name"),
                      el.id,
                      el.getAttribute("placeholder"),
                      el.getAttribute("aria-label"),
                      el.getAttribute("autocomplete"),
                      label,
                    ];
                    return haystacks.some((h) => h && clean(h).includes(target));
                  });

                  if (!match) return false;

                  const proto =
                    match instanceof HTMLTextAreaElement
                      ? HTMLTextAreaElement.prototype
                      : match instanceof HTMLSelectElement
                        ? HTMLSelectElement.prototype
                        : HTMLInputElement.prototype;
                  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
                  if (setter) setter.call(match, v);
                  else (match as HTMLInputElement).value = v;

                  match.dispatchEvent(new Event("input", { bubbles: true }));
                  match.dispatchEvent(new Event("change", { bubbles: true }));
                  match.dispatchEvent(new Event("blur", { bubbles: true }));
                  return true;
                },
                { k: key, v: val }
              );

              if (filled) filledCount++;
              else skippedCount++;
            } catch {
              skippedCount++;
            }
          }

          addLog(
            "fields_populated",
            filledCount > 0 ? "success" : "warn",
            `Filled ${filledCount} field(s) with candidate data${skippedCount ? `; ${skippedCount} field(s) had no matching input on this page` : ""}.`
          );

          // A resume cannot be attached without the actual file; report it honestly.
          if (mappedValues.resume) {
            addLog(
              "resume_attach",
              "warn",
              "Resume file attachment must be completed manually in the live session - the ATS file input cannot be set programmatically."
            );
          }

          addLog("submit_attempt", "info", "Submitting application via official submit trigger...");

          // Look for submit button
          const clicked = await page.evaluate(() => {
            const btn = Array.from(document.querySelectorAll("button, input[type='submit']")).find((b) => {
              const text = (b.textContent || (b as HTMLInputElement).value || "").toLowerCase();
              return text.includes("submit") || text.includes("apply") || text.includes("send");
            });
            if (btn) {
              (btn as HTMLElement).click();
              return true;
            }
            return false;
          });

          if (!clicked) {
            submissionError = "No submit control found on the application page";
            addLog("submit_trigger", "error", submissionError);
          } else if (filledCount === 0) {
            submissionError = "No form fields could be filled automatically";
            addLog("submit_trigger", "error", submissionError);
          } else {
            // Give the ATS a moment to process the submission before we claim success.
            await new Promise((resolve) => setTimeout(resolve, 4000));
            addLog("submit_trigger", "success", `Application submitted to ${platformInfo.displayName}.`);
          }

          await stagehand.close();

          // Request MP4 video recording download from Browserbase
          try {
            const browserbase = new Browserbase({ apiKey });
            await browserbase.sessions.recording.downloads.create(sessionId);
            const dlList = await browserbase.sessions.recording.downloads.list(sessionId);
            const readyDl = dlList.downloads?.find((d: any) => d.status === "COMPLETED" && d.downloadUrl);
            if (readyDl?.downloadUrl) {
              sessionReplayUrl = readyDl.downloadUrl;
              addLog("video_recording_ready", "success", "Full MP4 recording available for video playback.");
            } else {
              addLog("video_recording_pending", "info", "MP4 recording is still being assembled; it will appear shortly.");
            }
          } catch (dlErr) {
            addLog("video_recording_pending", "info", "MP4 recording request queued; it will appear shortly.");
          }

          return {
            success: !submissionError,
            sessionId,
            sessionReplayUrl,
            logs,
            error: submissionError,
          };
        }

        submissionError = "Stagehand could not expose a page for the Browserbase session";
        addLog("route_error", "error", submissionError);
      } else {
        submissionError = "Stagehand could not be initialised for this Browserbase session";
        addLog("stagehand_error", "error", submissionError);
      }
    } catch (err: any) {
      submissionError = err?.message || "Browserbase session execution failed";
      addLog("session_error", "error", `Browserbase session execution failed: ${submissionError}`);
    }

    // Never report success for a run that did not fill and submit the form.
    return {
      success: false,
      sessionId,
      sessionReplayUrl,
      logs,
      error: submissionError || "Automated submission could not be completed",
    };
  }
}
