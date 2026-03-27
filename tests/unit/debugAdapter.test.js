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
    ['10 PRINT "A"', "  20 GOTO 10", "REM no line here"].join("\n"),
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
    enableAllBreakpoints: async () => enabledCalls.push(1),
    disableAllBreakpoints: async () => disabledCalls.push(2),
    enableBreakpoint: async (id) => disabledCalls.push(id),
  };

  session.endBpId = 3;

  await session._setAutoBreakpointsEnabled(true);
  assert.deepEqual(enabledCalls.sort(), [1]);

  await session._setAutoBreakpointsEnabled(false);
  assert.deepEqual(disabledCalls.sort(), [2, 3]);
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

test("variablesRequest expands int16 array variables", async () => {
  const session = new MSXDebugSession();
  const responses = [];
  session.sendResponse = (response) => responses.push(response);

  session.cdb = {
    getVariables: () => ({
      A: {
        name: "A",
        address: 0x1000,
        type: "int16-array",
        arrayInfo: { dims: [3], elementType: "int16" },
      },
    }),
  };

  session.msx = {
    peekS16: async (address) =>
      ({ 0x1000: 1, 0x1002: 2, 0x1004: 3 })[address] ?? 0,
  };

  await session.variablesRequest({ body: {} }, { variablesReference: 0 });

  assert.equal(responses.length, 1);
  const rootVars = responses[0].body.variables;
  assert.equal(rootVars.length, 1);
  assert.equal(rootVars[0].name, "A");
  assert.equal(rootVars[0].value, "int16[3]");
  assert.ok(rootVars[0].variablesReference > 0);

  responses.length = 0;
  await session.variablesRequest(
    { body: {} },
    { variablesReference: rootVars[0].variablesReference },
  );

  const childVars = responses[0].body.variables;
  assert.deepEqual(
    childVars.map((v) => v.value),
    ["1", "2", "3"],
  );
});

test("variablesRequest expands pstring and float24 arrays", async () => {
  const session = new MSXDebugSession();
  const responses = [];
  session.sendResponse = (response) => responses.push(response);

  session.cdb = {
    getVariables: () => ({
      M: {
        name: "M",
        address: 0x2000,
        type: "pstring-array",
        arrayInfo: { dims: [2, 2], elementType: "pstring" },
      },
      F: {
        name: "F",
        address: 0x4000,
        type: "float24-array",
        arrayInfo: { dims: [2], elementType: "float24" },
      },
    }),
  };

  const mem8 = new Map();
  const mem16 = new Map();
  const blocks = new Map();

  const setPstring = (address, text) => {
    mem8.set(address, text.length);
    blocks.set(address + 1, Buffer.from(text, "ascii"));
  };

  // pstring array elements at 0x2000, 0x2100, 0x2200, 0x2300
  setPstring(0x2000, "A");
  setPstring(0x2100, "BC");
  setPstring(0x2200, "DEF");
  setPstring(0x2300, "G");

  // float24 elements at 0x4000 and 0x4003
  mem8.set(0x4000, 130);
  mem16.set(0x4001, 18702);
  mem8.set(0x4003, 130);
  mem16.set(0x4004, 18702);

  session.msx = {
    peek: async (address) => mem8.get(address) ?? 0,
    peek16: async (address) => mem16.get(address) ?? 0,
    readBlock: async (address) => blocks.get(address) ?? Buffer.alloc(0),
  };

  await session.variablesRequest({ body: {} }, { variablesReference: 0 });

  const rootVars = responses[0].body.variables;
  const stringsVar = rootVars.find((v) => v.name === "M");
  const floatsVar = rootVars.find((v) => v.name === "F");

  assert.equal(stringsVar.value, "pstring[2x2]");
  assert.equal(floatsVar.value, "float24[2]");

  responses.length = 0;
  await session.variablesRequest(
    { body: {} },
    { variablesReference: stringsVar.variablesReference },
  );

  const rowVars = responses[0].body.variables;
  assert.equal(rowVars.length, 2);

  responses.length = 0;
  await session.variablesRequest(
    { body: {} },
    { variablesReference: rowVars[0].variablesReference },
  );

  const row0Values = responses[0].body.variables.map((v) => v.value);
  assert.deepEqual(row0Values, ["A", "BC"]);

  responses.length = 0;
  await session.variablesRequest(
    { body: {} },
    { variablesReference: floatsVar.variablesReference },
  );

  const floatValues = responses[0].body.variables.map((v) => v.value);
  assert.deepEqual(floatValues, ["3.142", "3.142"]);
});
