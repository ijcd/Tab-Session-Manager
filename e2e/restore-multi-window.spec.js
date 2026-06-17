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

  const allUrls = new Set();
  // We expect at least 2 loaded tabs per window — pick the lower count window
  // since waitForTabsLoaded asserts a minimum and we just want to catch them
  // all once they're in.
  for (const wid of newWindowIds) {
    const tabs = await waitForTabsLoaded(extensionPage, wid, 2);
    for (const t of tabs) allUrls.add(t.url);
  }

  expect([...allUrls].sort()).toEqual([
    "https://example.com/w1a",
    "https://example.com/w1b",
    "https://example.com/w2a",
    "https://example.com/w2b",
    "https://example.com/w2c"
  ]);
});
