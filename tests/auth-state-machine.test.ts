import test from "node:test";
import assert from "node:assert/strict";
import { AuthStateMachine, WorkflowState } from "../lib/automation/auth-state-machine";

test("AuthStateMachine - Valid transitions happy path (No auth required)", () => {
  const sm = new AuthStateMachine({ applicationId: "test-app-1", userId: "user-123" });
  assert.equal(sm.getState(), "INITIALIZING");

  sm.transition("NAVIGATING", "Opening target job opening URL");
  assert.equal(sm.getState(), "NAVIGATING");

  sm.transition("CHECKING_AUTH", "Inspecting page for authentication gates");
  assert.equal(sm.getState(), "CHECKING_AUTH");

  // Portal is public, directly authenticated/open
  sm.transition("AUTHENTICATED", "No login required, access granted");
  assert.equal(sm.getState(), "AUTHENTICATED");

  sm.transition("INSPECTING_APPLICATION", "Parsing form elements");
  assert.equal(sm.getState(), "INSPECTING_APPLICATION");

  sm.transition("FILLING_FORM", "Injecting candidate profile data");
  assert.equal(sm.getState(), "FILLING_FORM");

  sm.transition("SUBMITTING", "Executing final form submission");
  assert.equal(sm.getState(), "SUBMITTING");

  sm.transition("VERIFYING_SUBMISSION", "Confirming submission receipt");
  assert.equal(sm.getState(), "VERIFYING_SUBMISSION");

  sm.transition("COMPLETED", "Application successfully submitted");
  assert.equal(sm.getState(), "COMPLETED");
  assert.equal(sm.isTerminal(), true);
});

test("AuthStateMachine - Login required and human-in-the-loop resume flow", () => {
  const sm = new AuthStateMachine({ applicationId: "test-app-2", userId: "user-123" });
  
  sm.transition("NAVIGATING");
  sm.transition("CHECKING_AUTH");

  // Portal requires login
  sm.transition("AUTH_REQUIRED", "Detected login modal / authentication wall");
  assert.equal(sm.getState(), "AUTH_REQUIRED");
  assert.equal(sm.requiresUserInteraction(), true);

  sm.transition("WAITING_FOR_USER_LOGIN", "Awaiting candidate to complete login");
  assert.equal(sm.getState(), "WAITING_FOR_USER_LOGIN");

  sm.transition("VERIFYING_AUTH", "Checking if portal session is now authenticated");
  assert.equal(sm.getState(), "VERIFYING_AUTH");

  // Authentication succeeded
  sm.transition("AUTHENTICATED", "Session verified, user logged in");
  assert.equal(sm.getState(), "AUTHENTICATED");

  // Resumes application flow from checkpoint
  sm.transition("INSPECTING_APPLICATION", "Re-inspecting form post-login");
  sm.transition("FILLING_FORM", "Filling form fields");
  sm.transition("SUBMITTING", "Submitting form");
  sm.transition("VERIFYING_SUBMISSION", "Verifying confirmation");
  sm.transition("COMPLETED", "Application complete");

  assert.equal(sm.getState(), "COMPLETED");
});

test("AuthStateMachine - Invalid transition rejection", () => {
  const sm = new AuthStateMachine({ applicationId: "test-app-3", userId: "user-123" });
  assert.equal(sm.getState(), "INITIALIZING");

  // Cannot jump straight from INITIALIZING to SUBMITTING or COMPLETED
  assert.throws(() => {
    sm.transition("SUBMITTING");
  }, /Invalid state transition/);

  assert.throws(() => {
    sm.transition("COMPLETED");
  }, /Invalid state transition/);

  assert.equal(sm.getState(), "INITIALIZING");
});

test("AuthStateMachine - Checkpoint save and restore", () => {
  const sm = new AuthStateMachine({ applicationId: "test-app-4", userId: "user-123" });
  sm.transition("NAVIGATING");
  sm.transition("CHECKING_AUTH");
  sm.transition("AUTH_REQUIRED");

  const checkpoint = sm.createCheckpoint({
    currentUrl: "https://internshala.com/internship/detail/123",
    portalId: "internshala",
    filledFields: ["name", "email"],
    missingFields: ["cover_letter"],
  });

  assert.equal(checkpoint.state, "AUTH_REQUIRED");
  assert.equal(checkpoint.portalId, "internshala");
  assert.deepEqual(checkpoint.data.filledFields, ["name", "email"]);

  // Create new state machine instance and restore from checkpoint
  const restoredSm = AuthStateMachine.fromCheckpoint({ applicationId: "test-app-4", userId: "user-123" }, checkpoint);
  assert.equal(restoredSm.getState(), "AUTH_REQUIRED");

  // Can validly transition to WAITING_FOR_USER_LOGIN from restored state
  restoredSm.transition("WAITING_FOR_USER_LOGIN");
  assert.equal(restoredSm.getState(), "WAITING_FOR_USER_LOGIN");
});

test("AuthStateMachine - Expired session triggers REAUTHENTICATION_REQUIRED", () => {
  const sm = new AuthStateMachine({ applicationId: "test-app-5", userId: "user-123" });
  sm.transition("NAVIGATING");
  sm.transition("CHECKING_AUTH");
  sm.transition("AUTHENTICATED");
  sm.transition("INSPECTING_APPLICATION");

  // Unexpected session expiry during inspection
  sm.transition("REAUTHENTICATION_REQUIRED", "Session token expired during application page load");
  assert.equal(sm.getState(), "REAUTHENTICATION_REQUIRED");
  assert.equal(sm.requiresUserInteraction(), true);

  sm.transition("WAITING_FOR_USER_LOGIN", "Prompting user to renew session");
  assert.equal(sm.getState(), "WAITING_FOR_USER_LOGIN");
});
