let _idCounter = 1000;
function nextId() {
  return ++_idCounter;
}

// Build a synthetic TSM session matching the shape produced by save.js.
// windows: [{ urls: [...], groups?: [{ tabIndices: [...], title, color }] }, ...]
function buildSession({ id = "e2e-session", name = "e2e session", windows = [] } = {}) {
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
        cookieStoreId: "firefox-default"
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

// Wake the background SW and ensure init() runs, then merge a Settings patch
// into storage. TSM keeps all settings under one "Settings" key.
async function setSettings(page, patch) {
  // Wake the SW and ensure init() has run before we read/write Settings.
  // TSM's init() populates defaults into the Settings storage key on
  // first run; without waiting for it, our patch can be overwritten by
  // the defaults that init writes afterwards.
  await page.evaluate(async () => {
    await browser.runtime.sendMessage({ message: "getInitState" });
  });
  // Poll until the SW has populated defaults for the keys we are about
  // to patch — confirms init() finished. Larger timeout under coverage
  // because the instrumented bundle takes longer to boot.
  const { poll } = require("./poll");
  const initTimeout = process.env.COVERAGE === "1" ? 30000 : 8000;
  await poll(initTimeout, 200, async () => {
    const present = await page.evaluate(async () => {
      return (await browser.storage.local.get("Settings")).Settings ? true : false;
    });
    return present ? true : undefined;
  });
  await page.evaluate(async newSettings => {
    const existing = (await browser.storage.local.get("Settings")).Settings || {};
    await browser.storage.local.set({ Settings: { ...existing, ...newSettings } });
  }, patch);
  // Verify the storage write took effect AND wait for storage.onChanged
  // → handleSettingsChange to refresh the in-memory currentSettings.
  const verifyTimeout = process.env.COVERAGE === "1" ? 15000 : 8000;
  await poll(verifyTimeout, 100, async () => {
    const ok = await page.evaluate(async expected => {
      const s = (await browser.storage.local.get("Settings")).Settings || {};
      return Object.entries(expected).every(([k, v]) => s[k] === v);
    }, patch);
    return ok ? true : undefined;
  });
  await page.waitForTimeout(300);
}

async function sendMessage(page, message) {
  return page.evaluate(async msg => {
    return await browser.runtime.sendMessage(msg);
  }, message);
}

async function getAllSessions(page) {
  return sendMessage(page, { message: "getSessions" });
}

async function getSession(page, id) {
  return sendMessage(page, { message: "getSessions", id });
}

async function deleteAllSessions(page) {
  return sendMessage(page, { message: "deleteAllSessions" });
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

async function getSearchInfo(page) {
  return sendMessage(page, { message: "getsearchInfo" });
}

module.exports = {
  buildSession,
  setSettings,
  sendMessage,
  getAllSessions,
  getSession,
  deleteAllSessions,
  openSession,
  saveCurrentSession,
  importSessions,
  addTag,
  removeTag,
  renameSession,
  removeSession,
  getSearchInfo
};
