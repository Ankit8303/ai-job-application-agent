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

export class InternshalaAdapter implements PortalAdapter {
  public readonly id = "internshala";
  public readonly name = "Internshala Internship & Job Portal";

  public canHandle(jobUrl: string): boolean {
    return jobUrl.toLowerCase().includes("internshala.com");
  }

  public getPortalCapabilities(): PortalCapabilities {
    return {
      supportsAutoSubmit: true,
      supportsPersistentAuth: true,
      requiresManualVerification: false,
      loginUrl: "https://internshala.com/login/user",
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

        // 1. URL-level redirects
        const isLoginUrl =
          currentUrl.includes("/login/user") ||
          currentUrl.includes("/registration/student") ||
          currentUrl.includes("/login");

        // 2. DOM-level signals for Authenticated user
        const hasProfileAvatar = Boolean(
          document.querySelector(
            "#nav_profile, .profile_container, .profile_dropdown, a[href*='/student/dashboard'], a[href*='/user/profile'], .user_profile_holder, .nav_user_profile"
          )
        );

        // 3. DOM-level signals for Login Required / Modal
        const loginModal = document.querySelector("#login_modal, #login-modal, .modal_login, .login-modal");
        const hasLoginModal =
          Boolean(loginModal) &&
          (loginModal?.classList.contains("show") ||
            (window.getComputedStyle(loginModal as Element).display !== "none" &&
              window.getComputedStyle(loginModal as Element).visibility !== "hidden"));

        const hasLoginButton = Boolean(
          document.querySelector("a[href*='/login/user'], #login_link, button.login-btn")
        );

        const bodyText = (document.body?.innerText || "").toLowerCase();
        const hasAlreadyApplied =
          bodyText.includes("already applied") ||
          bodyText.includes("you have applied for this internship") ||
          Boolean(document.querySelector(".already_applied_badge, #already_applied_btn"));

        return {
          isLoginUrl,
          hasProfileAvatar,
          hasLoginModal,
          hasLoginButton,
          hasAlreadyApplied,
          currentUrl,
        };
      });

      // If user profile avatar is visible, user is definitely authenticated
      if (evaluation.hasProfileAvatar && !evaluation.isLoginUrl) {
        return {
          requiresAuth: false,
          authState: "AUTHENTICATED",
        };
      }

      // If on login URL, or login modal is shown, or unauthenticated login button exists
      if (evaluation.isLoginUrl || evaluation.hasLoginModal || evaluation.hasLoginButton) {
        return {
          requiresAuth: true,
          authState: "AUTH_REQUIRED",
          loginUrl: "https://internshala.com/login/user",
          reason: "Internshala requires candidate login before accessing or submitting applications.",
          loginType: "standard",
        };
      }

