import {
  CandidateProfileData,
  CandidateResumeData,
} from "./field-mapper";
import {
  SubmissionLogEntry,
  WorkflowState,
  WorkflowCheckpoint,
  SubmissionEvidence,
} from "./types";
import {
  runJobApplicationWorkflow,
  WorkflowResult,
} from "./workflow-orchestrator";

export interface AutonomousApplyParams {
  applicationId: string;
  userId?: string;
  jobUrl: string;
  profile: CandidateProfileData;
  resume?: CandidateResumeData | null;
  platformHint?: string;
  checkpoint?: WorkflowCheckpoint | null;
  autoSubmit?: boolean;
  onLog?: (log: SubmissionLogEntry) => void;
  onStateChange?: (state: WorkflowState) => void;
}

export interface AutonomousApplyResult {
  success: boolean;
  applicationId: string;
  workflowState?: WorkflowState;
  authRequired?: boolean;
  loginUrl?: string;
  screenshotUrl: string | null;
  videoUrl: string | null;
  logs: SubmissionLogEntry[];
  checkpoint?: WorkflowCheckpoint | null;
  alreadySubmitted?: boolean;
  evidence?: SubmissionEvidence | null;
  error?: string;
}

/**
 * Autonomous Playwright Agent
 * Applies directly to the job on the actual application page using
 * portal-specific adapters, authentication detection, encrypted session management,
 * and deterministic state machine transitions.
 * Records the full session video till completion and captures proof screenshot.
 */
export async function runAutonomousJobApplication(
  params: AutonomousApplyParams
): Promise<AutonomousApplyResult> {
  const result: WorkflowResult = await runJobApplicationWorkflow({
    applicationId: params.applicationId,
    userId: params.userId || "candidate-session",
    jobUrl: params.jobUrl,
    profile: params.profile,
    resume: params.resume,
    platformHint: params.platformHint,
    checkpoint: params.checkpoint,
    autoSubmit: params.autoSubmit ?? true,
    onLog: params.onLog,
    onStateChange: params.onStateChange,
  });

  return {
    success: result.success,
    applicationId: result.applicationId,
    workflowState: result.workflowState,
    authRequired: result.authRequired,
    loginUrl: result.loginUrl,
    screenshotUrl: result.screenshotUrl,
    videoUrl: result.videoUrl,
    logs: result.logs,
    checkpoint: result.checkpoint,
    alreadySubmitted: result.alreadySubmitted,
    evidence: result.evidence,
    error: result.error,
  };
}
