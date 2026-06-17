const { test, expect } = require("./fixtures/extension");
const { openExtensionPage } = require("./helpers/extension-tab");
const { poll } = require("./helpers/poll");

async function waitForMounted(p) {
  await poll(15000, 200, async () => ((await p.helperCall("rootMounted")) ? true : undefined));
}

test("options page sidebar navigation cycles through routes", async ({
  context,
  extensionId,
  extensionPage
}, testInfo) => {
  const browserType = testInfo.project.use.browserType;
  const p = await openExtensionPage({
    context,
    extensionId,
    extensionPage,
    browserType,
    relPath: "options/index.html"
  });
  await waitForMounted(p);

  for (const hash of ["#/sessions", "#/settings", "#/shortcuts", "#/information"]) {
    await p.helperCall("setHash", [hash]);
    await p.waitForTimeout(400);
    const current = await p.helperCall("getHash");
    expect(current).toMatch(new RegExp(hash.replace(/\//g, "/?")));
    const bodyLen = await p.helperCall("bodyTextLength");
    expect(bodyLen).toBeGreaterThan(0);
  }

  await p.close();
});

test("options page settings checkboxes are clickable", async ({
  context,
  extensionId,
  extensionPage
}, testInfo) => {
  const browserType = testInfo.project.use.browserType;
  const p = await openExtensionPage({
    context,
    extensionId,
    extensionPage,
    browserType,
    relPath: "options/index.html#/settings"
  });
  await waitForMounted(p);
  await p.waitForTimeout(1000);

  // Count checkboxes; click the first few. We don't care which settings —
  // we just want to drive change handlers so coverage hits the storage
  // write + handleSettingsChange paths.
  const count = await p.helperCall("queryAllCount", ['input[type="checkbox"]']);
  expect(count).toBeGreaterThan(0);

  // The first checkbox is usually the "save tab groups" or similar; clicks
  // exercise SettingsPage's onChange handler.
  for (let i = 0; i < Math.min(count, 3); i++) {
    await p.helperCall("clickFirst", [`input[type="checkbox"]:nth-of-type(${i + 1})`]);
    await p.waitForTimeout(200);
  }

  await p.close();
});
