const test = require("node:test");
const assert = require("node:assert/strict");

const OpenMSXControl = require("../../src/infrastructure/openmsx/openmsxControl");

test("onData resolves pending reply", async () => {
  const ctrl = new OpenMSXControl("openmsx", "rom.rom");

  const replyPromise = new Promise((resolve) => {
    ctrl.pendingReplies.push(resolve);
  });

  ctrl._onData(
    "<openmsx-output><reply>bp#12 { -address 1234 }</reply></openmsx-output>",
  );

  const reply = await replyPromise;
  assert.equal(reply, "bp#12 { -address 1234 }");
});

test("onData emits update events", () => {
  const ctrl = new OpenMSXControl("openmsx", "rom.rom");

  let updatePayload = null;
  ctrl.on("update", (payload) => {
    updatePayload = payload;
  });

  ctrl._onData(
    '<openmsx-output><update type="status" name="cpu" >suspended</update></openmsx-output>',
  );

  assert.deepEqual(updatePayload, { name: "cpu", content: "suspended" });
});
