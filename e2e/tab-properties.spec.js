const { test, expect } = require("./fixtures/extension");
const { buildSession, openSession, setSettings } = require("./helpers/session");
const { getAllWindowIds, waitForNewWindow, waitForTabsLoaded } = require("./helpers/windows");

test("restore preserves pinned and active tab flags", async ({ extensionPage }) => {
  await setSettings(extensionPage, { ifLazyLoading: false });

  // Build a session by hand because the helper's default flags don't include
  // pinned. Two tabs: tab 0 pinned, tab 1 active.
  const session = {
    id: "e2e-tab-props",
    name: "tab-props",
    date: Date.now(),
    lastEditedTime: Date.now(),
    tag: [],
    sessionStartTime: Date.now(),
    windows: {
      1: {
        101: {
          id: 101,
          windowId: 1,
          index: 0,
          url: "https://example.com/pinned",
          title: "pinned",
          active: false,
          pinned: true,
          incognito: false,
          groupId: -1,
          cookieStoreId: "firefox-default"
        },
        102: {
          id: 102,
          windowId: 1,
          index: 1,
          url: "https://example.com/active",
          title: "active",
          active: true,
          pinned: false,
          incognito: false,
          groupId: -1,
          cookieStoreId: "firefox-default"
        }
      }
    },
    windowsNumber: 1,
    windowsInfo: {
      1: { id: 1, type: "normal", state: "normal", incognito: false }
    },
    tabsNumber: 2,
    tabGroups: []
  };

  const baseline = (await getAllWindowIds(extensionPage)).sort();
  await openSession(extensionPage, session);
  const newWindowId = await waitForNewWindow(extensionPage, baseline, 2);
  const tabs = await waitForTabsLoaded(extensionPage, newWindowId, 2);

  const byUrl = Object.fromEntries(tabs.map(t => [t.url, t]));
  expect(byUrl["https://example.com/pinned"].pinned).toBe(true);
  expect(byUrl["https://example.com/active"].active).toBe(true);
});
