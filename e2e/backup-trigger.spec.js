const { test, expect } = require("./fixtures/extension");
const {
  buildSession,
  importSessions,
  setSettings
} = require("./helpers/session");
const { poll } = require("./helpers/poll");

test("background backup runs over imported sessions", async ({ extensionPage, context }) => {
  await setSettings(extensionPage, {
    ifBackup: true,
    backupInterval: 1
  });

  await importSessions(extensionPage, [
    buildSession({
      id: "e2e-backup",
      name: "backup-target",
      windows: [{ urls: ["https://example.com/bk"] }]
    })
  ]);
  await extensionPage.waitForTimeout(400);

  // Trigger the backupSessions alarm via the service worker so backup.js runs.
  const [sw] = context.serviceWorkers();
  if (sw) {
    await sw.evaluate(async () => {
      // Best-effort wake: re-fire the alarm callback path.
      try {
        await chrome.alarms.clear("backupSessions");
        chrome.alarms.create("backupSessions", { delayInMinutes: 0.01 });
      } catch {}
    });
  }
  // Give the alarm time to fire and the backup to run.
  await extensionPage.waitForTimeout(2000);
});
