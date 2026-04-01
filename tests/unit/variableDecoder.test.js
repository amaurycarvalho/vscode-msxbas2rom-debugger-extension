const test = require("node:test");
const assert = require("node:assert/strict");

const VariableDecoder = require("../../src/shared/decoder/variableDecoder");

test("decode int16", async () => {
  const emulator = {
    peekS16: async () => 0x1234,
  };

  const value = await VariableDecoder.decode(
    { type: "int16", address: 0x1000, symbol: "X" },
    emulator,
  );

  assert.equal(value, 0x1234);
});

test("decode float24", async () => {
  const emulator = {
    peek: async () => 130,
    peek16: async () => 18702,
  };

  const value = await VariableDecoder.decode(
    { type: "float24", address: 0x2000, symbol: "F" },
    emulator,
  );

  assert.equal(value, 3.142);
});

test("decode string", async () => {
  const emulator = {
    peek: async () => 3,
    readBlock: async () => Buffer.from("ABC", "ascii"),
  };

  const value = await VariableDecoder.decode(
    { type: "pstring", address: 0x3000, symbol: "S" },
    emulator,
  );

  assert.equal(value, "ABC");
});

test("decode unsupported type", async () => {
  const emulator = { readMemory: async () => Buffer.from([]) };

  const value = await VariableDecoder.decode(
    { type: "unknown", address: 0x4000, symbol: "U" },
    emulator,
  );

  assert.equal(value, "<unsupported>");
});
