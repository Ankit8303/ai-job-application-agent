import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const applicationId = searchParams.get("applicationId");

    if (!applicationId) {
      return NextResponse.json({ error: "Missing applicationId" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let query = supabase.from("job_applications").select("*").eq("id", applicationId);
    if (user) {
      query = query.eq("user_id", user.id);
    }

    const { data: app, error } = await query.single();
    if (error || !app) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const isRunning =
      app.status === "Detecting Fields" ||
      app.status === "Submitting" ||
      app.status === "Pending" ||
      app.workflow_state === "NAVIGATING" ||
      app.workflow_state === "CHECKING_AUTH" ||
      app.workflow_state === "FILLING_FORM" ||
      app.workflow_state === "SUBMITTING" ||
      app.workflow_state === "VERIFYING_SUBMISSION";

    const isAuthRequired =
      app.status === "AUTH_REQUIRED" ||
      app.workflow_state === "AUTH_REQUIRED" ||
      app.workflow_state === "WAITING_FOR_USER_LOGIN" ||
      app.workflow_state === "REAUTHENTICATION_REQUIRED";

    const videoUrl =
      app.video_url ||
      (app.session_replay_url && app.session_replay_url.startsWith("/recordings")
        ? app.session_replay_url
        : app.browserbase_session_id
        ? `/api/jobs/apply/session-video?sessionId=${encodeURIComponent(app.browserbase_session_id)}&stream=true`
        : null);

    return NextResponse.json({
      applicationId: app.id,
      status: app.status,
      workflowState: app.workflow_state || app.status,
      authStatus: app.auth_status || (isAuthRequired ? "REQUIRED" : "NONE"),
      isAuthRequired,
      checkpoint: app.workflow_checkpoint || null,
      submissionEvidence: app.submission_evidence || null,
      sessionId: app.browserbase_session_id || app.id,
      sessionReplayUrl: app.session_replay_url,
      screenshotUrl: app.screenshot_url || null,
      videoUrl: videoUrl,
      missingFields: Array.isArray(app.missing_fields) ? app.missing_fields : [],
      detectedFields: Array.isArray(app.detected_fields) ? app.detected_fields : [],
      logs: Array.isArray(app.submission_logs) ? app.submission_logs : [],
      error: app.error_message || null,
      errorClassification: app.error_classification || null,
      isLive: isRunning,
      appliedAt: app.applied_at,
      updatedAt: app.updated_at,
    });
  } catch (err: any) {
    console.error("Application status error:", err);
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
  }
}
