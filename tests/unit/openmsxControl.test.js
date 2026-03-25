const test = require("node:test");
const assert = require("node:assert/strict");

const OpenMSXControl = require("../../src/openmsxControl");

test("parseHex returns expected bytes", () => {
  const ctrl = new OpenMSXControl("openmsx", "rom.rom");
  const buf = ctrl._parseHex("0A 0b ff");
  assert.deepEqual([...buf], [0x0a, 0x0b, 0xff]);
});

test("readFloat24 converts 24-bit mantissa", async () => {
  const ctrl = new OpenMSXControl("openmsx", "rom.rom");
  ctrl.peek = async () => 130;
  ctrl.peek16 = async () => 18702;

  const value = await ctrl.readFloat24(0x1000);
  assert.equal(value, 3.1414794921875);
});

test("readPascalString reads length-prefixed ASCII", async () => {
  const ctrl = new OpenMSXControl("openmsx", "rom.rom");
  ctrl.peek = async () => 3;
  ctrl.readBlock = async () => Buffer.from("ABC", "ascii");

  const value = await ctrl.readPascalString(0x2000);
  assert.equal(value, "ABC");
});

test("onData resolves pending reply and emits breakpointHit", async () => {
  const ctrl = new OpenMSXControl("openmsx", "rom.rom");

  let breakpointEvent = null;
  ctrl.on("breakpointHit", (payload) => {
    breakpointEvent = payload;
  });

  const replyPromise = new Promise((resolve) => {
    ctrl.pendingReplies.push(resolve);
  });

  ctrl._onData(
    "<openmsx-output><reply>bp#12 { -address 1234 }</reply></openmsx-output>",
  );

  const reply = await replyPromise;
  assert.equal(reply, "bp#12 { -address 1234 }");
  assert.deepEqual(breakpointEvent, { id: "12", address: "1234" });
});

test("_parseIntReply extracts signed integers", () => {
  const ctrl = new OpenMSXControl("openmsx", "rom.rom");
  assert.equal(ctrl._parseIntReply("2021"), 2021);
  assert.equal(ctrl._parseIntReply("value=-42"), -42);
  assert.equal(ctrl._parseIntReply("nope"), null);
});

test("peek helpers parse integer replies", async () => {
  const ctrl = new OpenMSXControl("openmsx", "rom.rom");
  ctrl.send = async (cmd) => {
    if (cmd.startsWith("peek_s16")) return "-7";
    if (cmd.startsWith("peek16")) return "65535";
    return "123";
  };

  assert.equal(await ctrl.peek(0x10), 123);
  assert.equal(await ctrl.peek16(0x10), 65535);
  assert.equal(await ctrl.peekS16(0x10), -7);
});
