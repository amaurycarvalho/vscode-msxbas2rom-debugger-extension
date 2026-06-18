const test = require("node:test");
const assert = require("node:assert/strict");

const {
  detectMegaRomFormat,
  parseAddress,
  formatBreakpointCondition,
} = require("../../src/shared/address/addressUtils");

test("detectMegaRomFormat returns null for plain ROM filename", () => {
  assert.equal(detectMegaRomFormat("test.rom"), null);
  assert.equal(detectMegaRomFormat("test.cdb"), null);
  assert.equal(detectMegaRomFormat("game.bas"), null);
});

test("detectMegaRomFormat detects ASCII8 format", () => {
  assert.equal(detectMegaRomFormat("test[ASCII8].rom"), "ASCII8");
  assert.equal(detectMegaRomFormat("test[ASCII8].cdb"), "ASCII8");
});

test("detectMegaRomFormat detects KonamiSCC format", () => {
  assert.equal(detectMegaRomFormat("test[KonamiSCC].rom"), "KonamiSCC");
  assert.equal(detectMegaRomFormat("test[KonamiSCC].cdb"), "KonamiSCC");
});

test("parseAddress handles 4-digit plain ROM address", () => {
  const result = parseAddress("8490");
  assert.equal(result.segment, null);
  assert.equal(result.offset, 0x8490);
});

test("parseAddress handles 6-digit MegaROM address", () => {
  const result = parseAddress("028490");
  assert.equal(result.segment, 0x02);
  assert.equal(result.offset, 0x8490);
});

test("parseAddress handles 6-digit variable address with 00 prefix", () => {
  const result = parseAddress("00C038");
  assert.equal(result.segment, 0x00);
  assert.equal(result.offset, 0xC038);
});

test("parseAddress handles short plain ROM address", () => {
  const result = parseAddress("0010");
  assert.equal(result.segment, null);
  assert.equal(result.offset, 0x10);
});

test("formatBreakpointCondition returns empty string for null segment", () => {
  assert.equal(formatBreakpointCondition(null), "");
});

test("formatBreakpointCondition returns empty string for undefined segment", () => {
  assert.equal(formatBreakpointCondition(undefined), "");
});

test("formatBreakpointCondition generates pc_in_slot condition", () => {
  const result = formatBreakpointCondition(0x02);
  assert.equal(result, " -condition {[pc_in_slot X X 0x2]}");
});
