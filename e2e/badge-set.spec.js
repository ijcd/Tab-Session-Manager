const { test, expect } = require("./fixtures/extension");
const {
  buildSession,
  importSessions,
  saveCurrentSession,
  setSettings,
  getAllSessions, waitForSessionByName } = require("./helpers/session");

// Exercise setBadge.js which fires on session-count changes / save.

test("saving multiple sessions exercises badge updates", async ({ extensionPage }) => {
  test.setTimeout(60000);
  await setSettings(extensionPage, {
    ifShowNumberOnBadge: true,
    isShowBadge: true
  });
  await importSessions(
    extensionPage,
    [1, 2, 3].map(i =>
      buildSession({
        id: `e2e-badge-${i}`,
        name: `badge-${i}`,
        windows: [{ urls: [`https://example.com/b${i}`] }]
      })
    )
  );
  await extensionPage.waitForTimeout(800);

  // Save 2 more "current" sessions to keep triggering the save path.
  await extensionPage.evaluate(async () => {
    await browser.tabs.create({ url: "https://example.com/badge-x", active: false });
  });
  await extensionPage.waitForTimeout(500);
  await saveCurrentSession(extensionPage, "badge-current");
  await waitForSessionByName(extensionPage, "badge-current");
});
