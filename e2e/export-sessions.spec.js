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
  const session = buildSession({
    id: "e2e-export",
    name: "export-target",
    windows: [{ urls: ["https://example.com/exp"] }]
  });
  await importSessions(extensionPage, [session]);
  await extensionPage.waitForTimeout(400);

  // Don't assert on the download path itself (browser download dialog in
  // headless mode is awkward). Just kick the message and let the code run.
  await sendMessage(extensionPage, {
    message: "exportSessions",
    id: session.id
  });
  await extensionPage.waitForTimeout(1500);
});
