const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

process.env.MSX_UNIT_TEST = "1";
const {
  MSXDebugSession,
} = require("../../src/application/adapter/debugAdapter");

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

  session.cmd = {
    breakpoint: {
      enableAll: async () => enabledCalls.push(1),
      disableAll: async () => disabledCalls.push(2),
      enable: async (id) => disabledCalls.push(id),
    },
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

test("stepOutRequest continues when at root scope", async () => {
  const session = new MSXDebugSession();
  let continued = false;
  session._buildStackFrames = async () => [{}];
  session.continueRequest = async () => {
    continued = true;
  };

  await session.stepOutRequest({ body: {} }, {});

  assert.equal(continued, true);
});

test("stepOutRequest enables existing return breakpoint and then enables all", async () => {
  const session = new MSXDebugSession();
  const calls = {
    disableAll: 0,
    enable: [],
    enableAll: 0,
    resume: 0,
  };

  session._buildStackFrames = async () => [{}, {}];
  session.cmd = {
    register: { get: async () => 0x2000 },
    memory: { peek16: async () => 0x1234 },
    breakpoint: {
      disableAll: async () => {
        calls.disableAll += 1;
      },
      enable: async (id) => {
        calls.enable.push(id);
      },
      createOnce: async () => 99,
      enableAll: async () => {
        calls.enableAll += 1;
      },
    },
    control: {
      resume: () => {
        calls.resume += 1;
      },
    },
  };

  session._trackBreakpoint(10, 0x1234, "user");
  session.sendResponse = () => {};

  await session.stepOutRequest({ body: {} }, {});

  assert.equal(calls.disableAll, 1);
  assert.deepEqual(calls.enable, [10]);
  assert.equal(calls.resume, 1);

  await session.state.onBreakpointHit(session, {});

  assert.equal(calls.enableAll, 1);
  assert.equal(session.breakpointStateById.get(10).enabled, true);
});

test("stepOutRequest creates temp breakpoint and removes it after hit", async () => {
  const session = new MSXDebugSession();
  const calls = {
    disableAll: 0,
    enableAll: 0,
    resume: 0,
  };

  session._buildStackFrames = async () => [{}, {}];
  session.cmd = {
    register: { get: async () => 0x2000 },
    memory: { peek16: async () => 0x5555 },
    breakpoint: {
      disableAll: async () => {
        calls.disableAll += 1;
      },
      enable: async () => {},
      createOnce: async () => 77,
      enableAll: async () => {
        calls.enableAll += 1;
      },
    },
    control: {
      resume: () => {
        calls.resume += 1;
      },
    },
  };

  session.sendResponse = () => {};

  await session.stepOutRequest({ body: {} }, {});

  assert.equal(session.breakpointStateById.has(77), true);

  await session.state.onBreakpointHit(session, {});

  assert.equal(calls.enableAll, 1);
  assert.equal(session.breakpointStateById.has(77), false);
});

test("stepOver triggers stepOut when stack deepens on auto breakpoint", async () => {
  const session = new MSXDebugSession();
  const responses = [];
  let spCalls = 0;
  let stepOutCalled = false;

  session.sendResponse = (response) => responses.push(response);
  session._startStepOutTransition = async () => {
    stepOutCalled = true;
    return true;
  };

  session.cmd = {
    register: {
      get: async () => {
        spCalls += 1;
        return spCalls === 1 ? 0x3000 : 0x2ff0;
      },
    },
    control: { resume: () => {} },
  };

  await session.nextRequest({ body: {} }, {});

  assert.equal(session.state.name, "running-stepover");

  await session.state.onBreakpointHit(session, { meta: { kind: "auto-line" } });

  assert.equal(stepOutCalled, true);
});

test("stepOver pauses when stack does not deepen or hit user breakpoint", async () => {
  const session = new MSXDebugSession();
  const responses = [];
  let spCalls = 0;

  session.sendResponse = (response) => responses.push(response);
  session._startStepOutTransition = async () => {
    throw new Error("step out should not be called");
  };

  session.cmd = {
    register: {
      get: async () => {
        spCalls += 1;
        return spCalls === 1 ? 0x3000 : 0x3000;
      },
    },
    control: { resume: () => {} },
  };

  await session.nextRequest({ body: {} }, {});

  await session.state.onBreakpointHit(session, { meta: { kind: "user" } });

  assert.equal(session.state.name, "paused");
});

test("stepIn enables breakpoints and resumes execution", async () => {
  const session = new MSXDebugSession();
  const calls = {
    enableAll: 0,
    resume: 0,
  };

  session.cmd = {
    breakpoint: {
      enableAll: async () => {
        calls.enableAll += 1;
      },
    },
    control: {
      resume: () => {
        calls.resume += 1;
      },
    },
  };

  session.sendResponse = () => {};

  await session.stepInRequest({ body: {} }, {});

  assert.equal(session.state.name, "running-step");
  assert.equal(calls.enableAll, 1);
  assert.equal(calls.resume, 1);
});

test("stepIn continues even when no breakpoints are defined", async () => {
  const session = new MSXDebugSession();
  let resumed = false;

  session.cmd = {
    control: {
      resume: () => {
        resumed = true;
      },
    },
  };

  session.sendResponse = () => {};

  await session.stepInRequest({ body: {} }, {});

  assert.equal(session.state.name, "running-step");
  assert.equal(resumed, true);
});

test("continueRequest disables auto breakpoints and keeps manual/end enabled", async () => {
  const session = new MSXDebugSession();
  const calls = {
    disableAll: 0,
    enable: [],
    resume: 0,
  };

  session.cmd = {
    breakpoint: {
      disableAll: async () => {
        calls.disableAll += 1;
      },
      enable: async (id) => {
        calls.enable.push(id);
      },
    },
    control: {
      resume: () => {
        calls.resume += 1;
      },
    },
  };

  session.endBpId = 99;
  session.autoBreakpointsEnabled = true;
  session.userBreakpointIdsBySource.set("file.bas", [5, 6]);
  session._trackBreakpoint(5, 0x1000, "user");
  session._trackBreakpoint(6, 0x1002, "user");
  session._trackBreakpoint(99, 0x2000, "end");

  session.sendResponse = () => {};

  await session.continueRequest({ body: {} }, {});

  assert.equal(session.state.name, "running-continue");
  assert.equal(calls.disableAll, 1);
  assert.equal(calls.resume, 1);
  assert.deepEqual(calls.enable.sort(), [5, 6, 99].sort());
});

test("continueRequest enables only end breakpoint when no manual breakpoints", async () => {
  const session = new MSXDebugSession();
  const calls = {
    disableAll: 0,
    enable: [],
    resume: 0,
  };

  session.cmd = {
    breakpoint: {
      disableAll: async () => {
        calls.disableAll += 1;
      },
      enable: async (id) => {
        calls.enable.push(id);
      },
    },
    control: {
      resume: () => {
        calls.resume += 1;
      },
    },
  };

  session.endBpId = 42;
  session.autoBreakpointsEnabled = true;
  session._trackBreakpoint(42, 0x3000, "end");
  session.sendResponse = () => {};

  await session.continueRequest({ body: {} }, {});

  assert.equal(calls.disableAll, 1);
  assert.equal(calls.resume, 1);
  assert.deepEqual(calls.enable, [42]);
});

test("pauseRequest enables auto breakpoints and resumes", async () => {
  const session = new MSXDebugSession();
  const calls = {
    enableAll: 0,
    resume: 0,
  };

  session.cmd = {
    breakpoint: {
      enableAll: async () => {
        calls.enableAll += 1;
      },
    },
    control: {
      resume: () => {
        calls.resume += 1;
      },
    },
  };

  session.sendResponse = () => {};

  await session.pauseRequest({ body: {} }, {});

  assert.equal(session.state.name, "running-step");
  assert.equal(calls.enableAll, 1);
  assert.equal(calls.resume, 1);
});

test("disconnectRequest stops emulator and terminates session", async () => {
  const session = new MSXDebugSession();
  const events = [];
  let stopped = false;

  session.msx = {
    stop: () => {
      stopped = true;
    },
  };
  session.sendEvent = (evt) => events.push(evt);
  session.sendResponse = () => {};

  session.disconnectRequest({ body: {} }, {});

  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(stopped, true);
  assert.equal(session.state.name, "terminated");
  const eventNames = events.map((e) => e.event);
  assert.equal(eventNames.includes("terminated"), true);
});
