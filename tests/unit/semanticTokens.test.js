const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");

process.env.NODE_PATH = path.join(__dirname, "stubs");
Module._initPaths();

const { MSXBasicSemanticTokensProvider } = require("../../src/semanticTokens");

test("semantic tokens include keywords, numbers and strings", () => {
  const provider = new MSXBasicSemanticTokensProvider();

  const document = {
    lineCount: 1,
    lineAt: () => ({ text: '10 PRINT "HI"' }),
  };

  const tokens = provider.provideDocumentSemanticTokens(document);

  const byType = (type) => tokens.filter((t) => t.tokenType === type);

  assert.equal(byType(0).length, 1); // keyword
  assert.equal(byType(1).length, 1); // number
  assert.equal(byType(2).length, 1); // string

  const keywordToken = byType(0)[0];
  assert.equal(keywordToken.line, 0);
  assert.equal(keywordToken.char, 3);
  assert.equal(keywordToken.length, 5);
});

