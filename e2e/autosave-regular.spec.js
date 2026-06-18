const { test, expect } = require("./fixtures/extension");
const {
  setSettings,
  getAllSessions,
  fireAlarm
} = require("./helpers/session");
const { poll } = require("./helpers/poll");

test("autoSaveRegular fires and lands a 'regular'-tagged session", async ({
  extensionPage,
  context
}) => {
  test.setTimeout(60000);
  await setSettings(extensionPage, {
    ifAutoSave: true,
    // 0.05 minutes = 3 seconds. Alarm is then re-fired manually via
    // fireAlarm to avoid waiting on Chrome's alarm scheduler.
    autoSaveInterval: 0.05,
    autoSaveLimit: 10,
    ifLazyLoading: false
  });

  await extensionPage.evaluate(async () => {
    await browser.tabs.create({ url: "https://example.com/ar1", active: false });
    await browser.tabs.create({ url: "https://example.com/ar2", active: false });
  });
  await extensionPage.waitForTimeout(400);

  await fireAlarm(context, "autoSaveRegular");

  const regular = await poll(15000, 500, async () => {
    const all = await getAllSessions(extensionPage);
    return all.find(s => Array.isArray(s.tag) && s.tag.includes("regular"));
  });
  expect(regular).toBeTruthy();
  expect(regular.tabsNumber).toBeGreaterThan(0);
});
