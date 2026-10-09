import {
  PortalAdapter,
  AuthDetectionResult,
  ApplicationPageDetectionResult,
  FormInspectionResult,
  FillFormResult,
  FormValidationResult,
  SubmissionEvidenceResult,
  PortalCapabilities,
} from "./portal-adapter.interface";
import { ApplicationFillData } from "../types";
import { GenericPortalAdapter } from "./generic-adapter";

export class AshbyAdapter extends GenericPortalAdapter implements PortalAdapter {
  public override readonly id: string = "ashby";
  public override readonly name: string = "Ashby ATS Portal";

  public override canHandle(jobUrl: string): boolean {
    return jobUrl.toLowerCase().includes("ashbyhq.com");
  }

  public override getPortalCapabilities(): PortalCapabilities {
    return {
      supportsAutoSubmit: true,
      supportsPersistentAuth: false,
      requiresManualVerification: false,
      platformId: this.id,
      displayName: this.name,
    };
  }

  public override async detectAuthenticationState(_page: any): Promise<AuthDetectionResult> {
    // Ashby job applications are public by design, no login required
    return {
      requiresAuth: false,
      authState: "AUTHENTICATED",
    };
  }

  public override async detectApplicationPage(page: any): Promise<ApplicationPageDetectionResult> {
    const url = page.url();
    if (url.includes("/application")) {
      return { isApplicationPage: true, formSelector: "form" };
    }
    const genericRes = await super.detectApplicationPage(page);
    return {
      ...genericRes,
      applyButtonSelector: "a[href*='/application'], button:contains('Apply')",
    };
  }
}
