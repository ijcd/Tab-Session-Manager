const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DEV = path.join(ROOT, "dev");
const FIXTURES = path.join(__dirname, ".fixtures");
const CREDENTIALS = path.join(ROOT, "src", "credentials.js");

module.exports = async () => {
  ensureCredentialsStub();
  runDevBuild();
  rebuildFixtures();
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

// playwright-webextext (v0.0.5) iterates manifest.content_scripts and then
// dereferences content_scripts[0].matches unconditionally when patching gecko
// permissions. TSM has no content scripts — stub a no-op entry targeting an
// invalid host so the loader does not crash and nothing real gets injected.
function patchFirefoxManifest(manifestPath) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  manifest.content_scripts = [
    { matches: ["https://e2e-harness.invalid/*"], js: [] }
  ];
  // MV3 strict mode: extension pages need to be web_accessible_resources to
  // be navigable from a top-level tab driven by the Marionette protocol.
  manifest.web_accessible_resources = [
    {
      resources: ["popup/index.html", "options/index.html", "offscreen/index.html"],
      matches: ["<all_urls>"]
    }
  ];
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}
