const { test, expect } = require("./fixtures/extension");
const {
  saveCurrentSession,
  openSession,
  getAllSessions,
  setSettings, waitForSessionByName } = require("./helpers/session");
const {
  getAllWindowIds,
  waitForNewWindow,
  waitForTabsLoaded
} = require("./helpers/windows");

test("save then restore preserves the tab URL set", async ({ extensionPage }) => {
  await setSettings(extensionPage, { ifLazyLoading: false });

  const liveUrls = [
    "https://example.com/rt-a",
    "https://example.com/rt-b",
    "https://example.com/rt-c"
  ];

  await extensionPage.evaluate(async urls => {
    for (const url of urls) {
      await browser.tabs.create({ url, active: false });
    }
  }, liveUrls);
  await extensionPage.waitForTimeout(1500);

  await saveCurrentSession(extensionPage, "rt-session");
  const saved = await waitForSessionByName(extensionPage, "rt-session");
  expect(saved).toBeTruthy();

  const baseline = (await getAllWindowIds(extensionPage)).sort();
  await openSession(extensionPage, saved, "openInNewWindow");
  const newWindowId = await waitForNewWindow(extensionPage, baseline, liveUrls.length);
  const tabs = await waitForTabsLoaded(extensionPage, newWindowId, liveUrls.length);

  const restoredUrls = tabs.map(t => t.url).filter(u => liveUrls.includes(u));
  for (const url of liveUrls) {
    expect(restoredUrls).toContain(url);
  }
});
