const { test, expect } = require("./fixtures/extension");

const GROUP_TITLE = "TEST_E2E";
const GROUP_COLOR = "blue";
const TAB_URLS = [
  "https://example.com/a",
  "https://example.com/b",
  "https://example.com/c"
];

function buildSyntheticSession() {
  const sessionId = "e2e-restore-group-title";
  const windowId = 1;
  const groupId = 9999;
  const tabs = {};
  TAB_URLS.forEach((url, i) => {
    const tabId = 100 + i;
    tabs[tabId] = {
      id: tabId,
      windowId,
      index: i,
      url,
      title: url,
      active: i === 0,
      pinned: false,
      incognito: false,
      groupId,
      cookieStoreId: "firefox-default"
    };
  });
  return {
    id: sessionId,
    name: "e2e restore-group-title",
    date: Date.now(),
    lastEditedTime: Date.now(),
    tag: [],
    sessionStartTime: Date.now(),
    windows: { [windowId]: tabs },
    windowsNumber: 1,
    windowsInfo: {
      [windowId]: { id: windowId, type: "normal", state: "normal", incognito: false }
    },
    tabsNumber: TAB_URLS.length,
    tabGroups: [
      {
        id: groupId,
        title: GROUP_TITLE,
        color: GROUP_COLOR,
        windowId,
        collapsed: false
      }
    ]
  };
}

test("restoring a session preserves tab group title and color", async ({
  context,
  extensionPage
}) => {
  // Wake the background and force init() so its in-memory settings cache is
  // populated and the storage.onChanged listener is wired up. Without this,
  // a suspended MV3 service worker may miss the Settings update we are about
  // to write.
  await extensionPage.evaluate(async () => {
    await browser.runtime.sendMessage({ message: "getInitState" });
  });

  // TSM stores settings under a single top-level "Settings" key — merge so
  // we keep the defaults init wrote on first install (see settings.js).
  await extensionPage.evaluate(async () => {
    const existing = (await browser.storage.local.get("Settings")).Settings || {};
    await browser.storage.local.set({
      Settings: { ...existing, saveTabGroupsV2: true }
    });
  });
  // Give the background's storage.onChanged listener time to refresh the
  // in-memory settings cache before we trigger restore.
  await extensionPage.waitForTimeout(500);

  const session = buildSyntheticSession();
  const baselineWindowIds = (await getAllWindowIds(extensionPage)).sort();

  const beforeOpen = await extensionPage.evaluate(async () => {
    return (await browser.storage.local.get("Settings")).Settings || {};
  });
  expect(
    beforeOpen.saveTabGroupsV2,
    "Settings.saveTabGroupsV2 must be true in storage before trigger"
  ).toBe(true);

  await extensionPage.evaluate(async syntheticSession => {
    await browser.runtime.sendMessage({
      message: "open",
      session: syntheticSession,
      property: "openInNewWindow"
    });
  }, session);

  const newWindowId = await waitForNewWindow(extensionPage, baselineWindowIds, TAB_URLS.length);
  const groups = await waitForGroupsInWindow(extensionPage, newWindowId);

  expect(groups).toHaveLength(1);
  expect(groups[0].title).toBe(GROUP_TITLE);
  expect(groups[0].color).toBe(GROUP_COLOR);
});

async function getAllWindowIds(page) {
  return page.evaluate(async () => {
    const wins = await browser.windows.getAll({ populate: false });
    return wins.map(w => w.id);
  });
}

async function waitForNewWindow(page, baselineSorted, expectedTabCount) {
  return poll(15000, 200, async () => {
    const wins = await page.evaluate(
      async ({ baseline, expected }) => {
        const all = await browser.windows.getAll({ populate: true });
        return all
          .filter(w => !baseline.includes(w.id) && w.type === "normal")
          .map(w => ({
            id: w.id,
            tabCount: w.tabs.filter(t => !t.url.startsWith("about:blank")).length
          }));
      },
      { baseline: baselineSorted, expected: expectedTabCount }
    );
    const ready = wins.find(w => w.tabCount >= expectedTabCount);
    return ready ? ready.id : undefined;
  });
}

async function waitForGroupsInWindow(page, windowId) {
  // Wait until at least one group is *fully populated* (title set). The
  // restore creates the group first and updates title+color separately, so a
  // group can briefly exist with an empty title.
  return poll(10000, 200, async () => {
    const groups = await page.evaluate(async winId => {
      if (!browser.tabGroups) return [];
      return browser.tabGroups.query({ windowId: winId });
    }, windowId);
    if (groups.length === 0) return undefined;
    if (groups.some(g => g.title && g.title.length > 0)) return groups;
    return undefined;
  });
}

async function poll(timeoutMs, intervalMs, fn) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const value = await fn();
      if (value !== undefined && value !== null) return value;
    } catch (e) {
      lastError = e;
    }
    await new Promise(r => setTimeout(r, intervalMs));
  }
  throw new Error(`poll timed out after ${timeoutMs}ms${lastError ? `: ${lastError.message}` : ""}`);
}
