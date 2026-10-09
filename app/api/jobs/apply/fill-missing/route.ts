import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { inngest, sendInngestEvent } from "@/lib/inngest/client";
import { mapDetectedFieldsToProfile, CandidateProfileData, CandidateResumeData } from "@/lib/automation/field-mapper";
import {
  autoSubmitApplicationWithBrowserbase,
  createLiveBrowserbaseSession,
} from "@/lib/automation/browserbase-agent";

/**
 * Endpoint to save missing fields entered by candidate directly to their profile
 * and immediately continue/submit the job application automation.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { applicationId, fieldValues, asyncMode = true } = body;

    if (!applicationId) {
      return NextResponse.json({ error: "Application ID is required" }, { status: 400 });
    }

    if (!fieldValues || typeof fieldValues !== "object") {
      return NextResponse.json({ error: "Field values are required" }, { status: 400 });
    }

    // 1. Fetch current profile
    const { data: currentProfile, error: profErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profErr && !currentProfile) {
      console.warn("Could not find profile, creating defaults:", profErr);
    }

    // 2. Fetch the target application
    const { data: application, error: appErr } = await supabase
      .from("job_applications")
      .select("*")
      .eq("id", applicationId)
      .eq("user_id", user.id)
      .single();

    if (appErr || !application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // 3. Map entered values to profile columns
    const updatedProfileFields: Record<string, any> = {};
    const existingLinks: any[] = Array.isArray(currentProfile?.links)
      ? [...currentProfile.links]
      : [];

    for (const [fieldName, val] of Object.entries(fieldValues)) {
      if (typeof val !== "string" || !val.trim()) continue;
      const lower = fieldName.toLowerCase();

      // Phone
      if (lower.includes("phone") || lower.includes("mobile") || lower.includes("contact")) {
        updatedProfileFields.phone = val;
      }
      // Location / Address / City
      else if (lower.includes("location") || lower.includes("city") || lower.includes("address") || lower.includes("country")) {
        updatedProfileFields.location = val;
      }
      // Full Name
      else if (lower.includes("name") && !lower.includes("company")) {
        updatedProfileFields.full_name = val;
      }
      // Headline / Current role
      else if (lower.includes("headline") || lower.includes("title")) {
        updatedProfileFields.headline = val;
      }
      // Summary / Cover Letter
      else if (lower.includes("summary") || lower.includes("cover letter") || lower.includes("about") || lower.includes("why")) {
        updatedProfileFields.summary = val;
      }
      // LinkedIn
      else if (lower.includes("linkedin")) {
        const existingIdx = existingLinks.findIndex((l) =>
          typeof l === "object" && (l.label?.toLowerCase().includes("linkedin") || l.url?.toLowerCase().includes("linkedin"))
        );
        if (existingIdx >= 0) {
          existingLinks[existingIdx] = { ...existingLinks[existingIdx], url: val };
        } else {
          existingLinks.push({ label: "LinkedIn", url: val });
        }
      }
      // GitHub
      else if (lower.includes("github") || lower.includes("git")) {
        const existingIdx = existingLinks.findIndex((l) =>
          typeof l === "object" && (l.label?.toLowerCase().includes("github") || l.url?.toLowerCase().includes("github"))
        );
        if (existingIdx >= 0) {
          existingLinks[existingIdx] = { ...existingLinks[existingIdx], url: val };
        } else {
          existingLinks.push({ label: "GitHub", url: val });
        }
      }
      // Portfolio / Website
      else if (lower.includes("portfolio") || lower.includes("website") || lower.includes("url")) {
        const existingIdx = existingLinks.findIndex((l) =>
          typeof l === "object" && (l.label?.toLowerCase().includes("portfolio") || l.label?.toLowerCase().includes("website"))
        );
        if (existingIdx >= 0) {
          existingLinks[existingIdx] = { ...existingLinks[existingIdx], url: val };
        } else {
          existingLinks.push({ label: "Portfolio", url: val });
        }
      }
    }

    updatedProfileFields.links = existingLinks;

    // Save changes to public.profiles
    const { error: updateProfErr } = await supabase
      .from("profiles")
      .update(updatedProfileFields)
      .eq("id", user.id);

    if (updateProfErr) {
      console.error("Failed to update profile with missing fields:", updateProfErr);
    }

    // 4. Fetch updated profile and resume for submission
    const mergedProfile: CandidateProfileData = {
      ...(currentProfile || {}),
      ...updatedProfileFields,
    };

    const { data: resumes } = await supabase
      .from("resumes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    const detectedFields = Array.isArray(application.detected_fields) ? application.detected_fields : [];
    const mapping = mapDetectedFieldsToProfile(
      detectedFields,
      mergedProfile,
      resumes?.[0] as CandidateResumeData | null
    );

    // Merge in any manually entered values directly
    for (const [k, v] of Object.entries(fieldValues)) {
      if (typeof v === "string" && v.trim()) {
        mapping.mappedValues[k] = v.trim();
      }
    }

    // Dispatch background event to Inngest if available
    await sendInngestEvent({
      name: "job/auto-apply",
      data: {
        applicationId,
        userId: user.id,
        jobUrl: application.job_url,
        platformHint: application.platform,
        mappedValues: mapping.mappedValues,
      },
    });

    // Try to create live cloud browser session upfront so candidate sees it instantly
    const liveSession = await createLiveBrowserbaseSession();

    if (liveSession && asyncMode) {
      // 5. Update application status to Submitting with active session ID
      await supabase
        .from("job_applications")
        .update({
          status: "Submitting",
          missing_fields: [],
          browserbase_session_id: liveSession.sessionId,
          session_replay_url: liveSession.sessionReplayUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", applicationId);

      // Launch automated form submission in background
      (async () => {
        try {
          const submission = await autoSubmitApplicationWithBrowserbase(
            application.job_url,
            mapping.mappedValues,
            application.platform,
            { existingSession: liveSession }
          );

          const existingLogs = Array.isArray(application.submission_logs) ? application.submission_logs : [];
          const mergedLogs = [
            ...existingLogs,
            {
              timestamp: new Date().toISOString(),
              step: "missing_fields_resolved",
              status: "success",
              message: `Candidate filled missing fields: ${Object.keys(fieldValues).join(", ")}. Profile updated and submission resumed.`,
            },
            ...submission.logs,
          ];

          const finalStatus = submission.success ? "Auto-Applied" : "Failed";

          await supabase
            .from("job_applications")
            .update({
              status: finalStatus,
              browserbase_session_id: submission.sessionId,
              session_replay_url: submission.sessionReplayUrl,
              submission_logs: mergedLogs,
              applied_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              error_message: submission.error || null,
            })
            .eq("id", applicationId);

          if (application.job_url) {
            await supabase
              .from("jobs")
              .update({ applied_status: "applied" })
              .eq("job_url", application.job_url);
          }
        } catch (subErr) {
          console.error("Background autoSubmit error:", subErr);
        }
      })();

      // Return immediate live session info so UI opens the live stream!
      return NextResponse.json({
        success: true,
        status: "Submitting",
        sessionId: liveSession.sessionId,
        sessionReplayUrl: liveSession.sessionReplayUrl,
        applicationId,
        isLive: true,
      });
    }

    // Synchronous fallback
    await supabase
      .from("job_applications")
      .update({
        status: "Submitting",
        missing_fields: [],
        updated_at: new Date().toISOString(),
      })
      .eq("id", applicationId);

    const submission = await autoSubmitApplicationWithBrowserbase(
      application.job_url,
      mapping.mappedValues,
      application.platform,
      liveSession ? { existingSession: liveSession } : undefined
    );

    const existingLogs = Array.isArray(application.submission_logs) ? application.submission_logs : [];
    const mergedLogs = [
      ...existingLogs,
      {
        timestamp: new Date().toISOString(),
        step: "missing_fields_resolved",
        status: "success",
        message: `Candidate filled missing fields: ${Object.keys(fieldValues).join(", ")}. Profile updated and submission resumed.`,
      },
      ...submission.logs,
    ];

    const finalStatus = submission.success ? "Auto-Applied" : "Failed";

    await supabase
      .from("job_applications")
      .update({
        status: finalStatus,
        browserbase_session_id: submission.sessionId,
        session_replay_url: submission.sessionReplayUrl,
        submission_logs: mergedLogs,
        applied_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        error_message: submission.error || null,
      })
      .eq("id", applicationId);

    if (application.job_url) {
      await supabase
        .from("jobs")
        .update({ applied_status: "applied" })
        .eq("job_url", application.job_url);
    }

    return NextResponse.json({
      success: submission.success,
      status: finalStatus,
      sessionId: submission.sessionId,
      sessionReplayUrl: submission.sessionReplayUrl,
      applicationId,
    });
  } catch (err: any) {
    console.error("Fill missing route error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
