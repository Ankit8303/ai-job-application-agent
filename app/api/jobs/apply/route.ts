import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { detectJobPlatform } from "@/lib/automation/platform-detector";
import { runAutonomousJobApplication } from "@/lib/automation/playwright-agent";
import { CandidateProfileData, CandidateResumeData } from "@/lib/automation/field-mapper";

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
    const {
      jobId,
      jobUrl,
      company,
      position,
      location,
      salaryRange,
      matchScore,
      platform,
      mode, // "manual" | "ai_agent"
      autoSubmit = true,
    } = body;

    if (!jobUrl) {
      return NextResponse.json({ error: "Job URL is required" }, { status: 400 });
    }

    const detectedPlatform = detectJobPlatform(jobUrl, platform);

    // ── 1. Manual Application Mode ───────────────────────────
    if (mode === "manual") {
      const { data: appData, error: appError } = await supabase
        .from("job_applications")
        .insert([
          {
            user_id: user.id,
            company_name: company || "Direct Employer",
            position: position || "Role",
            location: location || "Remote",
            salary_range: salaryRange || null,
            match_score: matchScore || 85,
            job_url: jobUrl,
            status: "Applied",
            apply_mode: "manual",
            platform: detectedPlatform.platform,
            workflow_state: "COMPLETED",
            auth_status: "NONE",
            applied_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (appError) {
        console.error("Failed to track manual application:", appError);
      }

      // Mark applied in jobs table
      if (jobUrl) {
        await supabase
          .from("jobs")
          .update({ applied_status: "applied" })
          .eq("job_url", jobUrl);
      }

      return NextResponse.json({
        success: true,
        mode: "manual",
        redirectUrl: jobUrl,
        applicationId: appData?.id,
      });
    }

    // ── 2. AI Agent Autonomous Application Mode ─────────────
    // Create initial job_applications record with 'Submitting' status and INITIALIZING workflow state
    const { data: application, error: createError } = await supabase
      .from("job_applications")
      .insert([
        {
          user_id: user.id,
          company_name: company || "Direct Employer",
          position: position || "Role",
          location: location || "Remote",
          salary_range: salaryRange || null,
          match_score: matchScore || 85,
          job_url: jobUrl,
          status: "Submitting",
          apply_mode: "ai_agent",
          platform: detectedPlatform.platform,
          workflow_state: "INITIALIZING",
          auth_status: "NONE",
          submission_logs: [
            {
              timestamp: new Date().toISOString(),
              step: "ai_agent_initiated",
              status: "info",
              message: `AI Agent initiated for ${detectedPlatform.displayName}. Preparing automated environment with session auth.`,
            },
          ],
        },
      ])
      .select()
      .single();

    if (createError || !application) {
      return NextResponse.json(
        { error: createError?.message || "Failed to create application record" },
        { status: 500 }
      );
    }

    // Fetch candidate profile & latest resume
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

    // Run the autonomous agent with session manager and auth state machine
    const agentResult = await runAutonomousJobApplication({
      applicationId: application.id,
      userId: user.id,
      jobUrl,
      profile: (profile || {}) as CandidateProfileData,
      resume: (resumes && resumes[0] ? resumes[0] : null) as CandidateResumeData | null,
      platformHint: detectedPlatform.platform,
      autoSubmit,
    });

    // Determine final status based on workflow outcome
    let finalStatus = "Failed";
    let authStatus = "NONE";

    if (agentResult.authRequired) {
      finalStatus = "AUTH_REQUIRED";
      authStatus = "REQUIRED";
    } else if (agentResult.workflowState === "AWAITING_USER_REVIEW") {
      finalStatus = "AWAITING_USER_REVIEW";
      authStatus = "AUTHENTICATED";
    } else if (agentResult.success || agentResult.alreadySubmitted) {
      finalStatus = "Auto-Applied";
      authStatus = "AUTHENTICATED";
    }

    // Update database record with workflow checkpoint, video, screenshot, and logs
    await supabase
      .from("job_applications")
      .update({
        status: finalStatus,
        workflow_state: agentResult.workflowState || (agentResult.success ? "COMPLETED" : "FAILED"),
        auth_status: authStatus,
        workflow_checkpoint: agentResult.checkpoint || null,
        submission_evidence: agentResult.evidence || null,
        screenshot_url: agentResult.screenshotUrl,
        video_url: agentResult.videoUrl,
        session_replay_url: agentResult.videoUrl,
        browserbase_session_id: application.id,
        submission_logs: agentResult.logs,
        applied_at: agentResult.success ? new Date().toISOString() : null,
        error_message: agentResult.error || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", application.id);

    // If successfully submitted, mark job as applied in jobs table
    if (agentResult.success && jobUrl) {
      await supabase
        .from("jobs")
        .update({ applied_status: "applied" })
        .eq("job_url", jobUrl);
    }

    return NextResponse.json({
      success: agentResult.success,
      mode: "ai_agent",
      applicationId: application.id,
      status: finalStatus,
      workflowState: agentResult.workflowState,
      authRequired: agentResult.authRequired,
      loginUrl: agentResult.loginUrl,
      platform: detectedPlatform,
      videoUrl: agentResult.videoUrl,
      screenshotUrl: agentResult.screenshotUrl,
      logs: agentResult.logs,
      checkpoint: agentResult.checkpoint,
      alreadySubmitted: agentResult.alreadySubmitted,
      error: agentResult.error,
    });
  } catch (err: any) {
    console.error("Application apply route error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
