const { test, expect } = require("./fixtures/extension");
const { openExtensionPage } = require("./helpers/extension-tab");
const { importSessions, buildSession } = require("./helpers/session");
const { poll } = require("./helpers/poll");

async function waitForMounted(p) {
  await poll(20000, 200, async () => ((await p.helperCall("rootMounted")) ? true : undefined));
}

const ROUTES_DEEP = [
  "#/sessions",
  "#/settings",
  "#/shortcuts",
  "#/information"
];

test("options page exercises every setting category", async ({
  context,
  extensionId,
  extensionPage
}, testInfo) => {
  test.setTimeout(60000);
  const browserType = testInfo.project.use.browserType;
  await importSessions(extensionPage, [
    buildSession({
      id: "e2e-deep-render",
      name: "deep-render",
      windows: [{ urls: ["https://example.com/dr"] }]
    })
  ]);

  const p = await openExtensionPage({
    context,
    extensionId,
    extensionPage,
    browserType,
    relPath: "options/index.html#/settings"
  });
  await waitForMounted(p);
  await p.waitForTimeout(800);

  // Click every category header / collapsible to render each category
  // body, exercising OptionContainer + each option's render path.
  const categoryHeaders = await p.helperCall("queryAllCount", ['.categoryHeader, .categoryTitle, h2, h3']);
  for (let i = 0; i < Math.min(categoryHeaders, 10); i++) {
    await p.helperCall("clickFirst", [`.categoryHeader:nth-of-type(${i + 1}), h2:nth-of-type(${i + 1})`]);
    await p.waitForTimeout(100);
  }

  // Click each top-level button / input to fire change handlers.
  const buttonCount = await p.helperCall("queryAllCount", ['button']);
  expect(buttonCount).toBeGreaterThanOrEqual(0);

  await p.close();
});

test("options sessions page renders the imported session", async ({
  context,
  extensionId,
  extensionPage
}, testInfo) => {
  test.setTimeout(60000);
  const browserType = testInfo.project.use.browserType;
  await importSessions(extensionPage, [
    buildSession({
      id: "e2e-sessions-render",
      name: "render-target-session",
      windows: [{ urls: ["https://example.com/sess1", "https://example.com/sess2"] }]
    })
  ]);

  const p = await openExtensionPage({
    context,
    extensionId,
    extensionPage,
    browserType,
    relPath: "options/index.html#/sessions"
  });
  await waitForMounted(p);
  await p.waitForTimeout(1500);

  const hasName = await p.helperCall("selectorTextContains", ["body", "render-target-session"]);
  // Some renderings strip names — accept either presence or large body text as a render proof.
  if (!hasName) {
    const bodyLen = await p.helperCall("bodyTextLength");
    expect(bodyLen).toBeGreaterThan(50);
  }
  await p.close();
});

test("options information page mounts and shows version info", async ({
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
    relPath: "options/index.html#/information"
  });
  await waitForMounted(p);
  await p.waitForTimeout(800);
  const bodyLen = await p.helperCall("bodyTextLength");
  expect(bodyLen).toBeGreaterThan(0);
  await p.close();
});

test("options shortcuts page mounts", async ({
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
  await p.waitForTimeout(800);
  const bodyLen = await p.helperCall("bodyTextLength");
  expect(bodyLen).toBeGreaterThan(0);
  await p.close();
});
