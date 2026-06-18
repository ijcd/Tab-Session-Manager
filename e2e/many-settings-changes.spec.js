const { test, expect } = require("./fixtures/extension");
const { setSettings, sendMessage } = require("./helpers/session");

// Drive many setting toggles to exercise settings.js, handleSettingsChange,
// setAutoSave, alarm management. The setSettings helper itself asserts
// the storage write took effect, so passing implies every toggle was
// observed by the BG. A trailing SW-alive check confirms no async crash
// followed.

const SETTINGS_TO_TOGGLE = [
  "ifAutoSave",
  "ifAutoSaveWhenClose",
  "ifAutoSaveWhenExitBrowser",
  "ifOpenLastSessionWhenStartUp",
  "useTabTitleforAutoSave",
  "shouldSaveDeviceName",
  "ifSavePrivateWindow",
  "ifLazyLoading",
  "isUseDiscarded",
  "saveTabGroupsV2",
  "isRestoreWindowPosition",
  "ifSupportTst",
  "ifBackup",
  "compressFaviconUrl"
];

test("toggling every boolean setting keeps the SW alive", async ({ extensionPage }) => {
  test.setTimeout(120000);
  for (const key of SETTINGS_TO_TOGGLE) {
    await setSettings(extensionPage, { [key]: true });
    await setSettings(extensionPage, { [key]: false });
  }
  const init = await sendMessage(extensionPage, { message: "getInitState" });
  expect(typeof init).toBe("boolean");
});

test("writing numeric setting values lands in storage", async ({ extensionPage }) => {
  test.setTimeout(45000);
  const values = {
    autoSaveInterval: 5,
    autoSaveLimit: 20,
    autoSaveWhenCloseMinTabs: 2,
    autoSaveWhenCloseLimit: 15,
    autoSaveWhenExitBrowserLimit: 10,
    backupInterval: 60,
    minTabs: 1,
    maxTabs: 50
  };
  await setSettings(extensionPage, values);

  // setSettings already polls for write confirmation, but the explicit
  // read here makes the assertion the test guarantees: every key landed.
  const stored = await extensionPage.evaluate(
    async () => (await browser.storage.local.get("Settings")).Settings || {}
  );
  for (const [k, v] of Object.entries(values)) {
    expect(stored[k]).toBe(v);
  }
});
