const { test, expect } = require("./fixtures/extension");
const { buildSession, openSession, setSettings } = require("./helpers/session");
const { getAllWindowIds, waitForNewWindow, waitForTabsLoaded } = require("./helpers/windows");

test("restore preserves pinned and active tab flags", async ({ extensionPage }) => {
  await setSettings(extensionPage, { ifLazyLoading: false });

  const session = buildSession({
    id: "e2e-tab-props",
    name: "tab-props",
    windows: [
      {
        urls: ["https://example.com/pinned", "https://example.com/active"],
        tabOverrides: {
          0: { pinned: true, active: false },
          1: { pinned: false, active: true }
        }
      }
    ]
  });

  const baseline = (await getAllWindowIds(extensionPage)).sort();
  await openSession(extensionPage, session);
  const newWindowId = await waitForNewWindow(extensionPage, baseline, 2);
  const tabs = await waitForTabsLoaded(extensionPage, newWindowId, 2);

  const byUrl = Object.fromEntries(tabs.map(t => [t.url, t]));
  expect(byUrl["https://example.com/pinned"].pinned).toBe(true);
  expect(byUrl["https://example.com/active"].active).toBe(true);
});
