const { test, expect } = require("./fixtures/extension");
const { openExtensionPage } = require("./helpers/extension-tab");
const { poll } = require("./helpers/poll");

test("probe what options#/settings actually renders", async ({
  context,
  extensionId,
  extensionPage
}, testInfo) => {
  test.setTimeout(45000);
  const browserType = testInfo.project.use.browserType;
  const p = await openExtensionPage({
    context,
    extensionId,
    extensionPage,
    browserType,
    relPath: "options/index.html#/settings"
  });
  await poll(20000, 200, async () => ((await p.helperCall("rootMounted")) ? true : undefined));

  // Wait a while for async init() to complete and React to re-render.
  for (let attempt = 0; attempt < 10; attempt++) {
    await p.waitForTimeout(1000);
    const li = await p.helperCall("queryAllCount", ["li"]);
    const inputs = await p.helperCall("queryAllCount", ["input"]);
    const bodyLen = await p.helperCall("bodyTextLength");
    console.log(`[probe] attempt=${attempt} li=${li} inputs=${inputs} bodyLen=${bodyLen}`);
    if (inputs > 0) break;
  }
  await p.close();
});
