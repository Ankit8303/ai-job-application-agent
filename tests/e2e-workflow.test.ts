import test from "node:test";
import assert from "node:assert/strict";
import http from "http";
import { chromium } from "playwright";
import { AuthStateMachine } from "../lib/automation/auth-state-machine";
import { AdapterRegistry } from "../lib/automation/adapters/adapter-registry";
import { SessionManager } from "../lib/automation/session-manager";
import path from "path";

test("E2E Integration - Public portal flow completes without login", async () => {
  // Start deterministic local HTTP test fixture server
  const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/html" });
    if (req.url === "/job/public-opening") {
      res.end(`
        <!DOCTYPE html>
        <html>
          <head><title>Senior Engineer - Public Application</title></head>
          <body>
            <h1>Senior Engineer</h1>
            <form id="apply_form" action="/job/public-opening/success" method="GET">
              <label for="name">Full Name</label>
              <input id="name" name="full_name" type="text" value="" required />
              
              <label for="email">Email Address</label>
              <input id="email" name="email" type="email" value="" required />
              
              <label for="phone">Phone Number</label>
              <input id="phone" name="phone" type="tel" value="" />

              <label for="cover_letter">Cover Letter</label>
              <textarea id="cover_letter" name="cover_letter"></textarea>

              <button id="submit_btn" type="submit">Submit Application</button>
            </form>
          </body>
        </html>
      `);
    } else if (req.url?.startsWith("/job/public-opening/success")) {
      res.end(`
        <!DOCTYPE html>
        <html>
          <head><title>Thank You</title></head>
          <body>
            <h1>Thank you for applying!</h1>
            <p>Your application was successfully submitted. Confirmation #PUB-10293.</p>
          </body>
        </html>
      `);
    } else {
      res.end("Not Found");
    }
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const port = (server.address() as any).port;
  const targetUrl = `http://127.0.0.1:${port}/job/public-opening`;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const sm = new AuthStateMachine({ applicationId: "e2e-pub-1", userId: "test-user" });
  const registry = new AdapterRegistry();
  const adapter = registry.getAdapterForUrl(targetUrl);

  // 1. Navigate
  sm.transition("NAVIGATING");
  await page.goto(targetUrl, { waitUntil: "domcontentloaded" });

  // 2. Check Auth
  sm.transition("CHECKING_AUTH");
  const authState = await adapter.detectAuthenticationState(page);
  assert.equal(authState.requiresAuth, false);

  sm.transition("AUTHENTICATED");
  sm.transition("INSPECTING_APPLICATION");

  // 3. Fill Form
  sm.transition("FILLING_FORM");
  const fillRes = await adapter.fillApplicationForm(page, {
    fullName: "Jane Candidate",
    email: "jane@test.com",
    phone: "+15551234567",
    summary: "Experienced developer applying.",
  });
  assert.equal(fillRes.success, true);
  assert.ok(fillRes.fieldsFilled.length >= 2);

  // 4. Submit
  sm.transition("SUBMITTING");
  await page.click("#submit_btn");
  await page.waitForTimeout(1000);

  // 5. Verify Submission
  sm.transition("VERIFYING_SUBMISSION");
  const evidence = await adapter.detectSubmissionEvidence(page);
  assert.equal(evidence.submitted, true);

  sm.transition("COMPLETED");
  assert.equal(sm.getState(), "COMPLETED");

  await browser.close();
  server.close();
});

