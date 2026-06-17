const { test, expect } = require("./fixtures/extension");
const { importSessions, buildSession } = require("./helpers/session");
const { openExtensionPage } = require("./helpers/extension-tab");
const { poll } = require("./helpers/poll");

test("popup page renders the React app", async ({
  context,
  extensionId,
  extensionPage
}, testInfo) => {
  const browserType = testInfo.project.use.browserType;
  await importSessions(extensionPage, [
    buildSession({
      id: "e2e-popup-seed",
      name: "popup-seed",
      windows: [{ urls: ["https://example.com/p"] }]
    })
  ]);
  await extensionPage.waitForTimeout(300);

  const p = await openExtensionPage({
    context,
    extensionId,
    extensionPage,
    browserType,
    relPath: "popup/index.html"
  });
  await poll(15000, 200, async () => ((await p.helperCall("rootMounted")) ? true : undefined));
  const bodyLen = await p.helperCall("bodyTextLength");
  expect(bodyLen).toBeGreaterThan(0);
  await p.close();
});
