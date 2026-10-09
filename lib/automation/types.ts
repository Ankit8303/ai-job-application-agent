export type SupportedPlatform =
  | "greenhouse"
  | "lever"
  | "workable"
  | "ashby"
  | "internshala"
  | "naukri"
  | "cutshort"
  | "instahyre"
  | "remote_ok"
  | "jobicy"
  | "generic";

export type ApplicationStatus =
  | "Pending"
  | "Detecting Fields"
  | "Missing Profile Info"
  | "Ready to Apply"
  | "Submitting"
  | "Applied"
  | "Auto-Applied"
  | "Manual Applied"
  | "Failed"
  | "AUTH_REQUIRED"
  | "WAITING_FOR_USER_LOGIN"
  | "AWAITING_USER_REVIEW"
  | "PAUSED";

export type ApplyMode = "manual" | "ai_agent";

export type WorkflowState =
  | "INITIALIZING"
  | "NAVIGATING"
  | "CHECKING_AUTH"
  | "AUTH_REQUIRED"
  | "WAITING_FOR_USER_LOGIN"
  | "VERIFYING_AUTH"
  | "AUTHENTICATED"
  | "INSPECTING_APPLICATION"
  | "FILLING_FORM"
  | "AWAITING_USER_REVIEW"
  | "SUBMITTING"
  | "VERIFYING_SUBMISSION"
  | "PAUSED"
  | "REAUTHENTICATION_REQUIRED"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type AuthStatus =
  | "NONE"
  | "REQUIRED"
  | "AUTHENTICATED"
  | "MFA_REQUIRED"
  | "EXPIRED"
  | "UNKNOWN";

export interface WorkflowCheckpoint {
  state: WorkflowState;
  step: string;
  portalId: string;
  currentUrl?: string;
  data: {
    filledFields?: string[];
    missingFields?: string[];
    formData?: Record<string, unknown>;
    customAnswers?: Record<string, string>;
  };
  timestamp: string;
}

export interface SubmissionEvidence {
  submitted: boolean;
  alreadySubmitted?: boolean;
  confirmationId?: string;
  message?: string;
  evidenceType: "url" | "dom_message" | "portal_status" | "none";
  timestamp: string;
}

export interface DetectedField {
  id: string;
  name: string;
  label: string;
  type: "text" | "email" | "tel" | "file" | "textarea" | "select" | "checkbox" | "radio";
  required: boolean;
  options?: string[];
  placeholder?: string;
  mappedProfileKey?: string;
  detectedValue?: string;
}

export interface SubmissionLogEntry {
  timestamp: string;
  step: string;
  status: "info" | "success" | "warn" | "error";
  message: string;
  data?: Record<string, unknown>;
}

export interface PlatformDetectionResult {
  platform: SupportedPlatform;
  displayName: string;
  atsFamily: "greenhouse" | "lever" | "workable" | "ashby" | "internshala" | "naukri" | "generic";
  isSupportedDirectly: boolean;
  confidence: number;
}

export interface ApplicationFillData {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  summary?: string;
  coverLetter?: string;
  resumePath?: string;
  yearsOfExperience?: string;
  customAnswers?: Record<string, string>;
}
