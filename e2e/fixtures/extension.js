const { test: base, expect } = require("@playwright/test");
const { chromium, firefox } = require("playwright");
const { withExtension } = require("playwright-webextext");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { dumpCoverage, attachCoverageCapture } = require("./coverage");

const FF_GECKO_ID = "Tab-Session-Manager@sienori";

// Browser-specific launchPersistentContext options. With the omni.ja
// Juggler patch (see e2e/juggler-patch/), FF runs headless cleanly.
const LAUNCH_OPTIONS = {
  chromium: () => ({ headless: true, channel: "chromium" }),
  firefox: () => ({
    headless: true,
    acceptDownloads: true,
    // Auto-accept downloads to a temp dir so the FF "save file" dialog
    // does not hang context teardown when a test triggers
    // browser.downloads.download.
    downloadsPath: fs.mkdtempSync(path.join(os.tmpdir(), "tsm-dl-")),
    firefoxUserPrefs: {
      "browser.download.folderList": 2,
      "browser.download.manager.showWhenStarting": false,
      "browser.helperApps.neverAsk.saveToDisk":
        "application/json,text/plain,application/octet-stream"
    }
  })
};

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
    const optionsFn = LAUNCH_OPTIONS[browserType] || LAUNCH_OPTIONS.chromium;
    const context = await wrapped.launchPersistentContext(userDataDir, optionsFn());
    attachCoverageCapture(context);
    await use(context);
    try {
      await dumpCoverage(context);
    } catch (e) {
      // Coverage dump errors should not fail tests — but they must be
      // visible so a regression in the capture path is noticed.
      console.error("[coverage] dump failed:", e.message);
    }
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

  // Vantage page from which tests interact with the extension.
  //
  // Chrome: a real extension page at chrome-extension://<id>/offscreen/.
  //   Inside it, `browser.runtime.sendMessage` reaches the SW directly.
  //
  // Firefox: Playwright cannot navigate to moz-extension URLs nor reach
  //   the MV3 event page, so we navigate to the local bridge URL instead.
  //   See helpers/bridge-content-script.js + bg-exec-shim.js.
  extensionPage: async ({ context, extensionId }, use, testInfo) => {
    const { browserType } = testInfo.project.use;
    const page = await context.newPage();
    if (browserType === "firefox") {
      const bridgeUrl = process.env.E2E_BRIDGE_URL;
      if (!bridgeUrl) {
        throw new Error("E2E_BRIDGE_URL not set; global-setup must start the bridge server");
      }
      await page.goto(bridgeUrl, { waitUntil: "domcontentloaded", timeout: 10000 });
      await page.waitForFunction(
        () => document.documentElement.getAttribute("data-e2e-bridge") === "ready",
        { timeout: 8000 }
      );
    } else {
      await page.goto(`chrome-extension://${extensionId}/offscreen/index.html`, {
        waitUntil: "commit",
        timeout: 10000
      });
      await page.waitForFunction(
        () => typeof browser !== "undefined" && browser.runtime && browser.runtime.id,
        { timeout: 15000 }
      );
    }

    await use(page);
    await page.close();
  }
});

async function getChromeExtensionId(context) {
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent("serviceworker");
  return new URL(sw.url()).host;
}

// FF UUID extraction from per-profile prefs.js. We can't navigate to
// moz-extension URLs but some specs still need the UUID for sanity.
async function getFirefoxExtensionId(context, userDataDir) {
  const prefsPath = path.join(userDataDir, "prefs.js");
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const uuid = readUuidFromPrefs(prefsPath, FF_GECKO_ID);
    if (uuid) return uuid;
    await new Promise(r => setTimeout(r, 200));
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
