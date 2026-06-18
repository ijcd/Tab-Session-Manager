const { defineConfig } = require("@playwright/test");
const path = require("path");

const FIXTURES = path.resolve(__dirname, ".fixtures");

// Tests under COVERAGE=1 run against an instrumented bundle that is ~2-3x
// the size and noticeably slower to load. Bump timeouts accordingly.
const TIMEOUT = process.env.COVERAGE === "1" ? 90000 : 30000;

module.exports = defineConfig({
  testDir: __dirname,
  testMatch: /.*\.spec\.js$/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  globalSetup: require.resolve("./global-setup.js"),
  timeout: TIMEOUT,
  // FF is opt-in via E2E_RUN_FF=1. Default `npm run e2e` runs chrome only.
  // `npm run e2e:firefox` sets E2E_RUN_FF=1 (see package.json).
  projects: [
    {
      name: "chrome-mv3",
      use: {
        browserType: "chromium",
        extensionPath: path.join(FIXTURES, "chrome-mv3")
      }
    },
    ...(process.env.E2E_RUN_FF === "1"
      ? [
          {
            name: "firefox-mv3",
            use: {
              browserType: "firefox",
              extensionPath: path.join(FIXTURES, "firefox-mv3")
            }
          }
        ]
      : [])
  ]
});
