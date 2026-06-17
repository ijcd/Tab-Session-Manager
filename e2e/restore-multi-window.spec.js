const { test, expect } = require("./fixtures/extension");
const { buildSession, openSession, setSettings } = require("./helpers/session");
const { getAllWindowIds, waitForNNewWindows, waitForTabsLoaded } = require("./helpers/windows");

test("restoring a multi-window session opens both windows with their tabs", async ({ extensionPage }) => {
  await setSettings(extensionPage, { ifLazyLoading: false });

  const session = buildSession({
    id: "e2e-restore-multi-window",
    name: "multi-window restore",
    windows: [
      { urls: ["https://example.com/w1a", "https://example.com/w1b"] },
      { urls: ["https://example.com/w2a", "https://example.com/w2b", "https://example.com/w2c"] }
    ]
  });

  const baseline = (await getAllWindowIds(extensionPage)).sort();
  await openSession(extensionPage, session);
  const newWindowIds = await waitForNNewWindows(extensionPage, baseline, 2);

  // Poll until every expected URL has loaded across the new windows. FF
  // restores tabs slower than Chrome and the 2-per-window minimum misses
  // the third tab in window 2.
  const { poll } = require("./helpers/poll");
  const allUrls = await poll(20000, 250, async () => {
    const urls = new Set();
    for (const wid of newWindowIds) {
      const tabs = await waitForTabsLoaded(extensionPage, wid, 2);
      for (const t of tabs) urls.add(t.url);
    }
    return urls.size >= 5 ? urls : undefined;
  });

  expect([...allUrls].sort()).toEqual([
    "https://example.com/w1a",
    "https://example.com/w1b",
    "https://example.com/w2a",
    "https://example.com/w2b",
    "https://example.com/w2c"
  ]);
});
