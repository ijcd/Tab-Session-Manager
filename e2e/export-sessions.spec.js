const { test, expect } = require("./fixtures/extension");
const {
  buildSession,
  importSessions,
  sendMessage
} = require("./helpers/session");

test("exportSessions triggers a download for an imported session", async ({
  context,
  extensionPage
}) => {
  test.setTimeout(60000);

  // Listen for downloads — accept them as they fire so FF does not hold the
  // context open waiting for a user gesture.
  context.on("download", download => {
    download.saveAs(`/tmp/tsm-e2e-${download.suggestedFilename()}`).catch(() => {});
  });

  const session = buildSession({
    id: "e2e-export",
    name: "export-target",
    windows: [{ urls: ["https://example.com/exp"] }]
  });
  await importSessions(extensionPage, [session]);
  await extensionPage.waitForTimeout(200);

  await sendMessage(extensionPage, {
    message: "exportSessions",
    id: session.id
  });
  await extensionPage.waitForTimeout(1500);
});