test("E2E Integration - Login required portal enters AUTH_REQUIRED and resumes post-login", async () => {
  let userLoggedIn = false;

  const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/html" });

    if (req.url === "/internship/detail/123") {
      if (!userLoggedIn) {
        // Unauthenticated view with login modal
        res.end(`
          <!DOCTYPE html>
          <html>
            <head><title>Internship Details</title></head>
            <body>
              <nav>
                <a id="login_link" href="/login/user">Login</a>
                <a href="/register">Register</a>
              </nav>
              <div id="login_modal" class="modal show">
                <h2>Please log in to apply</h2>
                <input id="user_email" type="email" placeholder="Email" />
                <input id="user_password" type="password" placeholder="Password" />
                <button id="modal_login_btn">Sign In</button>
              </div>
              <button id="apply_btn">Apply Now</button>
            </body>
          </html>
        `);
      } else {
        // Authenticated view with user avatar and actual application form
        res.end(`
          <!DOCTYPE html>
          <html>
            <head><title>Internship Details - Authenticated</title></head>
            <body>
              <nav>
                <div id="nav_profile" class="profile_container">
                  <img src="/avatar.png" alt="Profile Avatar" />
                  <span>Jane User</span>
                </div>
              </nav>
              <form id="internshala_apply_form" action="/internship/detail/123/confirmed" method="GET">
                <h2>Submit Your Application</h2>
                <label for="cover_letter_text">Why should you be hired?</label>
                <textarea id="cover_letter_text" name="cover_letter"></textarea>
                <label for="availability">Are you available for 6 months?</label>
                <input type="text" id="availability" name="availability" value="" />
                <button id="submit_application_btn" type="submit">Submit Application</button>
              </form>
            </body>
          </html>
        `);
      }
    } else if (req.url?.startsWith("/internship/detail/123/confirmed")) {
      res.end(`
        <!DOCTYPE html>
        <html>
          <head><title>Application Submitted</title></head>
          <body>
            <div class="application_status">Application submitted successfully!</div>
          </body>
        </html>
      `);
    } else {
      res.end("Not Found");
    }
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const port = (server.address() as any).port;
  const targetUrl = `http://127.0.0.1:${port}/internship/detail/123`;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const sm = new AuthStateMachine({ applicationId: "e2e-auth-1", userId: "test-user-login" });
  const registry = new AdapterRegistry();
  // Target simulated as Internshala adapter
  const adapter = registry.getAdapterById("internshala");

  // Step 1: Navigating
  sm.transition("NAVIGATING");
  await page.goto(targetUrl, { waitUntil: "domcontentloaded" });

  // Step 2: Check Auth - Unauthenticated!
  sm.transition("CHECKING_AUTH");
  const authCheck1 = await adapter.detectAuthenticationState(page);
  assert.equal(authCheck1.requiresAuth, true);
  assert.equal(authCheck1.authState, "AUTH_REQUIRED");

  // Step 3: Transition to AUTH_REQUIRED & WAITING_FOR_USER_LOGIN
  sm.transition("AUTH_REQUIRED", "Detected login modal");
  assert.equal(sm.requiresUserInteraction(), true);

  sm.transition("WAITING_FOR_USER_LOGIN");

  // Save workflow checkpoint
  const checkpoint = sm.createCheckpoint({
    currentUrl: targetUrl,
    portalId: "internshala",
  });
  assert.equal(checkpoint.state, "WAITING_FOR_USER_LOGIN");

  // Step 4: Simulate User completes login in browser
  userLoggedIn = true;
  await page.goto(targetUrl, { waitUntil: "domcontentloaded" });

  // Step 5: Verify Auth
  sm.transition("VERIFYING_AUTH");
  const authCheck2 = await adapter.detectAuthenticationState(page);
  assert.equal(authCheck2.requiresAuth, false);
  assert.equal(authCheck2.authState, "AUTHENTICATED");

  // Step 6: Resume workflow automatically from checkpoint
  sm.transition("AUTHENTICATED");
  sm.transition("INSPECTING_APPLICATION");

  // Step 7: Fill Form
  sm.transition("FILLING_FORM");
  await adapter.fillApplicationForm(page, {
    fullName: "Jane User",
    email: "jane@user.com",
    phone: "+919876543210",
    summary: "I have 3+ years experience in React and full stack development.",
  });

  // Step 8: Submit & Verify
  sm.transition("SUBMITTING");
  await page.click("#submit_application_btn");
  await page.waitForTimeout(1000);

  sm.transition("VERIFYING_SUBMISSION");
  const evidence = await adapter.detectSubmissionEvidence(page);
  assert.equal(evidence.submitted, true);

  sm.transition("COMPLETED");
  assert.equal(sm.getState(), "COMPLETED");

  await browser.close();
  server.close();
});
