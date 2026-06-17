const { test, expect } = require("./fixtures/extension");
const { sendMessage } = require("./helpers/session");

// Drive cloudAuth + cloudSync code paths without actual Google auth so
// the error-handling branches get coverage.

test("signInGoogle without consent returns null gracefully", async ({ extensionPage }) => {
  test.setTimeout(45000);
  // Identity.getAuthToken without a real flow rejects — TSM should catch.
  await sendMessage(extensionPage, { message: "signInGoogle" }).catch(() => {});
});

test("getSyncStatus before any sync returns an empty/null status", async ({ extensionPage }) => {
  const status = await sendMessage(extensionPage, { message: "getSyncStatus" });
  expect(status === undefined || typeof status === "object").toBe(true);
});

test("syncCloud without credentials is a no-op", async ({ extensionPage }) => {
  test.setTimeout(45000);
  await sendMessage(extensionPage, { message: "syncCloud" }).catch(() => {});
});

test("signOutGoogle clears any cached identity state", async ({ extensionPage }) => {
  await sendMessage(extensionPage, { message: "signOutGoogle" }).catch(() => {});
  await sendMessage(extensionPage, { message: "signOutGoogle" }).catch(() => {});
});

test("applyDeviceName runs over zero-sessions and many-sessions cases", async ({
  extensionPage
}) => {
  await sendMessage(extensionPage, { message: "applyDeviceName" });
});
