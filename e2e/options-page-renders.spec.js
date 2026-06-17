const { test, expect } = require("./fixtures/extension");
const { importSessions, buildSession } = require("./helpers/session");

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
}) => {
  // Seed a session so the sessions list isn't empty when options renders.
  await importSessions(extensionPage, [
    buildSession({
      id: "e2e-opts-seed",
      name: "options-seed",
      windows: [{ urls: ["https://example.com/opts"] }]
    })
  ]);
  await extensionPage.waitForTimeout(300);

  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/options/index.html`);
  await page.waitForLoadState("domcontentloaded");
  await page.waitForFunction(
    () => document.querySelector("#root") && document.querySelector("#root").children.length > 0,
    { timeout: 15000 }
  );
  const sidebarLinks = await page.$$eval('a[href^="#"]', els => els.length);
  expect(sidebarLinks).toBeGreaterThanOrEqual(2);
  await page.close();
});

for (const { hash, label } of ROUTES) {
  test(`options page route ${label} renders without crash`, async ({
    context,
    extensionId,
    extensionPage
  }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options/index.html${hash}`);
    await page.waitForFunction(
      () => document.querySelector("#root") && document.querySelector("#root").children.length > 0,
      { timeout: 15000 }
    );
    // Let the route component mount fully.
    await page.waitForTimeout(800);
    const bodyText = await page.evaluate(() => document.body.innerText.length);
    expect(bodyText).toBeGreaterThan(0);
    await page.close();
  });
}
