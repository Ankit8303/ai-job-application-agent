import {
  PortalAdapter,
  AuthDetectionResult,
  ApplicationPageDetectionResult,
  PortalCapabilities,
} from "./portal-adapter.interface";
import { GenericPortalAdapter } from "./generic-adapter";

export class GreenhouseAdapter extends GenericPortalAdapter implements PortalAdapter {
  public override readonly id: string = "greenhouse";
  public override readonly name: string = "Greenhouse ATS Portal";

  public override canHandle(jobUrl: string): boolean {
    const lower = jobUrl.toLowerCase();
    return lower.includes("greenhouse.io") || lower.includes("gh_jid=");
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
    try {
      return await page.evaluate(() => {
        // @ts-ignore
        if (typeof window !== "undefined" && !window.__name) window.__name = (f: any) => f;

        const appForm = document.querySelector("#application_form, form#apply_form");
        if (appForm) {
          return { isApplicationPage: true, formSelector: "#application_form" };
        }
        return {
          isApplicationPage: false,
          applyButtonSelector: "#apply_button, a[href*='#app'], a[href*='apply']",
        };
      });
    } catch {
      return { isApplicationPage: true };
    }
  }
}
