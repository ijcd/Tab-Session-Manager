const { test, expect } = require("./fixtures/extension");
const {
  saveCurrentSession,
  getAllSessions,
  setSettings, waitForSessionByName } = require("./helpers/session");

test("saveCurrentSession with saveAllWindows captures every open window", async ({
  extensionPage
}) => {
  await setSettings(extensionPage, { ifLazyLoading: false });

  // Open a second window with its own tabs alongside the current one.
  await extensionPage.evaluate(async () => {
    await browser.tabs.create({ url: "https://example.com/sm-current" });
    await browser.windows.create({ url: "https://example.com/sm-other-1" });
  });
  await extensionPage.waitForTimeout(2000);

  // A third window for good measure.
  await extensionPage.evaluate(async () => {
    await browser.windows.create({ url: "https://example.com/sm-other-2" });
  });
  await extensionPage.waitForTimeout(1500);

  await saveCurrentSession(extensionPage, "sm-session", "saveAllWindows");

  const saved = await waitForSessionByName(extensionPage, "sm-session");

  expect(saved).toBeTruthy();
  // At least the 3 windows we orchestrated.
  expect(Object.keys(saved.windows).length).toBeGreaterThanOrEqual(3);
});
