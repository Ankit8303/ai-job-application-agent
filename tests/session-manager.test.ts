import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { SessionManager } from "../lib/automation/session-manager";

test("SessionManager - Encryption, persistence, and retrieval", async () => {
  const manager = new SessionManager({ testDir: path.join(process.cwd(), "tmp_test_sessions") });
  const userId = "test-user-alpha";
  const portalId = "internshala";
  const mockStorageState = {
    cookies: [
      { name: "session_id", value: "secret_cookie_token_987", domain: ".internshala.com", path: "/" },
    ],
    origins: [
      {
        origin: "https://internshala.com",
        localStorage: [{ name: "user_jwt", value: "jwt_token_secret_xyz" }],
      },
    ],
  };

  // 1. Save session
  const sessionRef = await manager.saveSessionState(userId, portalId, mockStorageState);
  assert.ok(sessionRef);

  // 2. Verify file on disk is encrypted (raw cookie value must NOT be present in plaintext)
  const sessionFilePath = manager.getSessionFilePath(userId, portalId);
  assert.equal(fs.existsSync(sessionFilePath), true);
  const rawDiskContent = fs.readFileSync(sessionFilePath, "utf8");
  assert.equal(rawDiskContent.includes("secret_cookie_token_987"), false, "Plaintext cookie must NOT exist in persisted file");
  assert.equal(rawDiskContent.includes("jwt_token_secret_xyz"), false, "Plaintext JWT must NOT exist in persisted file");

  // 3. Load session and verify decrypted content matches original
  const loadedState = await manager.loadSessionState(userId, portalId);
  assert.ok(loadedState);
  assert.deepEqual(loadedState, mockStorageState);

  // 4. Session exists check
  const hasSession = await manager.hasValidSession(userId, portalId);
  assert.equal(hasSession, true);

  // 5. Cleanup
  await manager.clearSession(userId, portalId);
  assert.equal(await manager.hasValidSession(userId, portalId), false);
  assert.equal(await manager.loadSessionState(userId, portalId), null);

  manager.cleanupTestDir();
});

test("SessionManager - Cross-user session isolation", async () => {
  const manager = new SessionManager({ testDir: path.join(process.cwd(), "tmp_test_sessions") });
  const user1 = "user-111";
  const user2 = "user-222";
  const portalId = "internshala";

  const user1State = { cookies: [{ name: "auth", value: "user_1_secret", domain: ".internshala.com" }] };
  const user2State = { cookies: [{ name: "auth", value: "user_2_secret", domain: ".internshala.com" }] };

  await manager.saveSessionState(user1, portalId, user1State);
  await manager.saveSessionState(user2, portalId, user2State);

  // User 1 cannot access User 2's session
  const loadedUser1 = await manager.loadSessionState(user1, portalId);
  const loadedUser2 = await manager.loadSessionState(user2, portalId);

  assert.equal(loadedUser1.cookies[0].value, "user_1_secret");
  assert.equal(loadedUser2.cookies[0].value, "user_2_secret");

  // User 3 has no session
  const loadedUser3 = await manager.loadSessionState("user-333", portalId);
  assert.equal(loadedUser3, null);

  manager.cleanupTestDir();
});
