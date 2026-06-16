const { defineConfig } = require("@playwright/test");
const path = require("path");

const FIXTURES = path.resolve(__dirname, ".fixtures");

module.exports = defineConfig({
  testDir: __dirname,
  testMatch: /.*\.spec\.js$/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  globalSetup: require.resolve("./global-setup.js"),
  projects: [
    {
      name: "chrome-mv3",
      use: {
        browserType: "chromium",
        extensionPath: path.join(FIXTURES, "chrome-mv3")
      }
    },
    {
      name: "firefox-mv3",
      use: {
        browserType: "firefox",
        extensionPath: path.join(FIXTURES, "firefox-mv3")
      }
    }
  ]
});
