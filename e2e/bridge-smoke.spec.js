const { test, expect } = require("./fixtures/extension");
const { sendMessage } = require("./helpers/session");

// Diagnostic — verify the bridge can reach TSM message handlers and get
// a real response back. Targets the simplest, fastest handler.

test("bridge: getInitState reaches TSM and returns a boolean", async ({ extensionPage }) => {
  const result = await sendMessage(extensionPage, { message: "getInitState" });
  console.log("[smoke] getInitState ->", JSON.stringify(result));
  expect(typeof result).toBe("boolean");
});

test("bridge: storage.local round-trip", async ({ extensionPage }) => {
  await extensionPage.evaluate(async () => {
    await browser.storage.local.set({ __smoke_key: 42 });
  });
  const value = await extensionPage.evaluate(async () => {
    return (await browser.storage.local.get("__smoke_key")).__smoke_key;
  });
  console.log("[smoke] storage round-trip ->", value);
  expect(value).toBe(42);
});

test("bridge: tabs.create + tabs.query", async ({ extensionPage }) => {
  const created = await extensionPage.evaluate(async () => {
    return await browser.tabs.create({ url: "https://example.com/__smoke__" });
  });
  console.log("[smoke] tabs.create ->", JSON.stringify({ id: created.id, url: created.url }));
  expect(typeof created.id).toBe("number");
});
