const { test, expect } = require("./fixtures/extension");
const { buildSession, openSession, setSettings } = require("./helpers/session");
const { getAllWindowIds, waitForNewWindow, waitForTabsLoaded } = require("./helpers/windows");

test("restoring a session opens the right tabs in a new window", async ({ extensionPage }) => {
  await setSettings(extensionPage, { ifLazyLoading: false });

  const urls = [
    "https://example.com/one",
    "https://example.com/two",
    "https://example.com/three"
  ];
  const session = buildSession({
    id: "e2e-restore-basic",
    name: "basic restore",
    windows: [{ urls }]
  });

  const baseline = (await getAllWindowIds(extensionPage)).sort();
  await openSession(extensionPage, session);
  const newWindowId = await waitForNewWindow(extensionPage, baseline, urls.length);

  const tabs = await waitForTabsLoaded(extensionPage, newWindowId, urls.length);
  const restoredUrls = tabs.map(t => t.url);

  expect(restoredUrls.sort()).toEqual(urls.sort());
});
