const { test: base, expect } = require("@playwright/test");
const { chromium, firefox } = require("playwright");
const { withExtension } = require("playwright-webextext");
const fs = require("fs");
const os = require("os");
const path = require("path");

const FF_GECKO_ID = "Tab-Session-Manager@sienori";

const test = base.extend({
  userDataDir: async ({}, use) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tsm-e2e-"));
    await use(dir);
    fs.rmSync(dir, { recursive: true, force: true });
  },

  context: async ({ userDataDir }, use, testInfo) => {
    const { browserType, extensionPath } = testInfo.project.use;
    const baseType = browserType === "firefox" ? firefox : chromium;
    const wrapped = withExtension(baseType, extensionPath);
    const context = await wrapped.launchPersistentContext(userDataDir, {
      headless: false
    });
    await use(context);
    await context.close();
  },

  extensionId: async ({ context, userDataDir }, use, testInfo) => {
    const { browserType } = testInfo.project.use;
    const id =
      browserType === "firefox"
        ? await getFirefoxExtensionId(context, userDataDir)
        : await getChromeExtensionId(context);
    await use(id);
  },

  // A blank extension-origin page used as the test's vantage point. We use
  // offscreen/index.html because it loads webextension-polyfill (exposes
  // `browser`) without spinning up the React popup/options UI or depending on
  // the background being ready.
  extensionPage: async ({ context, extensionId }, use, testInfo) => {
    const { browserType } = testInfo.project.use;
    const scheme = browserType === "firefox" ? "moz-extension" : "chrome-extension";
    const page = await context.newPage();
    page.on("pageerror", err => console.log(`[page error] ${err.message}`));
    await page.goto(`${scheme}://${extensionId}/options/index.html`, {
      waitUntil: "commit",
      timeout: 10000
    });
    await page.waitForFunction(
      () => typeof browser !== "undefined" && browser.runtime && browser.runtime.id,
      { timeout: 15000 }
    );
    await use(page);
    await page.close();
  }
});

async function getChromeExtensionId(context) {
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent("serviceworker");
  return new URL(sw.url()).host;
}

// Playwright Firefox does not fire the `backgroundpage` event for MV3 event
// pages reliably, so derive the UUID from the per-profile prefs.js mapping.
// Firefox writes `extensions.webextensions.uuids` keyed by gecko addon id once
// the addon is registered.
async function getFirefoxExtensionId(context, userDataDir) {
  const prefsPath = path.join(userDataDir, "prefs.js");
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const uuid = readUuidFromPrefs(prefsPath, FF_GECKO_ID);
    if (uuid) return uuid;
    await new Promise(r => setTimeout(r, 200));
  }
  // Fallback: any already-open moz-extension page can supply the UUID.
  for (const p of context.pages()) {
    if (p.url().startsWith("moz-extension://")) return new URL(p.url()).host;
  }
  throw new Error(`could not determine firefox extension id for ${FF_GECKO_ID}`);
}

function readUuidFromPrefs(prefsPath, geckoId) {
  if (!fs.existsSync(prefsPath)) return null;
  const content = fs.readFileSync(prefsPath, "utf8");
  const re = /user_pref\("extensions\.webextensions\.uuids",\s*"((?:\\.|[^"\\])*)"\)/;
  const m = content.match(re);
  if (!m) return null;
  try {
    const json = JSON.parse(m[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\"));
    return json[geckoId] || null;
  } catch {
    return null;
  }
}

module.exports = { test, expect };
