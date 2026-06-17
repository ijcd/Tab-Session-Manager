const { test, expect } = require("./fixtures/extension");
const { setSettings, getAllSessions } = require("./helpers/session");
const { poll } = require("./helpers/poll");

test("closing a window with multiple tabs triggers winClose autosave", async ({
  context,
  extensionPage
}) => {
  await setSettings(extensionPage, {
    ifAutoSaveWhenClose: true,
    autoSaveWhenCloseMinTabs: 1,
    autoSaveWhenCloseLimit: 10,
    ifLazyLoading: false
  });

  // Open a new window with a few tabs so autoSaveWhenWindowClose has
  // something to capture.
  const newWindow = await extensionPage.evaluate(async () => {
    const win = await browser.windows.create({ url: "https://example.com/wc-1" });
    await browser.tabs.create({ url: "https://example.com/wc-2", windowId: win.id });
    await browser.tabs.create({ url: "https://example.com/wc-3", windowId: win.id });
    return win;
  });

  // Wait for the new window's tabs to settle so updateTemp runs and
  // populates the "temp"-tagged session that winClose autosave reads from.
  await extensionPage.waitForTimeout(3000);

  // Close the window — onRemoved listener fires autoSaveWhenWindowClose.
  await extensionPage.evaluate(async id => {
    await browser.windows.remove(id);
  }, newWindow.id);

  // Poll for the winClose-tagged session to appear.
  const winCloseSession = await poll(15000, 500, async () => {
    const all = await getAllSessions(extensionPage);
    return all.find(s => Array.isArray(s.tag) && s.tag.includes("winClose"));
  });

  expect(winCloseSession).toBeTruthy();
  expect(winCloseSession.tabsNumber).toBeGreaterThanOrEqual(2);
});
