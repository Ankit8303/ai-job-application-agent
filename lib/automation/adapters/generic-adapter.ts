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
import { ApplicationFillData, DetectedField } from "../types";

export class GenericPortalAdapter implements PortalAdapter {
  public readonly id: string = "generic";
  public readonly name: string = "Generic Career / Standard Form Portal";

  public canHandle(_jobUrl: string): boolean {
    return true; // Fallback adapter can handle any URL
  }

  public getPortalCapabilities(): PortalCapabilities {
    return {
      supportsAutoSubmit: true,
      supportsPersistentAuth: true,
      requiresManualVerification: false,
      platformId: this.id,
      displayName: this.name,
    };
  }

  public async detectAuthenticationState(page: any): Promise<AuthDetectionResult> {
    try {
      const evaluation = await page.evaluate(() => {
        // @ts-ignore
        if (typeof window !== "undefined" && !window.__name) window.__name = (f: any) => f;

        const currentUrl = (window.location.href || "").toLowerCase();
        const hasPasswordField = Boolean(document.querySelector("input[type='password']"));
        const bodyText = (document.body?.innerText || "").toLowerCase();

        const isLoginUrl =
          currentUrl.includes("/login") ||
          currentUrl.includes("/signin") ||
          currentUrl.includes("/sign-in") ||
          currentUrl.includes("/auth/") ||
          currentUrl.includes("accounts.google.com");

        const hasLoginKeywords =
          bodyText.includes("sign in to apply") ||
          bodyText.includes("log in to apply") ||
          bodyText.includes("login to apply") ||
          bodyText.includes("please login") ||
          bodyText.includes("please sign in");

        const buttons = Array.from(document.querySelectorAll("button, a, input[type='submit']"));
        const hasLoginOnlyCta = buttons.some((b) => {
          const t = (b.textContent || (b as HTMLInputElement).value || "").toLowerCase().trim();
          return t === "login to apply" || t === "sign in to apply";
        });

        // Also check if inputs are standard application fields
        const allInputs = Array.from(document.querySelectorAll("input, textarea, select"));
        const inputCount = allInputs.filter((el: any) => {
          const type = (el.type || "").toLowerCase();
          return !["hidden", "search", "submit", "button"].includes(type);
        }).length;

        return {
          isLoginUrl,
          hasPasswordField,
          hasLoginKeywords: hasLoginKeywords || hasLoginOnlyCta,
          inputCount,
        };
      });

      if (evaluation.hasPasswordField || evaluation.isLoginUrl || evaluation.hasLoginKeywords) {
        return {
          requiresAuth: true,
          authState: "AUTH_REQUIRED",
          loginUrl: page.url(),
          reason: "Detected authentication requirement / login form gate",
        };
      }

      return {
        requiresAuth: false,
        authState: "AUTHENTICATED",
      };
    } catch (err: any) {
      console.warn("Error detecting generic auth state:", err);
      return {
        requiresAuth: false,
        authState: "UNKNOWN",
        reason: err?.message,
      };
    }
  }

  public async detectApplicationPage(page: any): Promise<ApplicationPageDetectionResult> {
    try {
      return await page.evaluate(() => {
        // @ts-ignore
        if (typeof window !== "undefined" && !window.__name) window.__name = (f: any) => f;

        const bodyText = (document.body?.innerText || "").toLowerCase();
        const alreadyApplied =
          bodyText.includes("already applied") ||
          bodyText.includes("you have applied for this position") ||
          bodyText.includes("application already submitted");

        const inputs = Array.from(document.querySelectorAll("input, textarea, select")).filter((el: any) => {
          const type = (el.type || "").toLowerCase();
          return !["hidden", "search", "submit", "button", "reset"].includes(type);
        });

        if (inputs.length >= 3) {
          return {
            isApplicationPage: true,
            formSelector: "form",
            alreadyApplied,
          };
        }

        return {
          isApplicationPage: false,
          applyButtonSelector: "a:contains('Apply'), button:contains('Apply')",
          alreadyApplied,
        };
      });
    } catch {
      return { isApplicationPage: true };
    }
  }

