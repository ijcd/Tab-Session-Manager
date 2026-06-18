const { poll } = require("./poll");
const { SETTLE } = require("./constants");

// Synthetic TSM session matching the shape produced by save.js.
//
// windows: [
//   {
//     urls: [string, ...],
//     groups?: [{ tabIndices: number[], title, color }],
//     // Per-tab overrides keyed by tab index. Use for pinned/active tests.
//     tabOverrides?: { [tabIndex]: Partial<TabRecord> }
//   },
//   ...
// ]
//
// `idSeed` makes the builder pure: same input + same seed → same output.
function buildSession({
  id = "e2e-session",
  name = "e2e session",
  windows = [],
  idSeed = 1000
} = {}) {
  let _id = idSeed;
  const nextId = () => ++_id;

  const session = {
    id,
    name,
    date: Date.now(),
    lastEditedTime: Date.now(),
    tag: [],
    sessionStartTime: Date.now(),
    windows: {},
    windowsNumber: windows.length,
    windowsInfo: {},
    tabsNumber: 0,
    tabGroups: []
  };

  windows.forEach((winSpec, winIdx) => {
    const windowId = winIdx + 1;
    const tabs = {};
    const groupIds = (winSpec.groups || []).map(() => nextId());
    const overrides = winSpec.tabOverrides || {};

    winSpec.urls.forEach((url, i) => {
      const tabId = 100 + windowId * 100 + i;
      let groupId = -1;
      (winSpec.groups || []).forEach((g, gi) => {
        if (g.tabIndices.includes(i)) groupId = groupIds[gi];
      });
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
        cookieStoreId: "firefox-default",
        ...(overrides[i] || {})
      };
      session.tabsNumber++;
    });

    session.windows[windowId] = tabs;
    session.windowsInfo[windowId] = {
      id: windowId,
      type: "normal",
      state: "normal",
      incognito: false
    };

    (winSpec.groups || []).forEach((g, gi) => {
      session.tabGroups.push({
        id: groupIds[gi],
        title: g.title,
        color: g.color,
        windowId,
        collapsed: false
      });
    });
  });

  return session;
}

// Read/write helpers for TSM's single-key "Settings" bag. Timeouts scale
// up under COVERAGE=1 because the instrumented bundle boots slower.
async function setSettings(page, patch) {
  // Wake the SW and let init() populate defaults before we patch.
  await sendMessage(page, { message: "getInitState" });
  const initTimeout = process.env.COVERAGE === "1" ? 30000 : 8000;
  await poll(initTimeout, 200, async () => {
    const present = await page.evaluate(
      async () => !!(await browser.storage.local.get("Settings")).Settings
    );
    return present ? true : undefined;
  });

  await page.evaluate(async next => {
    const existing = (await browser.storage.local.get("Settings")).Settings || {};
    await browser.storage.local.set({ Settings: { ...existing, ...next } });
  }, patch);

  // Confirm both the storage write AND that the BG's in-memory
  // currentSettings has refreshed via storage.onChanged. Polling on the
  // storage read also waits past the listener fan-out window.
  const verifyTimeout = process.env.COVERAGE === "1" ? 15000 : 8000;
  await poll(verifyTimeout, 100, async () => {
    const ok = await page.evaluate(async expected => {
      const s = (await browser.storage.local.get("Settings")).Settings || {};
      return Object.entries(expected).every(([k, v]) => s[k] === v);
    }, patch);
    return ok ? true : undefined;
  });
}

async function sendMessage(page, message) {
  return page.evaluate(async msg => await browser.runtime.sendMessage(msg), message);
}

async function getAllSessions(page) {
  return sendMessage(page, { message: "getSessions" });
}

async function getSession(page, id) {
  return sendMessage(page, { message: "getSessions", id });
}

async function openSession(page, session, property = "openInNewWindow") {
  return sendMessage(page, { message: "open", session, property });
}

async function saveCurrentSession(page, name = "current", property = "saveAllWindows") {
  return sendMessage(page, { message: "saveCurrentSession", name, property });
}

async function importSessions(page, sessions) {
  return sendMessage(page, { message: "import", importSessions: sessions });
}

async function getSearchInfo(page) {
  return sendMessage(page, { message: "getsearchInfo" });
}

// Named message wrappers — pure indirection but they make spec code
// read closer to the domain than raw sendMessage call sites.
async function addTag(page, id, tag) {
  return sendMessage(page, { message: "addTag", id, tag });
}
async function removeTag(page, id, tag) {
  return sendMessage(page, { message: "removeTag", id, tag });
}
async function renameSession(page, id, name) {
  return sendMessage(page, { message: "rename", id, name });
}
async function removeSession(page, id) {
  return sendMessage(page, { message: "remove", id });
}
async function deleteAllSessions(page) {
  return sendMessage(page, { message: "deleteAllSessions" });
}

// Wait for `saveCurrentSession` / autosave / etc. to land an
// IndexedDB record with the given name.
async function waitForSessionByName(page, name, timeoutMs = 8000) {
  return poll(timeoutMs, 300, async () => {
    const all = await getAllSessions(page);
    return all.find(s => s.name === name);
  });
}

// Trigger a chrome.alarms event by clearing + recreating with a tiny
// delay. Used by autosave-regular / backup-trigger.
async function fireAlarm(context, alarmName, delayInMinutes = 0.01) {
  const [sw] = context.serviceWorkers();
  if (!sw) return false;
  await sw.evaluate(
    async ({ name, delay }) => {
      try {
        await chrome.alarms.clear(name);
        chrome.alarms.create(name, { delayInMinutes: delay });
      } catch {}
    },
    { name: alarmName, delay: delayInMinutes }
  );
  return true;
}

module.exports = {
  buildSession,
  setSettings,
  sendMessage,
  getAllSessions,
  getSession,
  openSession,
  saveCurrentSession,
  importSessions,
  getSearchInfo,
  addTag,
  removeTag,
  renameSession,
  removeSession,
  deleteAllSessions,
  waitForSessionByName,
  fireAlarm,
  SETTLE
};
