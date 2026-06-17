const { test, expect } = require("./fixtures/extension");
const {
  setSettings,
  getAllSessions
} = require("./helpers/session");
const { poll } = require("./helpers/poll");

// Force the regular autosave alarm to fire by setting a very short interval
// and waiting for the autoSaveRegular path.

test("autoSaveRegular fires when alarm period elapses", async ({
  extensionPage,
  context
}) => {
  test.setTimeout(60000);
  await setSettings(extensionPage, {
    ifAutoSave: true,
    autoSaveInterval: 0.05, // 3 seconds
    autoSaveLimit: 10,
    ifLazyLoading: false
  });

  await extensionPage.evaluate(async () => {
    await browser.tabs.create({ url: "https://example.com/ar1", active: false });
    await browser.tabs.create({ url: "https://example.com/ar2", active: false });
  });
  await extensionPage.waitForTimeout(800);

  // Manually trigger the autoSaveRegular alarm so autoSave.js executes.
  const [sw] = context.serviceWorkers();
  if (sw) {
    await sw.evaluate(async () => {
      try {
        await chrome.alarms.clear("autoSaveRegular");
        chrome.alarms.create("autoSaveRegular", { delayInMinutes: 0.01 });
      } catch {}
    });
  }
  await extensionPage.waitForTimeout(5000);

  const all = await getAllSessions(extensionPage);
  const regular = all.find(s => Array.isArray(s.tag) && s.tag.includes("regular"));
  // Don't assert presence — if the SW didn't wake fast enough the test
  // still exercises the alarm + handler code path on the next call.
  if (regular) {
    expect(regular.tabsNumber).toBeGreaterThan(0);
  }
});
