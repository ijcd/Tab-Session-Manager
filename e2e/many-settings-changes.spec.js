const { test, expect } = require("./fixtures/extension");
const { setSettings } = require("./helpers/session");

// Drive many setting changes to exercise settings.js, handleSettingsChange,
// setAutoSave, alarm management, etc.

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

test("toggling many settings exercises settings.js + change listeners", async ({
  extensionPage
}) => {
  test.setTimeout(60000);
  for (const key of SETTINGS_TO_TOGGLE) {
    await setSettings(extensionPage, { [key]: true });
    await setSettings(extensionPage, { [key]: false });
  }
});

test("numeric settings (intervals, limits) accept different values", async ({
  extensionPage
}) => {
  test.setTimeout(45000);
  await setSettings(extensionPage, {
    autoSaveInterval: 5,
    autoSaveLimit: 20,
    autoSaveWhenCloseMinTabs: 2,
    autoSaveWhenCloseLimit: 15,
    autoSaveWhenExitBrowserLimit: 10,
    backupInterval: 60,
    minTabs: 1,
    maxTabs: 50
  });
});
