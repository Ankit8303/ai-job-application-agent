import test from "node:test";
import assert from "node:assert/strict";
import { AdapterRegistry } from "../lib/automation/adapters/adapter-registry";
import { InternshalaAdapter } from "../lib/automation/adapters/internshala-adapter";
import { AshbyAdapter } from "../lib/automation/adapters/ashby-adapter";
import { GreenhouseAdapter } from "../lib/automation/adapters/greenhouse-adapter";
import { LeverAdapter } from "../lib/automation/adapters/lever-adapter";
import { GenericPortalAdapter } from "../lib/automation/adapters/generic-adapter";

test("AdapterRegistry - Selects correct adapter for URL", () => {
  const registry = new AdapterRegistry();

  const internshala = registry.getAdapterForUrl("https://internshala.com/internship/detail/react-developer-internship-123");
  assert.equal(internshala.id, "internshala");

  const ashby = registry.getAdapterForUrl("https://jobs.ashbyhq.com/example-corp/abc-123");
  assert.equal(ashby.id, "ashby");

  const greenhouse = registry.getAdapterForUrl("https://boards.greenhouse.io/corp/jobs/456");
  assert.equal(greenhouse.id, "greenhouse");

  const lever = registry.getAdapterForUrl("https://jobs.lever.co/company/xyz-789");
  assert.equal(lever.id, "lever");

  const generic = registry.getAdapterForUrl("https://careers.company.com/apply/job-999");
  assert.equal(generic.id, "generic");
});

test("InternshalaAdapter - Authentication and Already Applied detection logic", async () => {
  const adapter = new InternshalaAdapter();

  // Mock page unauthenticated: has login modal or login URL
  const mockUnauthPage: any = {
    url: () => "https://internshala.com/internship/detail/123",
    evaluate: async (fn: any) => {
      // simulate unauthenticated DOM: has login button, no user profile avatar
      return {
        hasLoginModal: true,
        hasProfileAvatar: false,
        hasLoginButton: true,
        hasAlreadyApplied: false,
        currentUrl: "https://internshala.com/internship/detail/123",
      };
    },
  };

  const authState = await adapter.detectAuthenticationState(mockUnauthPage);
  assert.equal(authState.requiresAuth, true);
  assert.equal(authState.authState, "AUTH_REQUIRED");
  assert.equal(authState.loginUrl, "https://internshala.com/login/user");

  // Mock page authenticated: user profile avatar present
  const mockAuthPage: any = {
    url: () => "https://internshala.com/internship/detail/123",
    evaluate: async (fn: any) => {
      return {
        hasLoginModal: false,
        hasProfileAvatar: true,
        hasLoginButton: false,
        hasAlreadyApplied: false,
        currentUrl: "https://internshala.com/internship/detail/123",
      };
    },
  };

  const authState2 = await adapter.detectAuthenticationState(mockAuthPage);
  assert.equal(authState2.requiresAuth, false);
  assert.equal(authState2.authState, "AUTHENTICATED");

  // Mock page: already applied
  const mockAlreadyAppliedPage: any = {
    url: () => "https://internshala.com/internship/detail/123",
    evaluate: async (fn: any) => {
      // Mock DOM environment for node test
      const originalDoc = (global as any).document;
      const originalWin = (global as any).window;
      (global as any).window = { location: { href: "https://internshala.com/internship/detail/123" } };
      (global as any).document = {
        body: { innerText: "You have already applied for this internship." },
        querySelector: (sel: string) => sel.includes("already_applied") ? {} : null,
      };
      try {
        return await fn();
      } finally {
        (global as any).document = originalDoc;
        (global as any).window = originalWin;
      }
    },
  };

  const subEvidence = await adapter.detectSubmissionEvidence(mockAlreadyAppliedPage);
  assert.equal(subEvidence.submitted, true);
  assert.equal(subEvidence.alreadySubmitted, true);
});

test("GenericPortalAdapter - Detects public form and login redirect", async () => {
  const adapter = new GenericPortalAdapter();

  // Public form page: 5 inputs, no password field, not redirected to login
  const mockPublicPage: any = {
    url: () => "https://jobs.example.com/apply",
    evaluate: async (fn: any) => {
      return {
        isLoginUrl: false,
        hasPasswordField: false,
        hasLoginKeywords: false,
        inputCount: 5,
        hasSubmitButton: true,
      };
    },
  };

  const auth1 = await adapter.detectAuthenticationState(mockPublicPage);
  assert.equal(auth1.requiresAuth, false);
  assert.equal(auth1.authState, "AUTHENTICATED");

  // Login redirect: redirected to /login, has password field
  const mockLoginPage: any = {
    url: () => "https://jobs.example.com/auth/login?redirect=/apply",
    evaluate: async (fn: any) => {
      return {
        isLoginUrl: true,
        hasPasswordField: true,
        hasLoginKeywords: true,
        inputCount: 2,
        hasSubmitButton: true,
      };
    },
  };

  const auth2 = await adapter.detectAuthenticationState(mockLoginPage);
  assert.equal(auth2.requiresAuth, true);
  assert.equal(auth2.authState, "AUTH_REQUIRED");
});
