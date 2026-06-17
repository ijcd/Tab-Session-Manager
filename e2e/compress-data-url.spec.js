const { test, expect } = require("./fixtures/extension");
const {
  saveCurrentSession,
  setSettings,
  getAllSessions
} = require("./helpers/session");
const { poll } = require("./helpers/poll");

// Drive compressFaviconUrl path which uses common/compressDataUrl.js.

test("saveCurrentSession with compressFaviconUrl exercises compressDataUrl", async ({
  extensionPage
}) => {
  test.setTimeout(60000);
  await setSettings(extensionPage, { compressFaviconUrl: true });

  // Inline data: favicon to force compress path.
  await extensionPage.evaluate(async () => {
    await browser.tabs.create({
      url: "https://example.com/cd1",
      active: false
    });
  });
  await extensionPage.waitForTimeout(1000);

  await saveCurrentSession(extensionPage, "compress-test");
  await poll(8000, 300, async () => {
    const all = await getAllSessions(extensionPage);
    return all.find(s => s.name === "compress-test");
  });
});
