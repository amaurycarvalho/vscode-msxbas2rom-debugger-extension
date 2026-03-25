const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const CDBParser = require("../../src/cdbParser");

test("parses BASIC lines, variables and end address", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cdb-"));
  const filePath = path.join(tmpDir, "test.cdb");

  const content = [
    "; comment",
    "T:INT",
    "S:G$VAR_A%SI",
    "L:G$VAR_A%SI:0010",
    "S:G$VAR_B$PSTR",
    "L:G$VAR_B$PSTR:0020",
    "S:G$VAR_C!F24",
    "L:G$VAR_C!F24:0030",
    "S:G$LIN_10",
    "L:G$LIN_10:0100",
    "S:G$END_PGM",
    "L:G$END_PGM:0FFF",
  ].join("\n");

  fs.writeFileSync(filePath, content, "utf8");

  const parser = new CDBParser(filePath);

  assert.equal(parser.getAddressForLine(10), 0x100);
  assert.equal(parser.getEndProgramAddress(), 0x0fff);

  const vars = parser.getVariables();
  assert.equal(vars["A%SI"].type, "int16");
  assert.equal(vars["A%SI"].address, 0x10);
  assert.equal(vars.B.type, "pstring");
  assert.equal(vars.B.address, 0x20);
  assert.equal(vars["C!F24"].type, "float24");
  assert.equal(vars["C!F24"].address, 0x30);
});

test("extractVariableName handles new $0_0$0 pattern", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cdb-"));
  const filePath = path.join(tmpDir, "empty.cdb");
  fs.writeFileSync(filePath, "", "utf8");

  const parser = new CDBParser(filePath);
  const name = parser.extractVariableName("G$VAR_TEST$0_0$0({2}SI:B)");
  assert.equal(name, "TEST");
});

test("normalizeSymbol strips comma suffix and type parentheses", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cdb-"));
  const filePath = path.join(tmpDir, "empty.cdb");
  fs.writeFileSync(filePath, "", "utf8");

  const parser = new CDBParser(filePath);
  const symbol = parser._normalizeSymbol("G$VAR_A$0_0$0({256}PSTR),G,0,0");
  assert.equal(symbol, "G$VAR_A$0_0$0");
});

test("getVariables disambiguates duplicated names", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cdb-"));
  const filePath = path.join(tmpDir, "dup.cdb");

  const content = [
    "S:G$VAR_D$0_0$0({3}F24),G,0,0",
    "L:G$VAR_D$0_0$0:C100",
    "S:G$VAR_D$0_0$1({3}F24),G,0,0",
    "L:G$VAR_D$0_0$1:C200",
  ].join("\n");

  fs.writeFileSync(filePath, content, "utf8");

  const parser = new CDBParser(filePath);
  const vars = parser.getVariables();

  assert.ok(vars.D);
  assert.ok(vars["D#2"]);
});
