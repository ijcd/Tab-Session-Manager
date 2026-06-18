const { test, expect } = require("./fixtures/extension");
const { importSessions, buildSession } = require("./helpers/session");
const { openExtensionPage, waitForRootMounted } = require("./helpers/extension-tab");

const ROUTES = [
  { hash: "", label: "default (sessions)" },
  { hash: "#/sessions", label: "sessions" },
  { hash: "#/settings", label: "settings" },
  { hash: "#/shortcuts", label: "shortcuts" },
  { hash: "#/information", label: "information" }
];

test("options page renders the React app and main scaffolding", async ({
  context,
  extensionId,
  extensionPage
}, testInfo) => {
  const browserType = testInfo.project.use.browserType;
  await importSessions(extensionPage, [
    buildSession({
      id: "e2e-opts-seed",
      name: "options-seed",
      windows: [{ urls: ["https://example.com/opts"] }]
    })
  ]);
  await extensionPage.waitForTimeout(150);

  const p = await openExtensionPage({
    context,
    extensionId,
    extensionPage,
    browserType,
    relPath: "options/index.html"
  });
  await waitForRootMounted(p);
  const sidebarLinks = await p.helperCall("queryAllCount", 'a[href^="#"]');
  expect(sidebarLinks).toBeGreaterThanOrEqual(2);
  await p.close();
});

for (const { hash, label } of ROUTES) {
  test(`options page route ${label} renders without crash`, async ({
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
      relPath: `options/index.html${hash}`
    });
    await waitForRootMounted(p);
    await p.waitForTimeout(400);
    const bodyLen = await p.helperCall("bodyTextLength");
    expect(bodyLen).toBeGreaterThan(0);
    await p.close();
  });
}
