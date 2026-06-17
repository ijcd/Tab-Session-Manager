const { test, expect } = require("./fixtures/extension");
const { sendMessage } = require("./helpers/session");

test("updateTrackingStatus runs without crashing the SW", async ({ extensionPage }) => {
  await sendMessage(extensionPage, { message: "updateTrackingStatus" });
});
