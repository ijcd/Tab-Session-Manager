const { test, expect } = require("./fixtures/extension");
const { sendMessage } = require("./helpers/session");

// We don't have real Google credentials in CI. These calls exercise the
// background cloudSync/cloudAuth code paths and confirm graceful failure
// rather than testing successful sync.

test("getSyncStatus returns a status object", async ({ extensionPage }) => {
  const status = await sendMessage(extensionPage, { message: "getSyncStatus" });
  expect(status).toBeTruthy();
  expect(typeof status).toBe("object");
});

test("syncCloud completes without throwing when not signed in", async ({ extensionPage }) => {
  // sendMessage returns null when the BG handler returns nothing — that's
  // fine. The point is to exercise cloudSync without crashing the SW.
  await sendMessage(extensionPage, { message: "syncCloud" });
});

test("signOutGoogle is idempotent when not signed in", async ({ extensionPage }) => {
  await sendMessage(extensionPage, { message: "signOutGoogle" });
  // Followed by another call should also succeed (idempotency check).
  await sendMessage(extensionPage, { message: "signOutGoogle" });
});

test("applyDeviceName updates session tags without throwing", async ({ extensionPage }) => {
  await sendMessage(extensionPage, { message: "applyDeviceName" });
});
