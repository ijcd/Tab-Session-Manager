const { poll } = require("./poll");

async function getAllWindowIds(page) {
  return page.evaluate(async () => {
    const wins = await browser.windows.getAll({ populate: false });
    return wins.map(w => w.id);
  });
}

// Wait until a new normal window appears (vs the baseline set) with at least
// the expected number of non-blank tabs.
async function waitForNewWindow(page, baselineSorted, expectedTabCount, timeoutMs = 15000) {
  return poll(timeoutMs, 200, async () => {
    const wins = await page.evaluate(
      async ({ baseline }) => {
        const all = await browser.windows.getAll({ populate: true });
        return all
          .filter(w => !baseline.includes(w.id) && w.type === "normal")
          .map(w => ({
            id: w.id,
            tabCount: w.tabs.filter(t => !t.url.startsWith("about:blank")).length
          }));
      },
      { baseline: baselineSorted }
    );
    const ready = wins.find(w => w.tabCount >= expectedTabCount);
    return ready ? ready.id : undefined;
  });
}

async function waitForNNewWindows(page, baselineSorted, n, timeoutMs = 20000) {
  return poll(timeoutMs, 200, async () => {
    const wins = await page.evaluate(
      async ({ baseline }) => {
        const all = await browser.windows.getAll({ populate: false });
        return all
          .filter(w => !baseline.includes(w.id) && w.type === "normal")
          .map(w => w.id);
      },
      { baseline: baselineSorted }
    );
    return wins.length >= n ? wins : undefined;
  });
}

async function waitForGroupsInWindow(page, windowId, expectedCount = 1, timeoutMs = 10000) {
  return poll(timeoutMs, 200, async () => {
    const groups = await page.evaluate(async winId => {
      if (!browser.tabGroups) return [];
      return browser.tabGroups.query({ windowId: winId });
    }, windowId);
    if (groups.length < expectedCount) return undefined;
    // Wait for titles to populate — restore creates the group first and sets
    // title in a follow-up call.
    if (!groups.every(g => g.title && g.title.length > 0)) return undefined;
    return groups;
  });
}

async function getTabsInWindow(page, windowId) {
  return page.evaluate(async winId => {
    return browser.tabs.query({ windowId: winId });
  }, windowId);
}

// Tabs created via tabs.create start with an empty url and fill in as they
// load. Wait until at least `expectedCount` tabs in the window have a
// non-empty, non-blank, http-ish url set.
async function waitForTabsLoaded(page, windowId, expectedCount, timeoutMs = 15000) {
  return poll(timeoutMs, 200, async () => {
    const tabs = await page.evaluate(async winId => {
      return browser.tabs.query({ windowId: winId });
    }, windowId);
    const loaded = tabs.filter(
      t => t.url && t.url.length > 0 && !t.url.startsWith("about:")
    );
    if (loaded.length < expectedCount) return undefined;
    return loaded;
  });
}

async function closeWindow(page, windowId) {
  return page.evaluate(async winId => {
    await browser.windows.remove(winId);
  }, windowId);
}

module.exports = {
  getAllWindowIds,
  waitForNewWindow,
  waitForNNewWindows,
  waitForGroupsInWindow,
  getTabsInWindow,
  waitForTabsLoaded,
  closeWindow
};
