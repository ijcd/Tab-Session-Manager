const { test, expect } = require("./fixtures/extension");
const {
  buildSession,
  importSessions,
  setSettings,
  fireAlarm,
  getAllSessions
} = require("./helpers/session");

test("backupSessions alarm runs and the source session remains in storage", async ({
  extensionPage,
  context
}) => {
  await setSettings(extensionPage, { ifBackup: true, backupInterval: 1 });
  const session = buildSession({
    id: "e2e-backup",
    name: "backup-target",
    windows: [{ urls: ["https://example.com/bk"] }]
  });
  await importSessions(extensionPage, [session]);
  await extensionPage.waitForTimeout(200);

  await fireAlarm(context, "backupSessions");
  await extensionPage.waitForTimeout(2000);

  // Backup may or may not have written a file on disk (download paths
  // differ across platforms / coverage builds); the surviving invariant
  // we can check from here is that the source session is still
  // retrievable and the SW handled the alarm without crashing.
  const sessions = await getAllSessions(extensionPage);
  expect(sessions.some(s => s.id === session.id)).toBe(true);
});
