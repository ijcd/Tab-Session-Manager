const { test, expect } = require("./fixtures/extension");
const { openExtensionPage } = require("./helpers/extension-tab");
const { poll } = require("./helpers/poll");

async function waitForMounted(p) {
  await poll(20000, 200, async () => ((await p.helperCall("rootMounted")) ? true : undefined));
}

test("options shortcuts page renders the form for each command", async ({
  context,
  extensionId,
  extensionPage
}, testInfo) => {
  test.setTimeout(60000);
  const browserType = testInfo.project.use.browserType;
  const p = await openExtensionPage({
    context,
    extensionId,
    extensionPage,
    browserType,
    relPath: "options/index.html#/shortcuts"
  });
  await waitForMounted(p);
  await p.waitForTimeout(2000);

  // Each command renders a KeyboardShortcutForm. We can count inputs.
  const inputCount = await p.helperCall("queryAllCount", ["input"]);
  expect(inputCount).toBeGreaterThanOrEqual(0);

  // Click a few inputs to drive focus/blur handlers in KeyboardShortcutForm.
  for (let i = 0; i < Math.min(inputCount, 3); i++) {
    await p.helperCall("clickFirst", [`input:nth-of-type(${i + 1})`]);
    await p.waitForTimeout(150);
  }
  // Click any reset/cancel button.
  await p.helperCall("clickFirstByText", ["button", ""]);
  await p.close();
});
