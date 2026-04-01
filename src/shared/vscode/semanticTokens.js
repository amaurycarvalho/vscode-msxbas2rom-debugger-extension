const vscode = require("vscode");

const legend = new vscode.SemanticTokensLegend([
  "keyword",
  "number",
  "string",
  "variable",
  "function",
  "operator",
]);

class MSXBasicSemanticTokensProvider {
  provideDocumentSemanticTokens(document) {
    const builder = new vscode.SemanticTokensBuilder(legend);

    for (let line = 0; line < document.lineCount; line++) {
      const text = document.lineAt(line).text;

      //------------------------------------------
      // keywords
      //------------------------------------------

      const keywords = [
        "PRINT",
        "IF",
        "THEN",
        "ELSE",
        "FOR",
        "NEXT",
        "GOTO",
        "GOSUB",
        "RETURN",
        "DIM",
        "INPUT",
      ];

      for (const kw of keywords) {
        const regex = new RegExp(`\\b${kw}\\b`, "gi");
        let match;

        while ((match = regex.exec(text))) {
          builder.push(line, match.index, kw.length, 0, 0);
        }
      }

      //------------------------------------------
      // numbers
      //------------------------------------------

      const numberRegex = /\b\d+\b/g;
      let match;

      while ((match = numberRegex.exec(text))) {
        builder.push(line, match.index, match[0].length, 1, 0);
      }

      //------------------------------------------
      // strings
      //------------------------------------------

      const stringRegex = /"[^"]*"/g;

      while ((match = stringRegex.exec(text))) {
        builder.push(line, match.index, match[0].length, 2, 0);
      }
    }

    return builder.build();
  }
}

module.exports = {
  MSXBasicSemanticTokensProvider,
  legend,
};
