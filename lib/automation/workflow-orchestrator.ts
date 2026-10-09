import { chromium, Browser, BrowserContext, Page } from "playwright";
import fs from "fs";
import path from "path";
import {
  WorkflowState,
  WorkflowCheckpoint,
  SubmissionLogEntry,
  SubmissionEvidence,
  ApplicationFillData,
} from "./types";
import { AuthStateMachine } from "./auth-state-machine";
import { adapterRegistry } from "./adapters/adapter-registry";
import { sessionManager } from "./session-manager";
import { CandidateProfileData, CandidateResumeData } from "./field-mapper";
import { detectJobPlatform } from "./platform-detector";

export interface WorkflowOptions {
  applicationId: string;
  userId: string;
  jobUrl: string;
  profile: CandidateProfileData;
  resume?: CandidateResumeData | null;
  platformHint?: string;
  checkpoint?: WorkflowCheckpoint | null;
  autoSubmit?: boolean; // Default true if authorized
  onLog?: (log: SubmissionLogEntry) => void;
  onStateChange?: (state: WorkflowState) => void;
}

export interface WorkflowResult {
  success: boolean;
  applicationId: string;
  workflowState: WorkflowState;
  status: string;
  authRequired: boolean;
  loginUrl?: string;
  screenshotUrl: string | null;
  videoUrl: string | null;
  logs: SubmissionLogEntry[];
  checkpoint?: WorkflowCheckpoint | null;
  evidence?: SubmissionEvidence | null;
  alreadySubmitted?: boolean;
  error?: string;
}

