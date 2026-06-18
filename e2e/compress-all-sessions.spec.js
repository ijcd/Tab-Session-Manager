const { test, expect } = require("./fixtures/extension");
const {
  buildSession,
  importSessions,
  sendMessage
} = require("./helpers/session");

test("compressAllSessions runs over imported sessions", async ({ extensionPage }) => {
  await importSessions(extensionPage, [
    buildSession({
      id: "e2e-compress-a",
      name: "compress-a",
      windows: [{ urls: ["https://example.com/c1"] }]
    }),
    buildSession({
      id: "e2e-compress-b",
      name: "compress-b",
      windows: [{ urls: ["https://example.com/c2"] }]
    })
  ]);
  await extensionPage.waitForTimeout(200);

  // Use a stub port string the background sendResponse helper expects.
  await sendMessage(extensionPage, {
    message: "compressAllSessions",
    port: "e2e-compress-port"
  });
  await extensionPage.waitForTimeout(400);
});
