const { test, expect } = require("./fixtures/extension");
const { sendMessage } = require("./helpers/session");

// Verify the bridge reaches TSM message handlers, storage, and chrome.*
// APIs end-to-end. The chrome.* assertions exist mainly for FF where the
// bridge has more moving parts; on Chrome they are near-trivial.

test("bridge: getInitState reaches TSM and returns a boolean", async ({ extensionPage }) => {
  const result = await sendMessage(extensionPage, { message: "getInitState" });
  expect(typeof result).toBe("boolean");
});

test("bridge: storage.local round-trip", async ({ extensionPage }) => {
  await extensionPage.evaluate(async () => {
    await browser.storage.local.set({ __smoke_key: 42 });
  });
  const value = await extensionPage.evaluate(async () => {
    return (await browser.storage.local.get("__smoke_key")).__smoke_key;
  });
  expect(value).toBe(42);
});

test("bridge: tabs.create returns a numeric tab id", async ({ extensionPage }) => {
  const created = await extensionPage.evaluate(async () => {
    return await browser.tabs.create({ url: "https://example.com/__smoke__" });
  });
  expect(typeof created.id).toBe("number");
});
