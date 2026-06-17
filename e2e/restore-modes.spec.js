const { test, expect } = require("./fixtures/extension");
const {
  buildSession,
  openSession,
  setSettings
} = require("./helpers/session");
const {
  getAllWindowIds,
  waitForTabsLoaded,
  waitForNewWindow
} = require("./helpers/windows");

test("addToCurrentWindow appends restored tabs to the current window", async ({ extensionPage }) => {
  await setSettings(extensionPage, { ifLazyLoading: false });

  // Open a baseline tab in the current window so we can detect the append.
  await extensionPage.evaluate(async () => {
    await browser.tabs.create({ url: "https://example.com/existing", active: false });
  });
  await extensionPage.waitForTimeout(800);

  const beforeWindowIds = (await getAllWindowIds(extensionPage)).sort();
  const beforeTabsCount = await extensionPage.evaluate(async () => {
    return (await browser.tabs.query({ currentWindow: true })).length;
  });

  const session = buildSession({
    id: "e2e-restore-append",
    name: "append",
    windows: [{ urls: ["https://example.com/append-1", "https://example.com/append-2"] }]
  });
  await openSession(extensionPage, session, "addToCurrentWindow");

  // No new window should appear; existing window grows.
  await extensionPage.waitForTimeout(2000);

  const afterWindowIds = (await getAllWindowIds(extensionPage)).sort();
  expect(afterWindowIds).toEqual(beforeWindowIds);

  const afterTabsCount = await extensionPage.evaluate(async () => {
    return (await browser.tabs.query({ currentWindow: true })).length;
  });
  expect(afterTabsCount).toBeGreaterThanOrEqual(beforeTabsCount + 2);
});

test("openInNewWindow opens a fresh window for the restored session", async ({ extensionPage }) => {
  await setSettings(extensionPage, { ifLazyLoading: false });

  const session = buildSession({
    id: "e2e-restore-new",
    name: "new window",
    windows: [{ urls: ["https://example.com/new-1", "https://example.com/new-2"] }]
  });

  const baseline = (await getAllWindowIds(extensionPage)).sort();
  await openSession(extensionPage, session, "openInNewWindow");
  const newWindowId = await waitForNewWindow(extensionPage, baseline, 2);
  const tabs = await waitForTabsLoaded(extensionPage, newWindowId, 2);
  expect(tabs.map(t => t.url).sort()).toEqual([
    "https://example.com/new-1",
    "https://example.com/new-2"
  ]);
});
