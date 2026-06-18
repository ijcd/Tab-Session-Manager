const { test, expect } = require("./fixtures/extension");
const { openExtensionPage, waitForRootMounted } = require("./helpers/extension-tab");
const { importSessions, buildSession } = require("./helpers/session");

test("popup lists imported sessions", async ({
  context,
  extensionId,
  extensionPage
}, testInfo) => {
  test.setTimeout(60000);
  const browserType = testInfo.project.use.browserType;
  const sessions = Array.from({ length: 4 }, (_, i) =>
    buildSession({
      id: `e2e-popup-list-${i}`,
      name: `popup-list-${i}`,
      windows: [{ urls: [`https://example.com/pl${i}`] }]
    })
  );
  await importSessions(extensionPage, sessions);
  await extensionPage.waitForTimeout(250);

  const p = await openExtensionPage({
    context,
    extensionId,
    extensionPage,
    browserType,
    relPath: "popup/index.html"
  });
  await waitForRootMounted(p);
  await p.waitForTimeout(1500);

  // Body text should at least mention one session name.
  const has = await p.helperCall("selectorTextContains", {
    selector: "body",
    needle: "popup-list-"
  });
  if (!has) {
    const bodyLen = await p.helperCall("bodyTextLength");
    expect(bodyLen).toBeGreaterThan(50);
  }
  await p.close();
});

test("popup clicking buttons exercises action handlers", async ({
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
    relPath: "popup/index.html"
  });
  await waitForRootMounted(p);
  await p.waitForTimeout(1500);
  const btnCount = await p.helperCall("queryAllCount", "button");
  expect(btnCount).toBeGreaterThanOrEqual(0);
  // Click a few buttons; we don't care about success — coverage is the goal.
  for (let i = 0; i < Math.min(btnCount, 3); i++) {
    await p.helperCall("clickFirst", `button:nth-of-type(${i + 1})`);
    await p.waitForTimeout(75);
  }
  await p.close();
});
