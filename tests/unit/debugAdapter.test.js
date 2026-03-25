const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

process.env.MSX_UNIT_TEST = "1";
const { MSXDebugSession } = require("../../src/debugAdapter");

test("_getBasicLineMap extracts BASIC line numbers", () => {
  const session = new MSXDebugSession();

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "msxdbg-"));
  const filePath = path.join(tmpDir, "test.bas");
  fs.writeFileSync(
    filePath,
    ["10 PRINT \"A\"", "  20 GOTO 10", "REM no line here"].join("\n"),
    "utf8",
  );

  const map = session._getBasicLineMap(filePath);
  assert.deepEqual(map, { 1: 10, 2: 20 });
});

test("_hasUserBreakpoint checks source/line map", () => {
  const session = new MSXDebugSession();
  session.userBreakpointsBySource.set("/tmp/test.bas", new Set([3, 7]));

  assert.equal(session._hasUserBreakpoint("/tmp/test.bas", 3), true);
  assert.equal(session._hasUserBreakpoint("/tmp/test.bas", 2), false);
  assert.equal(session._hasUserBreakpoint(null, 3), false);
});

test("_setAutoBreakpointsEnabled toggles emulator breakpoints", async () => {
  const session = new MSXDebugSession();
  const enabledCalls = [];
  const disabledCalls = [];

  session.msx = {
    enableBreakpoint: async (id) => enabledCalls.push(id),
    disableBreakpoint: async (id) => disabledCalls.push(id),
  };

  session.autoBreakpointIds = new Set([1, 2, 3]);

  await session._setAutoBreakpointsEnabled(true);
  assert.deepEqual(enabledCalls.sort(), [1, 2, 3]);

  await session._setAutoBreakpointsEnabled(false);
  assert.deepEqual(disabledCalls.sort(), [1, 2, 3]);
});

test("_handleEndProgram sends stop and endProgram events", async () => {
  const session = new MSXDebugSession();
  const events = [];
  session.sendEvent = (evt) => events.push(evt);

  await session._handleEndProgram();

  const eventNames = events.map((e) => e.event);
  assert.equal(eventNames.includes("stopped"), true);
  assert.equal(eventNames.includes("endProgram"), true);
});