      // Default to AUTHENTICATED if no gates detected
      return {
        requiresAuth: false,
        authState: "AUTHENTICATED",
      };
    } catch (err: any) {
      console.warn("Internshala auth detection error:", err);
      return {
        requiresAuth: true,
        authState: "AUTH_REQUIRED",
        loginUrl: "https://internshala.com/login/user",
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
          Boolean(document.querySelector(".already_applied_badge, #already_applied_btn"));

        const hasApplyForm = Boolean(
          document.querySelector(
            "#internshala_apply_form, #application_form, textarea[name='cover_letter'], #cover_letter_text, #proceed_button"
          )
        );

        return {
          isApplicationPage: hasApplyForm,
          formSelector: hasApplyForm ? "#internshala_apply_form, #application_form, form" : undefined,
          applyButtonSelector: "#apply_btn, .apply_now_button, button.btn-primary",
          alreadyApplied,
        };
      });
    } catch {
      return { isApplicationPage: false };
    }
  }

  public async inspectApplicationForm(page: any): Promise<FormInspectionResult> {
    try {
      return await page.evaluate(() => {
        // @ts-ignore
        if (typeof window !== "undefined" && !window.__name) window.__name = (f: any) => f;

        const fields: any[] = [];
        const inputs = Array.from(
          document.querySelectorAll("input, textarea, select")
        ) as (HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)[];

        for (const el of inputs) {
          const type = (el.type || "").toLowerCase();
          if (["hidden", "submit", "button", "reset"].includes(type)) continue;

          const labelEl = (el.id && document.querySelector(`label[for="${el.id}"]`)) || el.closest("label");
          const label = (labelEl?.textContent || "").trim();
          const name = el.getAttribute("name") || el.id || "";

          fields.push({
            id: el.id || name,
            name,
            label: label || name,
            type: type || "text",
            required: Boolean(el.required),
            placeholder: el.getAttribute("placeholder") || undefined,
          });
        }

        return {
          isReady: fields.length > 0,
          fields,
          submitButtonSelector: "#submit_application_btn, #submit, #proceed_button, button[type='submit']",
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
    const summary =
      data.coverLetter ||
      data.summary ||
      "I am very interested in this role. I have extensive hands-on experience and can deliver great results.";

    try {
      const fillResult = await page.evaluate(
        (cData: any) => {
          // @ts-ignore
          if (typeof window !== "undefined" && !window.__name) window.__name = (f: any) => f;

          const filled: string[] = [];

          // 1. Cover letter / Why should you be hired?
          const coverLetterEl = document.querySelector(
            "textarea[name='cover_letter'], #cover_letter_text, textarea#cover_letter, textarea"
          ) as HTMLTextAreaElement;

          if (coverLetterEl && !coverLetterEl.value) {
            coverLetterEl.value = cData.summary;
            coverLetterEl.dispatchEvent(new Event("input", { bubbles: true }));
            coverLetterEl.dispatchEvent(new Event("change", { bubbles: true }));
            filled.push("Cover Letter / Why should you be hired");
          }

          // 2. Availability (select Yes, available immediately)
          const radios = Array.from(document.querySelectorAll("input[type='radio']")) as HTMLInputElement[];
          for (const r of radios) {
            const label = (r.closest("label, div")?.textContent || "").toLowerCase();
            if (label.includes("yes") || label.includes("immediately") || label.includes("available")) {
              r.checked = true;
              r.dispatchEvent(new Event("change", { bubbles: true }));
              filled.push("Availability: Yes, immediately");
              break;
            }
          }

          // 3. Any additional questions or links
          const textInputs = Array.from(document.querySelectorAll("input[type='text']")) as HTMLInputElement[];
          for (const ti of textInputs) {
            const label = (ti.closest("label, div")?.textContent || "").toLowerCase();
            if (label.includes("github") && cData.github) {
              ti.value = cData.github;
              ti.dispatchEvent(new Event("input", { bubbles: true }));
              filled.push("GitHub Link");
            } else if (label.includes("portfolio") && cData.portfolio) {
              ti.value = cData.portfolio;
              ti.dispatchEvent(new Event("input", { bubbles: true }));
              filled.push("Portfolio Link");
            } else if (label.includes("availability") || label.includes("start date")) {
              ti.value = "Immediate";
              ti.dispatchEvent(new Event("input", { bubbles: true }));
              filled.push("Availability Date: Immediate");
            }
          }

          return filled;
        },
        {
          summary,
          github: data.github || "",
          portfolio: data.portfolio || "",
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
        errors: [err?.message || "Internshala form fill error"],
      };
    }
  }

  public async validateApplicationForm(page: any): Promise<FormValidationResult> {
    try {
      return await page.evaluate(() => {
        // @ts-ignore
        if (typeof window !== "undefined" && !window.__name) window.__name = (f: any) => f;

        const coverLetter = document.querySelector(
          "textarea[name='cover_letter'], #cover_letter_text, textarea"
        ) as HTMLTextAreaElement;

        const errors: string[] = [];
        if (coverLetter && coverLetter.value.trim().length < 10) {
          errors.push("Cover letter response is required on Internshala.");
        }

        return {
          isValid: errors.length === 0,
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
          text.includes("you have applied for this internship") ||
          Boolean(document.querySelector(".already_applied_badge, #already_applied_btn"));

        if (alreadyApplied) {
          return {
            submitted: true,
            alreadySubmitted: true,
            message: "User has already applied for this Internshala listing.",
            evidenceType: "portal_status",
          };
        }

        const isSuccess =
          text.includes("application submitted successfully") ||
          text.includes("you have successfully applied") ||
          url.includes("/confirmed") ||
          url.includes("/submitted") ||
          Boolean(document.querySelector(".application_status, .application-success-modal"));

        if (isSuccess) {
          return {
            submitted: true,
            message: "Application submitted successfully on Internshala.",
            evidenceType: "dom_message",
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
