const { test, expect } = require("./fixtures/extension");
const {
  buildSession,
  importSessions,
  sendMessage
} = require("./helpers/session");

test("startTracking + endTrackingByWindowDelete exercise the tracking flow", async ({
  extensionPage
}) => {
  const session = buildSession({
    id: "e2e-tracking",
    name: "tracking",
    windows: [{ urls: ["https://example.com/track"] }]
  });
  await importSessions(extensionPage, [session]);
  await extensionPage.waitForTimeout(150);

  // Pick arbitrary window IDs — startTracking just stores them.
  await sendMessage(extensionPage, {
    message: "startTracking",
    sessionId: session.id,
    originalWindowId: 1,
    openedWindowId: 2
  });
  await extensionPage.waitForTimeout(100);

  await sendMessage(extensionPage, {
    message: "endTrackingByWindowDelete",
    sessionId: session.id,
    originalWindowId: 1
  });
});
