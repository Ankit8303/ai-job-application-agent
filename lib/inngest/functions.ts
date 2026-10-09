import { inngest } from "./client";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import {
  detectApplicationFieldsWithBrowserbase,
  autoSubmitApplicationWithBrowserbase,
} from "../automation/browserbase-agent";
import {
  mapDetectedFieldsToProfile,
  CandidateProfileData,
  CandidateResumeData,
} from "../automation/field-mapper";
import { detectJobPlatform } from "../automation/platform-detector";

// Helper to get Supabase client with anon/service key
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createSupabaseAdminClient(url, key);
}

/**
 * Inngest Function: Detect Job Fields
 * Concurrency: 1 (executes one by one to avoid rate-limits and conflicts)
 */
export const detectJobFieldsFunction = inngest.createFunction(
  {
    id: "detect-job-fields",
    name: "Detect Job Application Fields",
    triggers: [{ event: "job/detect-fields" }],
    concurrency: {
      limit: 1, // Execute each application task one by one to avoid conflicts
    },
  },
  async ({ event, step }: any) => {
    const { applicationId, jobUrl, userId, platformHint } = event.data;
    const supabase = getSupabaseClient();

    // Step 1: Update status to 'Detecting Fields'
    await step.run("update-status-detecting", async () => {
      await supabase
        .from("job_applications")
        .update({
          status: "Detecting Fields",
          updated_at: new Date().toISOString(),
        })
        .eq("id", applicationId);
    });

    // Step 2: Open Browserbase session and detect form fields
    const detection = await step.run("browserbase-detect-fields", async () => {
      return await detectApplicationFieldsWithBrowserbase(jobUrl, platformHint);
    });

    // Step 3: Fetch candidate profile and latest resume from database
    const { profile, resume } = await step.run("fetch-candidate-data", async () => {
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      const { data: resList } = await supabase
        .from("resumes")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);

      return {
        profile: (prof || {}) as CandidateProfileData,
        resume: (resList && resList[0] ? resList[0] : null) as CandidateResumeData | null,
      };
    });

    // Step 4: Compare detected fields with candidate profile data
    const mapping = await step.run("map-fields-to-profile", async () => {
      return mapDetectedFieldsToProfile(detection.fields, profile, resume);
    });

    const platformInfo = detectJobPlatform(jobUrl, platformHint);

    // Step 5: Check if any required profile information is missing
    if (!mapping.isComplete && mapping.missingFields.length > 0) {
      await step.run("handle-missing-profile-info", async () => {
        detection.logs.push({
          timestamp: new Date().toISOString(),
          step: "profile_validation",
          status: "warn",
          message: `Missing required profile fields: ${mapping.missingFields.join(", ")}. Redirecting candidate to complete profile.`,
        });

        await supabase
          .from("job_applications")
          .update({
            status: "Missing Profile Info",
            platform: platformInfo.platform,
            browserbase_session_id: detection.sessionId,
            session_replay_url: detection.sessionReplayUrl,
            detected_fields: detection.fields,
            missing_fields: mapping.missingFields,
            submission_logs: detection.logs,
            updated_at: new Date().toISOString(),
          })
          .eq("id", applicationId);
      });

      return {
        success: true,
        status: "Missing Profile Info",
        missingFields: mapping.missingFields,
        applicationId,
      };
    }

    // Step 6: All fields are mapped and complete -> update to Ready to Apply and auto-trigger submission
    await step.run("update-status-ready", async () => {
      detection.logs.push({
        timestamp: new Date().toISOString(),
        step: "profile_validation",
        status: "success",
        message: "All required form fields successfully mapped from candidate profile and resume.",
      });

      await supabase
        .from("job_applications")
        .update({
          status: "Ready to Apply",
          platform: platformInfo.platform,
          browserbase_session_id: detection.sessionId,
          session_replay_url: detection.sessionReplayUrl,
          detected_fields: detection.fields,
          missing_fields: [],
          resume_id: resume?.id || null,
          submission_logs: detection.logs,
          updated_at: new Date().toISOString(),
        })
        .eq("id", applicationId);
    });

    // Step 7: Automatically proceed to submit application
    await step.sendEvent("trigger-auto-apply", {
      name: "job/auto-apply",
      data: {
        applicationId,
        userId,
        jobUrl,
        platformHint: platformInfo.platform,
        mappedValues: mapping.mappedValues,
      },
    });

    return {
      success: true,
      status: "Ready to Apply",
      applicationId,
    };
  }
);

