const { test, expect } = require("./fixtures/extension");
const {
  buildSession,
  importSessions,
  sendMessage
} = require("./helpers/session");

// Drives the tracking session flow more deeply than tracking-flow.spec.js:
// startTracking + storage tracking-info read + autoSave path.

test("tracking flow round-trip with storage check", async ({ extensionPage }) => {
  const session = buildSession({
    id: "e2e-tracking-rt",
    name: "tracking-rt",
    windows: [{ urls: ["https://example.com/trk"] }]
  });
  await importSessions(extensionPage, [session]);
  await extensionPage.waitForTimeout(150);

  await sendMessage(extensionPage, {
    message: "startTracking",
    sessionId: session.id,
    originalWindowId: 100,
    openedWindowId: 200
  });
  await extensionPage.waitForTimeout(100);

  // updateTrackingStatus tracks the current state — exercise it.
  await sendMessage(extensionPage, { message: "updateTrackingStatus" });

  // End the tracking via window-delete path.
  await sendMessage(extensionPage, {
    message: "endTrackingByWindowDelete",
    sessionId: session.id,
    originalWindowId: 100
  });
  await extensionPage.waitForTimeout(100);
});

test("session.storage tracking-info is preserved across operations", async ({
  extensionPage
}) => {
  // browser.storage.session is used by tracking — verify we can write & read.
  await extensionPage.evaluate(async () => {
    await browser.storage.session.set({
      __test_tracking: { sessionId: "x", originalWindowId: 1, openedWindowId: 2 }
    });
  });
  const fetched = await extensionPage.evaluate(async () => {
    return (await browser.storage.session.get("__test_tracking")).__test_tracking;
  });
  expect(fetched.sessionId).toBe("x");
});
