const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { startBridgeServer } = require("./helpers/http-server");

const ROOT = path.resolve(__dirname, "..");
const DEV = path.join(ROOT, "dev");
const FIXTURES = path.join(__dirname, ".fixtures");
const CREDENTIALS = path.join(ROOT, "src", "credentials.js");
const BRIDGE_CS_SRC = path.join(__dirname, "helpers", "bridge-content-script.js");
const BG_EXEC_SHIM_SRC = path.join(__dirname, "helpers", "bg-exec-shim.js");

// Bridge port used for the firefox-mv3 project. The CS injected via the
// patched FF manifest connects the page main world to chrome.runtime.
const BRIDGE_PORT = 38291;

module.exports = async () => {
  ensureCredentialsStub();
  runDevBuild();
  rebuildFixtures();
  const bridge = await startBridgeServer(BRIDGE_PORT);
  process.env.E2E_BRIDGE_URL = bridge.url;
  process.env.E2E_BRIDGE_PORT = String(bridge.port);
  // Returning a teardown fn so the server is stopped when the run completes.
  return async () => {
    await bridge.stop();
  };
};

function ensureCredentialsStub() {
  if (fs.existsSync(CREDENTIALS)) return;
  fs.writeFileSync(
    CREDENTIALS,
    `export const clientId = "test-client-id";\nexport const clientSecret = "test-client-secret";\n`
  );
}

function runDevBuild() {
  console.log("[e2e] webpack build-dev …");
  execFileSync("npm", ["run", "build-dev"], { cwd: ROOT, stdio: "inherit" });
}

function rebuildFixtures() {
  fs.rmSync(FIXTURES, { recursive: true, force: true });
  fs.mkdirSync(FIXTURES, { recursive: true });

  copyDir(path.join(DEV, "chrome"), path.join(FIXTURES, "chrome-mv3"));
  copyDir(path.join(DEV, "firefox"), path.join(FIXTURES, "firefox-mv3"));

  patchChromeManifest(path.join(FIXTURES, "chrome-mv3", "manifest.json"));
  patchFirefoxManifest(path.join(FIXTURES, "firefox-mv3", "manifest.json"));
}

function copyDir(src, dest) {
  fs.cpSync(src, dest, { recursive: true });
}

// Chrome ships tabGroups as optional_permissions so users opt in via popup UI.
// In automated tests there is no UI gesture available — promote it to a required
// permission so browser.tabGroups is callable from a fresh install.
function patchChromeManifest(manifestPath) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const optional = new Set(manifest.optional_permissions || []);
  const required = new Set(manifest.permissions || []);
  if (optional.has("tabGroups")) {
    optional.delete("tabGroups");
    required.add("tabGroups");
  }
  manifest.optional_permissions = [...optional];
  manifest.permissions = [...required];
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

// Firefox patch is the load-bearing one for the FF harness:
//
// 1) playwright-webextext (v0.0.5) iterates manifest.content_scripts and then
//    dereferences content_scripts[0].matches unconditionally — without a
//    content_scripts entry it crashes at launch.
//
// 2) Playwright's patched Firefox cannot navigate top-level to
//    moz-extension://UUID/* URLs reliably and never exposes the MV3 event
//    page via context.backgroundPages(). So the harness uses a content-script
//    bridge: we copy bridge-content-script.js into the extension dir and
//    register it via content_scripts matching the local bridge server. Tests
//    navigate to the bridge URL; the CS forwards window.postMessage requests
//    to chrome.runtime.sendMessage and posts replies back.
function patchFirefoxManifest(manifestPath) {
  const dir = path.dirname(manifestPath);
  const csFile = "e2e-bridge.js";
  fs.copyFileSync(BRIDGE_CS_SRC, path.join(dir, csFile));

  // Append bg-exec-shim to the FF background bundle. APPENDED, not
  // prepended — FF picks the last-registered chrome.runtime.onMessage
  // listener's Promise response when multiple listeners return Promises,
  // so we need to register after TSM's listeners run.
  const bgPath = path.join(dir, "background", "background.js");
  const shim = fs.readFileSync(BG_EXEC_SHIM_SRC, "utf8");
  const existing = fs.readFileSync(bgPath, "utf8");
  if (!existing.includes("__e2e_exec__")) {
    fs.writeFileSync(bgPath, existing + "\n" + shim);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  // FF MV3 (current Nightly) is strict about content_scripts injection on
  // local origins. Use <all_urls> to maximize the chance the bridge CS
  // injects on the local test server; the CS itself does nothing outside
  // the bridge page since it only listens for our private postMessage
  // protocol.
  const matches = ["<all_urls>"];
  manifest.content_scripts = [
    {
      matches,
      js: [csFile],
      run_at: "document_start",
      all_frames: true
    }
  ];
  manifest.host_permissions = Array.from(
    new Set([
      ...(manifest.host_permissions || []),
      `http://127.0.0.1:${BRIDGE_PORT}/*`,
      "<all_urls>"
    ])
  );
  // Test-only: scripting permission so the FF harness can execute test
  // queries inside moz-extension:// pages that Playwright cannot evaluate
  // against directly.
  manifest.permissions = Array.from(
    new Set([...(manifest.permissions || []), "scripting"])
  );
  manifest.web_accessible_resources = [
    {
      resources: ["popup/index.html", "options/index.html", "offscreen/index.html", "e2e-bridge.js"],
      matches: ["<all_urls>"]
    }
  ];
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}
