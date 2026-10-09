import {
  DetectedField,
  ApplicationFillData,
  SubmissionEvidence,
  AuthStatus,
  WorkflowState,
} from "../types";

export interface AuthDetectionResult {
  requiresAuth: boolean;
  authState: "AUTHENTICATED" | "AUTH_REQUIRED" | "MFA_REQUIRED" | "SESSION_EXPIRED" | "UNKNOWN";
  loginUrl?: string;
  reason?: string;
  loginType?: "standard" | "oauth" | "otp" | "sso";
}

export interface ApplicationPageDetectionResult {
  isApplicationPage: boolean;
  applyButtonSelector?: string;
  formSelector?: string;
  alreadyApplied?: boolean;
}

export interface FormInspectionResult {
  isReady: boolean;
  fields: DetectedField[];
  submitButtonSelector?: string;
  missingRequiredFields?: string[];
}

export interface FillFormResult {
  success: boolean;
  fieldsFilled: string[];
  fieldsSkipped?: string[];
  errors?: string[];
}

export interface FormValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface SubmissionEvidenceResult {
  submitted: boolean;
  alreadySubmitted?: boolean;
  confirmationId?: string;
  message?: string;
  evidenceType: "url" | "dom_message" | "portal_status" | "none";
}

export interface PortalCapabilities {
  supportsAutoSubmit: boolean;
  supportsPersistentAuth: boolean;
  requiresManualVerification: boolean;
  loginUrl?: string;
  platformId: string;
  displayName: string;
}

export interface PortalAdapter {
  readonly id: string;
  readonly name: string;

  canHandle(jobUrl: string, pageContext?: { html?: string; url?: string }): boolean;

  detectAuthenticationState(page: any): Promise<AuthDetectionResult>;

  detectApplicationPage(page: any): Promise<ApplicationPageDetectionResult>;

  inspectApplicationForm(page: any): Promise<FormInspectionResult>;

  fillApplicationForm(page: any, data: ApplicationFillData): Promise<FillFormResult>;

  validateApplicationForm(page: any): Promise<FormValidationResult>;

  detectSubmissionEvidence(page: any): Promise<SubmissionEvidenceResult>;

  getPortalCapabilities(): PortalCapabilities;
}
