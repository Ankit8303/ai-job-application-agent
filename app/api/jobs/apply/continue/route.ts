import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CandidateProfileData, CandidateResumeData } from "@/lib/automation/field-mapper";
import { runAutonomousJobApplication } from "@/lib/automation/playwright-agent";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { applicationId, autoSubmit = true } = await req.json();
    if (!applicationId) {
      return NextResponse.json({ error: "Application ID is required" }, { status: 400 });
    }

    // 1. Fetch the application
    const { data: application, error: appErr } = await supabase
      .from("job_applications")
      .select("*")
      .eq("id", applicationId)
      .eq("user_id", user.id)
      .single();

    if (appErr || !application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // 2. Fetch fresh profile and resume data
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    const { data: resumes } = await supabase
      .from("resumes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    // Update status to Submitting & workflow_state to RESUMING / NAVIGATING
    await supabase
      .from("job_applications")
      .update({
        status: "Submitting",
        workflow_state: "NAVIGATING",
        updated_at: new Date().toISOString(),
      })
      .eq("id", applicationId);

    // Run autonomous apply with saved checkpoint and user session
    const submission = await runAutonomousJobApplication({
      applicationId,
      userId: user.id,
      jobUrl: application.job_url,
      profile: (profile || {}) as CandidateProfileData,
      resume: (resumes && resumes[0] ? resumes[0] : null) as CandidateResumeData | null,
      platformHint: application.platform,
      checkpoint: application.workflow_checkpoint || null,
      autoSubmit,
    });

    const existingLogs = Array.isArray(application.submission_logs) ? application.submission_logs : [];
    const mergedLogs = [...existingLogs, ...submission.logs];

    let finalStatus = "Failed";
    let authStatus = "AUTHENTICATED";

    if (submission.authRequired) {
      finalStatus = "AUTH_REQUIRED";
      authStatus = "REQUIRED";
    } else if (submission.workflowState === "AWAITING_USER_REVIEW") {
      finalStatus = "AWAITING_USER_REVIEW";
    } else if (submission.success || submission.alreadySubmitted) {
      finalStatus = "Auto-Applied";
    }

    await supabase
      .from("job_applications")
      .update({
        status: finalStatus,
        workflow_state: submission.workflowState || (submission.success ? "COMPLETED" : "FAILED"),
        auth_status: authStatus,
        workflow_checkpoint: submission.checkpoint || null,
        submission_evidence: submission.evidence || null,
        screenshot_url: submission.screenshotUrl || application.screenshot_url,
        video_url: submission.videoUrl || application.video_url,
        session_replay_url: submission.videoUrl || application.session_replay_url,
        browserbase_session_id: applicationId,
        submission_logs: mergedLogs,
        error_message: submission.success ? null : submission.error || null,
        applied_at: submission.success ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", applicationId);

    // Also mark job in public.jobs if applied
    if (submission.success && application.job_url) {
      await supabase
        .from("jobs")
        .update({ applied_status: "applied" })
        .eq("job_url", application.job_url)
        .eq("user_id", user.id);
    }

    return NextResponse.json({
      success: submission.success,
      isComplete: submission.success,
      status: finalStatus,
      workflowState: submission.workflowState,
      authRequired: submission.authRequired,
      loginUrl: submission.loginUrl,
      sessionId: applicationId,
      videoUrl: submission.videoUrl,
      screenshotUrl: submission.screenshotUrl,
      sessionReplayUrl: submission.videoUrl,
      checkpoint: submission.checkpoint,
    });
  } catch (err: any) {
    console.error("Continue application route error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
