import {
  PortalAdapter,
  AuthDetectionResult,
  ApplicationPageDetectionResult,
  PortalCapabilities,
} from "./portal-adapter.interface";
import { GenericPortalAdapter } from "./generic-adapter";

export class LeverAdapter extends GenericPortalAdapter implements PortalAdapter {
  public override readonly id: string = "lever";
  public override readonly name: string = "Lever ATS Portal";

  public override canHandle(jobUrl: string): boolean {
    return jobUrl.toLowerCase().includes("jobs.lever.co");
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
    return {
      requiresAuth: false,
      authState: "AUTHENTICATED",
    };
  }

  public override async detectApplicationPage(page: any): Promise<ApplicationPageDetectionResult> {
    const url = page.url();
    if (url.endsWith("/apply")) {
      return { isApplicationPage: true, formSelector: "form#application-form, form" };
    }
    const genericRes = await super.detectApplicationPage(page);
    return {
      ...genericRes,
      applyButtonSelector: "a.postings-btn, a[href$='/apply']",
    };
  }
}
