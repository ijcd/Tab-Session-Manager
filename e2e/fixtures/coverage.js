const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const NYC_OUTPUT_DIR = path.resolve(__dirname, "..", "..", ".nyc_output");

if (process.env.COVERAGE === "1") {
  fs.mkdirSync(NYC_OUTPUT_DIR, { recursive: true });
}

function writeBlob(cov) {
  if (!cov || Object.keys(cov).length === 0) return;
  const id = crypto.randomBytes(8).toString("hex");
  fs.writeFileSync(path.join(NYC_OUTPUT_DIR, `${id}.json`), JSON.stringify(cov));
}

// Attaches per-page coverage capture as pages are created — dumps
// window.__coverage__ just before the page closes (otherwise the tests'
// p.close() before fixture teardown loses the page's coverage). Also
// captures SW + open-page coverage at teardown.
function attachCoverageCapture(context) {
  if (process.env.COVERAGE !== "1") return;
  context.on("page", page => {
    const dump = async () => {
      if (page.isClosed()) return;
      const url = page.url();
      if (!url.startsWith("chrome-extension://") && !url.startsWith("moz-extension://")) return;
      try {
        const cov = await page.evaluate(() => window.__coverage__);
        writeBlob(cov);
      } catch {}
    };
    page.on("close", () => {
      // page already closing; nothing to evaluate. Coverage was captured
      // by the periodic flush below.
    });
    // Periodically flush coverage so we capture even pages that close
    // abruptly before our pre-close hook can fire. The interval is the
    // worst-case capture lag — make it short enough that test-end close
    // is rarely beaten by it.
    const interval = setInterval(() => {
      dump().catch(() => {});
    }, 500);
    page.on("close", () => clearInterval(interval));
  });
}

async function dumpCoverage(context) {
  if (process.env.COVERAGE !== "1") return 0;
  let count = 0;

  for (const sw of context.serviceWorkers()) {
    try {
      const cov = await sw.evaluate(() => self.__coverage__);
      if (cov && Object.keys(cov).length > 0) {
        writeBlob(cov);
        count++;
      }
    } catch {}
  }

  for (const page of context.pages()) {
    if (page.isClosed()) continue;
    const url = page.url();
    if (!url.startsWith("chrome-extension://") && !url.startsWith("moz-extension://")) continue;
    try {
      const cov = await page.evaluate(() => window.__coverage__);
      if (cov && Object.keys(cov).length > 0) {
        writeBlob(cov);
        count++;
      }
    } catch {}
  }
  return count;
}

module.exports = { attachCoverageCapture, dumpCoverage };
