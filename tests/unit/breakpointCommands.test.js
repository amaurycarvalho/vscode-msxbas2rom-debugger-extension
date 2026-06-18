const test = require("node:test");
const assert = require("node:assert/strict");

const SetBreakpointCommand = require("../../src/domain/commands/breakpoint/set");
const CreateOnceBreakpointCommand = require("../../src/domain/commands/breakpoint/createOnce");

test("SetBreakpointCommand generates plain ROM TCL", () => {
  const cmd = new SetBreakpointCommand(0x8490);
  assert.equal(
    cmd.toTCL(),
    "debug breakpoint create -address 0x8490",
  );
});

test("SetBreakpointCommand generates MegaROM TCL with pc_in_slot", () => {
  const cmd = new SetBreakpointCommand(0x8490, 0x02);
  assert.equal(
    cmd.toTCL(),
    "debug breakpoint create -address 0x8490 -condition {[pc_in_slot X X 0x2]}",
  );
});

test("CreateOnceBreakpointCommand generates plain ROM TCL", () => {
  const cmd = new CreateOnceBreakpointCommand(0x1234);
  assert.equal(
    cmd.toTCL(),
    "debug breakpoint create -address 0x1234 -once 1",
  );
});

test("CreateOnceBreakpointCommand generates MegaROM TCL with pc_in_slot", () => {
  const cmd = new CreateOnceBreakpointCommand(0x1234, 0x03);
  assert.equal(
    cmd.toTCL(),
    "debug breakpoint create -address 0x1234 -once 1 -condition {[pc_in_slot X X 0x3]}",
  );
});

test("SetBreakpointCommand parses bp#id from reply", () => {
  const cmd = new SetBreakpointCommand(0x8490);
  assert.equal(cmd.parse("bp#12 { -address 0x8490 }"), 12);
  assert.equal(cmd.parse("bp#5"), 5);
  assert.equal(cmd.parse("no match"), null);
});

test("CreateOnceBreakpointCommand parses bp#id from reply", () => {
  const cmd = new CreateOnceBreakpointCommand(0x1234);
  assert.equal(cmd.parse("bp#42"), 42);
  assert.equal(cmd.parse("bp#7 { -address 0x1234 -once 1 }"), 7);
  assert.equal(cmd.parse("no match"), null);
});