  public async inspectApplicationForm(page: any): Promise<FormInspectionResult> {
    try {
      return await page.evaluate(() => {
        // @ts-ignore
        if (typeof window !== "undefined" && !window.__name) window.__name = (f: any) => f;

        const fields: any[] = [];
        const inputs = Array.from(document.querySelectorAll("input, textarea, select")) as (
          | HTMLInputElement
          | HTMLTextAreaElement
          | HTMLSelectElement
        )[];

        for (const el of inputs) {
          const type = (el.type || "").toLowerCase();
          if (["hidden", "submit", "button", "reset"].includes(type)) continue;

          const labelEl = (el.id && document.querySelector(`label[for="${el.id}"]`)) || el.closest("label");
          const label = (labelEl?.textContent || "").trim();
          const name = el.getAttribute("name") || el.id || "";
          const required = Boolean(el.required || el.getAttribute("aria-required") === "true");

          fields.push({
            id: el.id || name,
            name,
            label: label || name,
            type: type || "text",
            required,
            placeholder: el.getAttribute("placeholder") || undefined,
          });
        }

        return {
          isReady: fields.length > 0,
          fields,
        };
      });
    } catch {
      return { isReady: false, fields: [] };
    }
  }

  public async fillApplicationForm(
    page: any,
    data: ApplicationFillData
  ): Promise<FillFormResult> {
    const fullName = data.fullName || "Applicant";
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = data.firstName || nameParts[0] || fullName;
    const lastName = data.lastName || (nameParts.length > 1 ? nameParts.slice(1).join(" ") : "");
    const email = data.email || "";
    const phone = data.phone || "";
    const location = data.location || "Remote";
    const linkedin = data.linkedin || "";
    const github = data.github || "";
    const portfolio = data.portfolio || "";
    const summary = data.coverLetter || data.summary || "Experienced professional applying for this role.";

    // Handle file input for resume if provided
    if (data.resumePath) {
      try {
        const fileInputs = await page.$$("input[type='file']");
        for (const fi of fileInputs) {
          await fi.setInputFiles(data.resumePath).catch(() => {});
        }
      } catch {}
    }

    try {
      const fillResult = await page.evaluate(
        (cData: any) => {
          // @ts-ignore
          if (typeof window !== "undefined" && !window.__name) window.__name = (f: any) => f;

          const filled: string[] = [];
          const clean = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

          const inputs = Array.from(
            document.querySelectorAll("input, textarea, select")
          ) as (HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)[];

          for (const el of inputs) {
            const type = (el.type || "").toLowerCase();
            if (["hidden", "submit", "button", "reset", "image", "file"].includes(type)) continue;

            if (type === "checkbox") {
              const inputEl = el as HTMLInputElement;
              if (!inputEl.checked) {
                inputEl.checked = true;
                inputEl.dispatchEvent(new Event("change", { bubbles: true }));
                filled.push("Checkbox: Consent/Terms");
              }
              continue;
            }

            if (type === "radio") {
              const inputEl = el as HTMLInputElement;
              const parentText = (inputEl.closest("label, div, li")?.textContent || "").toLowerCase();
              const val = (inputEl.value || "").toLowerCase();
              if (
                parentText.includes("authorized") ||
                parentText.includes("eligible") ||
                val === "yes"
              ) {
                inputEl.checked = true;
                inputEl.dispatchEvent(new Event("change", { bubbles: true }));
                filled.push("Radio: Authorized");
              }
              continue;
            }

            const labelEl = (el.id && document.querySelector(`label[for="${el.id}"]`)) || el.closest("label");
            const label = (labelEl?.textContent || "").trim();
            const haystacks = [
              el.getAttribute("name"),
              el.id,
              el.getAttribute("placeholder"),
              el.getAttribute("aria-label"),
              label,
            ]
              .filter(Boolean)
              .map((h) => clean(h as string));

            let matchedVal: string | null = null;
            let matchedKey: string | null = null;

            if (haystacks.some((h) => h.includes("first") && (h.includes("name") || h.includes("given")))) {
              matchedVal = cData.firstName;
              matchedKey = "First Name";
            } else if (haystacks.some((h) => h.includes("last") && (h.includes("name") || h.includes("family")))) {
              matchedVal = cData.lastName;
              matchedKey = "Last Name";
            } else if (haystacks.some((h) => h.includes("name") && !h.includes("user") && !h.includes("file"))) {
              matchedVal = cData.fullName;
              matchedKey = "Full Name";
            } else if (haystacks.some((h) => h.includes("email") || h.includes("mail"))) {
              matchedVal = cData.email;
              matchedKey = "Email";
            } else if (haystacks.some((h) => h.includes("phone") || h.includes("tel") || h.includes("mobile") || h.includes("contact"))) {
              matchedVal = cData.phone;
              matchedKey = "Phone";
            } else if (haystacks.some((h) => h.includes("linkedin"))) {
              matchedVal = cData.linkedin;
              matchedKey = "LinkedIn";
            } else if (haystacks.some((h) => h.includes("github"))) {
              matchedVal = cData.github;
              matchedKey = "GitHub";
            } else if (haystacks.some((h) => h.includes("portfolio") || h.includes("website") || h.includes("url") || h.includes("link"))) {
              matchedVal = cData.portfolio;
              matchedKey = "Portfolio";
            } else if (haystacks.some((h) => h.includes("location") || h.includes("city") || h.includes("address"))) {
              matchedVal = cData.location;
              matchedKey = "Location";
            } else if (haystacks.some((h) => h.includes("cover") || h.includes("summary") || h.includes("why") || h.includes("about") || h.includes("note"))) {
              matchedVal = cData.summary;
              matchedKey = "Cover Letter / Summary";
            }

            if (el instanceof HTMLSelectElement) {
              if (!el.value && el.options.length > 1) {
                const validOpt = Array.from(el.options).find((o) => o.value && o.value !== "");
                if (validOpt) {
                  el.value = validOpt.value;
                  el.dispatchEvent(new Event("change", { bubbles: true }));
                  filled.push(`Select: ${validOpt.text}`);
                }
              }
              continue;
            }

            if (matchedVal) {
              const proto =
                el instanceof HTMLTextAreaElement
                  ? HTMLTextAreaElement.prototype
                  : HTMLInputElement.prototype;
              const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
              if (setter) setter.call(el, matchedVal);
              else el.value = matchedVal;

              el.dispatchEvent(new Event("input", { bubbles: true }));
              el.dispatchEvent(new Event("change", { bubbles: true }));
              el.dispatchEvent(new Event("blur", { bubbles: true }));
              filled.push(matchedKey || "Field");
            }
          }

          return filled;
        },
        {
          fullName,
          firstName,
          lastName,
          email,
          phone,
          location,
          linkedin,
          github,
          portfolio,
          summary,
        }
      );

      return {
        success: fillResult.length > 0,
        fieldsFilled: fillResult,
      };
    } catch (err: any) {
      return {
        success: false,
        fieldsFilled: [],
        errors: [err?.message || "Fill error"],
      };
    }
  }

