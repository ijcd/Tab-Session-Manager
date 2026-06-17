const { test, expect } = require("./fixtures/extension");
const {
  saveCurrentSession,
  getAllSessions
} = require("./helpers/session");
const { poll } = require("./helpers/poll");

test("saveCurrentSession persists the live tabs into a session record", async ({
  context,
  extensionPage
}) => {
  // Open three tabs in the live window so there's something to capture.
  await extensionPage.evaluate(async urls => {
    for (const url of urls) {
      await browser.tabs.create({ url });
    }
  }, ["https://example.com/sc1", "https://example.com/sc2", "https://example.com/sc3"]);

  // Wait for tabs to land.
  await extensionPage.waitForTimeout(800);

  await saveCurrentSession(extensionPage, "captured-session");

  // sessions.put is async; poll until the new session shows up.
  const saved = await poll(8000, 300, async () => {
    const all = await getAllSessions(extensionPage);
    return all.find(s => s.name === "captured-session");
  });

  expect(saved).toBeTruthy();
  expect(saved.tabsNumber).toBeGreaterThanOrEqual(3);
  expect(Object.keys(saved.windows).length).toBeGreaterThanOrEqual(1);
});
