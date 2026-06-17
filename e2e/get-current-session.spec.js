const { test, expect } = require("./fixtures/extension");
const { sendMessage, setSettings } = require("./helpers/session");

test("getCurrentSession returns a session capturing live tabs", async ({
  extensionPage
}) => {
  await setSettings(extensionPage, { ifLazyLoading: false });

  await extensionPage.evaluate(async () => {
    await browser.tabs.create({ url: "https://example.com/gcs1" });
    await browser.tabs.create({ url: "https://example.com/gcs2" });
  });
  await extensionPage.waitForTimeout(1000);

  const session = await sendMessage(extensionPage, {
    message: "getCurrentSession",
    property: "saveAllWindows"
  });

  expect(session).toBeTruthy();
  expect(session.tabsNumber).toBeGreaterThanOrEqual(2);
  expect(Object.keys(session.windows).length).toBeGreaterThanOrEqual(1);
});