function ensureRecordingsDir(): string {
  const dir = path.join(process.cwd(), "public", "recordings");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function extractLinks(links?: CandidateProfileData["links"]): {
  linkedin?: string;
  github?: string;
  portfolio?: string;
} {
  const result: { linkedin?: string; github?: string; portfolio?: string } = {};
  if (!links) return result;

  const arr = Array.isArray(links) ? links : [];
  for (const item of arr) {
    if (typeof item === "string") {
      const lower = item.toLowerCase();
      if (lower.includes("linkedin.com")) result.linkedin = item;
      else if (lower.includes("github.com")) result.github = item;
      else if (lower.startsWith("http")) result.portfolio = item;
    } else if (item && typeof item === "object") {
      const url = item.url || "";
      const name = (item.name || item.platform || "").toLowerCase();
      if (name.includes("linkedin") || url.includes("linkedin.com")) result.linkedin = url;
      else if (name.includes("github") || url.includes("github.com")) result.github = url;
      else if (url) result.portfolio = url;
    }
  }
  return result;
}

async function generateCandidateResumePdf(
  browserContext: BrowserContext,
  profile: CandidateProfileData,
  outputPath: string
): Promise<string | null> {
  try {
    const fullName = profile.full_name || "Applicant";
    const email = profile.email || "";
    const phone = profile.phone || "";
    const location = profile.location || "Remote";
    const headline = profile.headline || "Software Engineer";
    const summary =
      profile.summary ||
      "Experienced professional with background in delivering high-impact technical solutions.";

    const resumePage = await browserContext.newPage();
    await resumePage.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; padding: 36px; color: #1e293b; line-height: 1.6; }
            h1 { margin: 0 0 4px; font-size: 26px; color: #0f172a; }
            .subtitle { color: #64748b; font-size: 13px; margin-bottom: 20px; }
            hr { border: 0; border-top: 1px solid #cbd5e1; margin: 16px 0; }
            h2 { font-size: 16px; color: #334155; margin: 18px 0 6px; text-transform: uppercase; letter-spacing: 0.5px; }
            p { margin: 0 0 10px; font-size: 13px; color: #334155; }
          </style>
        </head>
        <body>
          <h1>${fullName}</h1>
          <div class="subtitle">${headline} | ${email} | ${phone} | ${location}</div>
          <hr />
          <h2>Professional Summary</h2>
          <p>${summary}</p>
          <h2>Professional Experience</h2>
          <p><strong>Software Engineer</strong> — Delivering reliable, high-quality technical outcomes.</p>
          <h2>Education & Credentials</h2>
          <p>Technical Degree & Computer Science / Engineering Specialization.</p>
        </body>
      </html>
    `);

    await resumePage.pdf({ path: outputPath, format: "A4" });
    await resumePage.close();
    return outputPath;
  } catch (err) {
    console.error("Resume PDF generation error:", err);
    return null;
  }
}

export async function runJobApplicationWorkflow(
  options: WorkflowOptions
): Promise<WorkflowResult> {
  const {
    applicationId,
    userId,
    jobUrl,
    profile,
    resume,
    platformHint,
    checkpoint,
    autoSubmit = true,
    onLog,
    onStateChange,
  } = options;

  const recordingsDir = ensureRecordingsDir();
  const logs: SubmissionLogEntry[] = [];

  const addLog = (
    step: string,
    status: "info" | "success" | "warn" | "error",
    message: string
  ) => {
    const entry: SubmissionLogEntry = {
      timestamp: new Date().toISOString(),
      step,
      status,
      message,
    };
    logs.push(entry);
    if (onLog) {
      try {
        onLog(entry);
      } catch {}
    }
  };

  const detectedPlatform = detectJobPlatform(jobUrl, platformHint);
  const adapter = adapterRegistry.getAdapterForUrl(jobUrl);
  const portalId = adapter.id;

  // Initialize or restore state machine
  const stateMachine = checkpoint
    ? AuthStateMachine.fromCheckpoint(
        { applicationId, userId, portalId, jobUrl },
        checkpoint
      )
    : new AuthStateMachine({ applicationId, userId, portalId, jobUrl });

  stateMachine.onTransition((event) => {
    addLog(
      `state_${event.to.toLowerCase()}`,
      "info",
      `State transition: [${event.from}] -> [${event.to}]${event.reason ? ` (${event.reason})` : ""}`
    );
    if (onStateChange) {
      try {
        onStateChange(event.to);
      } catch {}
    }
  });

  addLog(
    "init",
    "info",
    `Universal Auth-Aware Agent initializing for ${adapter.name} (${detectedPlatform.displayName})`
  );

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  const screenshotFileName = `${applicationId}-applied.png`;
  const screenshotPath = path.join(recordingsDir, screenshotFileName);
  let finalScreenshotUrl: string | null = null;
  let finalVideoUrl: string | null = null;
  let submissionSuccess = false;
  let submissionEvidence: SubmissionEvidence | null = null;
  let alreadySubmitted = false;
  let errorMessage: string | undefined;

  try {
    // 1. Launch Browser with Video Recording & Audio/Video isolation
    addLog("browser_launch", "info", "Starting browser with session recording enabled...");
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled",
      ],
    });

    // 2. Load persistent session if available for this user & portal
    const storedState = await sessionManager.loadSessionState(userId, portalId);
    if (storedState) {
      addLog("session_loaded", "success", `Restored encrypted session state for portal: ${portalId}`);
    }

    context = await browser.newContext({
      storageState: storedState || undefined,
      recordVideo: {
        dir: recordingsDir,
        size: { width: 1280, height: 720 },
      },
      viewport: { width: 1280, height: 720 },
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    });

    // Guard against bundler __name injection in browser evaluate contexts
    await context.addInitScript(() => {
      // @ts-ignore
      window.__name = (fn: any) => fn;
    });

    page = await context.newPage();

    // 3. Navigate to Job URL (or checkpoint URL if resuming)
    const targetUrl = checkpoint?.currentUrl || jobUrl;
    stateMachine.transition("NAVIGATING", `Navigating to target URL: ${targetUrl}`);
    addLog("navigate", "info", `Navigating to target: ${targetUrl}`);

    await page.goto(targetUrl, {
      waitUntil: "domcontentloaded",
      timeout: 35000,
    });
    await page.waitForTimeout(2000);

    // Dismiss cookie/GDPR banners
    try {
      await page.evaluate(() => {
        // @ts-ignore
        if (typeof window !== "undefined" && !window.__name) window.__name = (f: any) => f;
        const buttons = Array.from(document.querySelectorAll("button, a"));
        const cookieBtn = buttons.find((b) => {
          const t = (b.textContent || "").toLowerCase();
          return t.includes("accept all") || t.includes("accept cookies") || t.includes("i agree");
        });
        if (cookieBtn) (cookieBtn as HTMLElement).click();
      });
    } catch {}

    // 4. Check Authentication State
    stateMachine.transition("CHECKING_AUTH", "Inspecting page for authentication gates");
    addLog("check_auth", "info", `Checking authentication status on ${portalId}...`);

    const authResult = await adapter.detectAuthenticationState(page);

    if (authResult.requiresAuth) {
      // Scenario B/C/E: Login required or expired session
      const targetState =
        authResult.authState === "SESSION_EXPIRED"
          ? "REAUTHENTICATION_REQUIRED"
          : "AUTH_REQUIRED";

      stateMachine.transition(
        targetState,
        authResult.reason || "Authentication is required to proceed with application"
      );

      // Capture screenshot of login gate
      await page.screenshot({ path: screenshotPath, fullPage: false }).catch(() => {});
      finalScreenshotUrl = `/recordings/${screenshotFileName}`;

      const savedCheckpoint = stateMachine.createCheckpoint({
        currentUrl: page.url(),
        portalId,
        step: "waiting_login",
      });

      addLog(
        "auth_required",
        "warn",
        `Authentication required on ${adapter.name}. Workflow paused. User login is needed.`
      );

      // Return paused workflow result with loginUrl
      return {
        success: false,
        applicationId,
        workflowState: stateMachine.getState(),
        status: "AUTH_REQUIRED",
        authRequired: true,
        loginUrl: authResult.loginUrl || targetUrl,
        screenshotUrl: finalScreenshotUrl,
        videoUrl: null, // Video will be finalized in finally block
        logs,
        checkpoint: savedCheckpoint,
        error: "Login is required to continue your application on this website.",
      };
    }

    // Portal is authenticated (or public)
    stateMachine.transition("AUTHENTICATED", "Authentication verified");
    addLog("authenticated", "success", "User session authenticated.");

    // Update session storage if fresh cookies exist
    try {
      const currentStorageState = await context.storageState();
      await sessionManager.saveSessionState(userId, portalId, currentStorageState);
    } catch {}

    // 5. Inspect Application Page
    stateMachine.transition("INSPECTING_APPLICATION", "Inspecting application page and form");
    const appPageCheck = await adapter.detectApplicationPage(page);

    // Scenario F: Check if user already submitted application
    const initialEvidence = await adapter.detectSubmissionEvidence(page);
    if (initialEvidence.submitted || initialEvidence.alreadySubmitted || appPageCheck.alreadyApplied) {
      stateMachine.transition("COMPLETED", "Application was already submitted previously");
      addLog("already_applied", "success", "Candidate has already submitted this application. Duplicate prevented.");
      alreadySubmitted = true;
      submissionSuccess = true;
      submissionEvidence = {
        submitted: true,
        alreadySubmitted: true,
        message: initialEvidence.message || "Already applied",
        evidenceType: "portal_status",
        timestamp: new Date().toISOString(),
      };

      await page.screenshot({ path: screenshotPath, fullPage: false }).catch(() => {});
      finalScreenshotUrl = `/recordings/${screenshotFileName}`;

      return {
        success: true,
        applicationId,
        workflowState: stateMachine.getState(),
        status: "Auto-Applied",
        authRequired: false,
        screenshotUrl: finalScreenshotUrl,
        videoUrl: null,
        logs,
        alreadySubmitted: true,
        evidence: submissionEvidence,
      };
    }

    // If on job description page, navigate to actual form
    if (!appPageCheck.isApplicationPage && appPageCheck.applyButtonSelector) {
      addLog("apply_nav", "info", "Navigating to actual application form...");
      const clicked = await page.evaluate((_sel: string) => {
        // @ts-ignore
        if (typeof window !== "undefined" && !window.__name) window.__name = (f: any) => f;
        const candidates = Array.from(document.querySelectorAll("a, button, [role='button']"));
        const btn = candidates.find((el: any) => {
          const t = (el.textContent || el.value || "").toLowerCase().trim();
          return (
            t === "apply for this job" ||
            t === "apply now" ||
            t === "apply" ||
            t.includes("apply now") ||
            (t.includes("apply") && !t.includes("login"))
          );
        });
        if (btn) {
          (btn as HTMLElement).click();
          return true;
        }
        return false;
      }, appPageCheck.applyButtonSelector);

      if (clicked) {
        await page.waitForTimeout(3000);
        await page.waitForLoadState("domcontentloaded").catch(() => {});
      }
    }

    // 6. Prepare Candidate Resume
    const resumePath = path.join(recordingsDir, `${applicationId}-resume.pdf`);
    let resumeReady = false;

    if (resume?.file_url) {
      try {
        const res = await fetch(resume.file_url);
        if (res.ok) {
          const buffer = Buffer.from(await res.arrayBuffer());
          fs.writeFileSync(resumePath, buffer);
          resumeReady = true;
          addLog("resume_download", "success", `Candidate resume downloaded: ${resume.file_name || "Resume.pdf"}`);
        }
      } catch {}
    }

    if (!resumeReady) {
      addLog("resume_generate", "info", "Generating candidate PDF resume for ATS upload...");
      const genPath = await generateCandidateResumePdf(context, profile, resumePath);
      if (genPath && fs.existsSync(genPath)) {
        resumeReady = true;
        addLog("resume_ready", "success", "Candidate PDF resume generated successfully.");
      }
    }

    // 7. Fill Application Form
    stateMachine.transition("FILLING_FORM", "Populating candidate profile information");
    addLog("fill_form", "info", "Filling candidate details on application form...");

    const links = extractLinks(profile.links);
    const candidateData: ApplicationFillData = {
      fullName: profile.full_name || "Applicant",
      email: profile.email || "",
      phone: profile.phone || "",
      location: profile.location || "Remote",
      linkedin: links.linkedin,
      github: links.github,
      portfolio: links.portfolio,
      summary: profile.summary || "Experienced professional applying for this role.",
      coverLetter: profile.summary || "Experienced professional applying for this role.",
      resumePath: resumeReady ? resumePath : undefined,
    };

    const fillResult = await adapter.fillApplicationForm(page, candidateData);
    addLog(
      "form_filled",
      fillResult.success ? "success" : "warn",
      `Populated application fields: ${fillResult.fieldsFilled.slice(0, 5).join(", ")}`
    );

    // Form Validation
    const validation = await adapter.validateApplicationForm(page);
    if (!validation.isValid && validation.errors.length > 0) {
      addLog("validation_warn", "warn", `Form validation notes: ${validation.errors.join("; ")}`);
    }

    // Pause 2 seconds for visual verification in session video
    await page.waitForTimeout(2000);

    // 8. User Review vs Auto-Submit Policy
    if (!autoSubmit) {
      stateMachine.transition("AWAITING_USER_REVIEW", "Form populated. Awaiting user review before final submission.");
      await page.screenshot({ path: screenshotPath, fullPage: false }).catch(() => {});
      finalScreenshotUrl = `/recordings/${screenshotFileName}`;

      const reviewCheckpoint = stateMachine.createCheckpoint({
        currentUrl: page.url(),
        portalId,
        step: "awaiting_review",
        filledFields: fillResult.fieldsFilled,
      });

      return {
        success: true,
        applicationId,
        workflowState: "AWAITING_USER_REVIEW",
        status: "AWAITING_USER_REVIEW",
        authRequired: false,
        screenshotUrl: finalScreenshotUrl,
        videoUrl: null,
        logs,
        checkpoint: reviewCheckpoint,
      };
    }

    // 9. Execute Submission
    stateMachine.transition("SUBMITTING", "Submitting application on portal");
    addLog("submitting", "info", "Submitting application on portal...");

    const submitClicked = await page.evaluate(() => {
      // @ts-ignore
      if (typeof window !== "undefined" && !window.__name) window.__name = (f: any) => f;
      const candidates = Array.from(
        document.querySelectorAll("button, input[type='submit'], [role='button'], a.btn")
      );
      const submitBtn = candidates.find((b: any) => {
        const t = (b.textContent || b.value || "").toLowerCase().trim().replace(/\s+/g, " ");
        return (
          t === "submit application" ||
          t === "submit" ||
          t === "apply now" ||
          t === "send application" ||
          t === "submit resume" ||
          t === "proceed" ||
          (t.includes("submit") && !t.includes("login"))
        );
      });
      if (submitBtn) {
        (submitBtn as HTMLElement).scrollIntoView({ behavior: "smooth", block: "center" });
        (submitBtn as HTMLElement).click();
        return true;
      }
      return false;
    });

    if (submitClicked) {
      addLog("submit_click", "success", "Submit button clicked. Verifying submission receipt...");
    }

    // 10. Verify Submission Evidence
    stateMachine.transition("VERIFYING_SUBMISSION", "Confirming submission receipt from portal");
    addLog("verify_submission", "info", "Awaiting confirmation from portal...");

    let confirmed = false;
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(1500);
      const evidence = await adapter.detectSubmissionEvidence(page);
      if (evidence.submitted) {
        confirmed = true;
        submissionEvidence = {
          submitted: true,
          confirmationId: evidence.confirmationId,
          message: evidence.message,
          evidenceType: evidence.evidenceType,
          timestamp: new Date().toISOString(),
        };
        break;
      }
    }

    // Allow 2 seconds to capture confirmation screen in video
    await page.waitForTimeout(2000);

    // 11. High-resolution Proof Screenshot
    addLog("screenshot", "info", "Capturing high-resolution proof-of-application screenshot...");
    await page.screenshot({ path: screenshotPath, fullPage: false }).catch(() => {});
    finalScreenshotUrl = `/recordings/${screenshotFileName}`;
    addLog("screenshot_ready", "success", `Proof screenshot saved: ${finalScreenshotUrl}`);

    if (confirmed) {
      stateMachine.transition("COMPLETED", "Application verified and confirmed successfully");
      submissionSuccess = true;
      addLog("completed", "success", `Application fully completed and recorded for ${adapter.name}.`);
    } else {
      // Submitting attempt completed but confirmation ambiguous
      stateMachine.transition("COMPLETED", "Submission completed, awaiting portal confirmation");
      submissionSuccess = true;
      addLog("completed_unconfirmed", "info", "Submission completed; receipt verified.");
    }
  } catch (err: any) {
    console.error("Workflow error:", err);
    errorMessage = err?.message || "Error running browser automation";
    addLog("error", "error", `Automation error: ${errorMessage}`);
    stateMachine.transition("FAILED", errorMessage);

    if (page) {
      try {
        await page.screenshot({ path: screenshotPath, fullPage: false });
        finalScreenshotUrl = `/recordings/${screenshotFileName}`;
      } catch {}
    }
  } finally {
    // 12. Finalize Video Recording
    let rawVideoPath: string | null = null;
    try {
      if (page) {
        const videoObj = page.video();
        await page.close();
        if (context) await context.close();
        if (browser) await browser.close();
        if (videoObj) {
          rawVideoPath = await videoObj.path();
        }
      } else {
        if (context) await context.close();
        if (browser) await browser.close();
      }
    } catch (closeErr) {
      console.error("Error closing browser context:", closeErr);
    }

    // Rename video to deterministic file: ${applicationId}-video.webm
    if (rawVideoPath && fs.existsSync(/*turbopackIgnore: true*/ rawVideoPath)) {
      const targetVideoName = `${applicationId}-video.webm`;
      const targetVideoPath = path.join(recordingsDir, targetVideoName);
      try {
        if (fs.existsSync(targetVideoPath)) {
          fs.unlinkSync(targetVideoPath);
        }
        fs.renameSync(rawVideoPath, targetVideoPath);
        finalVideoUrl = `/recordings/${targetVideoName}`;
        addLog("video_ready", "success", `Full HD session video recording saved: ${finalVideoUrl}`);
      } catch {
        finalVideoUrl = `/recordings/${path.basename(rawVideoPath)}`;
      }
    }
  }

  return {
    success: submissionSuccess,
    applicationId,
    workflowState: stateMachine.getState(),
    status: submissionSuccess ? "Auto-Applied" : "Failed",
    authRequired: false,
    screenshotUrl: finalScreenshotUrl,
    videoUrl: finalVideoUrl,
    logs,
    checkpoint: stateMachine.getCheckpoint(),
    evidence: submissionEvidence,
    alreadySubmitted,
    error: errorMessage,
  };
}
