// cdbParser.js
//
// Parser for MSXBAS2ROM CDB debug files
//

const fs = require("fs");

class CDBParser {
  constructor(path) {
    this.path = path;

    this.lines = {}; // BASIC line -> address
    this.variables = {}; // variable name -> {address,type}
    this.symbols = {}; // raw symbols
    this.types = {}; // type definitions

    const text = fs.readFileSync(path, "utf8");

    this.parse(text);
  }

  parse(text) {
    const rows = text.split(/\r?\n/);

    let lastSymbol = null;

    for (const r of rows) {
      const line = r.trim();

      if (line.length === 0) continue;

      if (line.startsWith(";")) continue;

      //----------------------------------
      // TYPE
      //----------------------------------

      if (line.startsWith("T:")) {
        const match = line.match(/^T:([^(\s]+)/);

        if (match) {
          const typeName = match[1];

          this.types[typeName] = {
            name: typeName,
          };
        }

        continue;
      }

      //----------------------------------
      // SYMBOL
      //----------------------------------

      if (line.startsWith("S:")) {
        const symbol = line.substring(2).trim();

        lastSymbol = symbol;

        this.symbols[symbol] = {
          name: symbol,
          address: null,
          type: null,
        };

        //----------------------------------
        // detect variable
        //----------------------------------

        if (symbol.startsWith("G$VAR_")) {
          const name = this.extractVariableName(symbol);

          this.variables[name] = {
            symbol,
            address: null,
            type: this.extractType(symbol),
          };
        }

        continue;
      }

      //----------------------------------
      // ADDRESS
      //----------------------------------

      if (line.startsWith("L:")) {
        const parts = line.split(":");

        if (parts.length < 3) continue;

        const symbol = parts[1];
        const addrHex = parts[2];

        const addr = parseInt(addrHex, 16);

        if (!this.symbols[symbol]) continue;

        this.symbols[symbol].address = addr;

        //----------------------------------
        // BASIC lines
        //----------------------------------

        if (symbol.startsWith("G$LIN_")) {
          const match = symbol.match(/LIN_(\d+)/);

          if (match) {
            const lineNumber = parseInt(match[1]);

            this.lines[lineNumber] = addr;
          }
        }

        //----------------------------------
        // variables
        //----------------------------------

        if (symbol.startsWith("G$VAR_")) {
          const name = this.extractVariableName(symbol);

          if (this.variables[name]) {
            this.variables[name].address = addr;
          }
        }

        continue;
      }
    }
  }

  //----------------------------------
  // helpers
  //----------------------------------

  extractVariableName(symbol) {
    let name = symbol.replace("G$VAR_", "");

    const pos = name.indexOf("$");

    if (pos >= 0) name = name.substring(0, pos);

    return name;
  }

  extractType(symbol) {
    if (symbol.includes("SI")) return "int16";

    if (symbol.includes("PSTR")) return "pstring";

    if (symbol.includes("F24")) return "float24";

    //----------------------------------
    // fallback based on BASIC suffix
    //----------------------------------

    if (symbol.includes("%")) return "int16";

    if (symbol.includes("$")) return "pstring";

    if (symbol.includes("!")) return "float24";

    return "unknown";
  }

  //----------------------------------
  // API
  //----------------------------------

  getAddressForLine(line) {
    return this.lines[line] || null;
  }

  getVariable(name) {
    return this.variables[name] || null;
  }

  getVariables() {
    return this.variables;
  }

  getLines() {
    return this.lines;
  }
}

module.exports = CDBParser;
