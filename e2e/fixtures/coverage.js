const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const NYC_OUTPUT_DIR = path.resolve(__dirname, "..", "..", ".nyc_output");

if (process.env.COVERAGE === "1") {
  fs.mkdirSync(NYC_OUTPUT_DIR, { recursive: true });
}

// Captures self.__coverage__ from every service worker in the context and
// window.__coverage__ from every open extension page, writing each as a
// separate JSON blob into .nyc_output/. nyc merges them when reporting.
async function dumpCoverage(context) {
  if (process.env.COVERAGE !== "1") return 0;
  const blobs = [];

  for (const sw of context.serviceWorkers()) {
    try {
      const cov = await sw.evaluate(() => self.__coverage__);
      if (cov && Object.keys(cov).length > 0) blobs.push(cov);
    } catch {}
  }

  for (const page of context.pages()) {
    if (page.isClosed()) continue;
    const url = page.url();
    if (!url.startsWith("chrome-extension://") && !url.startsWith("moz-extension://")) continue;
    try {
      const cov = await page.evaluate(() => window.__coverage__);
      if (cov && Object.keys(cov).length > 0) blobs.push(cov);
    } catch {}
  }

  for (const cov of blobs) {
    const id = crypto.randomBytes(8).toString("hex");
    fs.writeFileSync(path.join(NYC_OUTPUT_DIR, `${id}.json`), JSON.stringify(cov));
  }
  return blobs.length;
}

module.exports = { dumpCoverage };