/**
 * Inngest Function: Submit Job Application
 * Concurrency: 1 (executes one by one to avoid conflicts and rate-limiting)
 */
export const submitJobApplicationFunction = inngest.createFunction(
  {
    id: "submit-job-application",
    name: "Submit Job Application via Browserbase",
    triggers: [{ event: "job/auto-apply" }],
    concurrency: {
      limit: 1, // Sequential execution
    },
  },
  async ({ event, step }: any) => {
    const { applicationId, userId, jobUrl, platformHint, mappedValues } = event.data;
    const supabase = getSupabaseClient();

    // Step 1: Update status to Submitting
    await step.run("update-status-submitting", async () => {
      await supabase
        .from("job_applications")
        .update({
          status: "Submitting",
          updated_at: new Date().toISOString(),
        })
        .eq("id", applicationId);
    });

    // Step 2: Fetch mapped values if not provided in event
    const finalValues = await step.run("prepare-submission-payload", async () => {
      if (mappedValues && Object.keys(mappedValues).length > 0) {
        return mappedValues;
      }

      const { data: app } = await supabase
        .from("job_applications")
        .select("detected_fields, user_id")
        .eq("id", applicationId)
        .single();

      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId || app?.user_id)
        .single();

      const { data: resList } = await supabase
        .from("resumes")
        .select("*")
        .eq("user_id", userId || app?.user_id)
        .order("created_at", { ascending: false })
        .limit(1);

      const mapping = mapDetectedFieldsToProfile(
        app?.detected_fields || [],
        prof || {},
        resList?.[0] || null
      );

      return mapping.mappedValues;
    });

    // Step 3: Launch autonomous agent and submit application with video and screenshot
    const submission = await step.run("autonomous-submit-form", async () => {
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      const { data: resList } = await supabase
        .from("resumes")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);

      const { runAutonomousJobApplication } = await import("../automation/playwright-agent");
      return await runAutonomousJobApplication({
        applicationId,
        jobUrl,
        profile: (prof || {}) as CandidateProfileData,
        resume: resList?.[0] as CandidateResumeData | null,
        platformHint,
      });
    });

    // Step 4: Finalize database records
    await step.run("finalize-application", async () => {
      // Fetch existing logs
      const { data: currentApp } = await supabase
        .from("job_applications")
        .select("submission_logs, job_url")
        .eq("id", applicationId)
        .single();

      const existingLogs = Array.isArray(currentApp?.submission_logs)
        ? currentApp.submission_logs
        : [];
      const mergedLogs = [...existingLogs, ...submission.logs];

      const newStatus = submission.success ? "Auto-Applied" : "Failed";

      await supabase
        .from("job_applications")
        .update({
          status: newStatus,
          screenshot_url: submission.screenshotUrl,
          video_url: submission.videoUrl,
          session_replay_url: submission.videoUrl,
          browserbase_session_id: applicationId,
          submission_logs: mergedLogs,
          applied_at: submission.success ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
          error_message: submission.error || null,
        })
        .eq("id", applicationId);

      // If there's a matching job in public.jobs, mark as applied
      if (submission.success && (jobUrl || currentApp?.job_url)) {
        await supabase
          .from("jobs")
          .update({ applied_status: "applied" })
          .eq("job_url", jobUrl || currentApp?.job_url)
          .eq("user_id", userId);
      }
    });

    return {
      success: submission.success,
      applicationId,
      sessionId: submission.sessionId,
      sessionReplayUrl: submission.sessionReplayUrl,
    };
  }
);