  public async validateApplicationForm(page: any): Promise<FormValidationResult> {
    try {
      return await page.evaluate(() => {
        // @ts-ignore
        if (typeof window !== "undefined" && !window.__name) window.__name = (f: any) => f;

        const invalidInputs = Array.from(document.querySelectorAll(":invalid")) as HTMLElement[];
        const errors = invalidInputs.map((el) => {
          const name = el.getAttribute("name") || el.id || "Required field";
          return `Field '${name}' is invalid or missing`;
        });

        return {
          isValid: invalidInputs.length === 0,
          errors,
        };
      });
    } catch {
      return { isValid: true, errors: [] };
    }
  }

  public async detectSubmissionEvidence(page: any): Promise<SubmissionEvidenceResult> {
    try {
      return await page.evaluate(() => {
        // @ts-ignore
        if (typeof window !== "undefined" && !window.__name) window.__name = (f: any) => f;

        const text = (document.body?.innerText || "").toLowerCase();
        const url = (window.location.href || "").toLowerCase();

        const alreadyApplied =
          text.includes("already applied") ||
          text.includes("you have already applied") ||
          text.includes("application already submitted");

        if (alreadyApplied) {
          return {
            submitted: true,
            alreadySubmitted: true,
            message: "User has already submitted an application for this role.",
            evidenceType: "portal_status",
          };
        }

        const isSuccessUrl =
          url.includes("thank_you") ||
          url.includes("applied") ||
          url.includes("confirmation") ||
          url.includes("success") ||
          url.includes("/submitted");

        const isSuccessText =
          text.includes("thank you for applying") ||
          text.includes("application submitted") ||
          text.includes("we have received your application") ||
          text.includes("application received") ||
          text.includes("successfully submitted") ||
          text.includes("thanks for applying") ||
          text.includes("application complete");

        if (isSuccessUrl || isSuccessText) {
          return {
            submitted: true,
            message: "Application confirmed successfully.",
            evidenceType: isSuccessUrl ? "url" : "dom_message",
          };
        }

        return {
          submitted: false,
          evidenceType: "none",
        };
      });
    } catch {
      return { submitted: false, evidenceType: "none" };
    }
  }
}
