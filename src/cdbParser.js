// cdbParser.js
//
// Parser for MSXBAS2ROM CDB debug files
//

const fs = require("fs");

//--------------------------------------------------
// Logging
//--------------------------------------------------

const LOG_FILE = "/tmp/msx-debug.log";

let DEBUG_ENABLED = false;

function setDebug(enabled) {
  DEBUG_ENABLED = enabled;
}

function log(msg) {
  if (!DEBUG_ENABLED) return;

  const timestamp = Date.now();
  const dateObject = new Date(timestamp);
  const isoString = dateObject.toISOString();

  fs.appendFileSync(LOG_FILE, `${isoString} [cdbParser] ${msg}\n`);
}

//--------------------------------------------------
// CDBParser class
//--------------------------------------------------

class CDBParser {
  constructor(path) {
    this.path = path;

    this.lines = {}; // BASIC line -> address
    this.variables = {}; // variable name -> {address,type}
    this.symbols = {}; // raw symbols
    this.types = {}; // type definitions

    log(`Opening CDB file: ${path}`);

    const text = fs.readFileSync(path, "utf8");

    log(`CDB file loaded (${text.length} bytes)`);

    this.parse(text);
  }

  parse(text) {
    const rows = text.split(/\r?\n/);

    log(`Parsing ${rows.length} rows`);

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

          log(`Type detected: ${typeName}`);
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

        log(`Symbol: ${symbol}`);

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

          log(`Variable detected: ${name} (${this.variables[name].type})`);
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

        log(`Address: ${symbol} -> 0x${addr.toString(16)}`);

        //----------------------------------
        // BASIC lines
        //----------------------------------

        if (symbol.startsWith("G$LIN_")) {
          const match = symbol.match(/LIN_(\d+)/);

          if (match) {
            const lineNumber = parseInt(match[1]);

            this.lines[lineNumber] = addr;

            log(`BASIC line ${lineNumber} -> 0x${addr.toString(16)}`);
          }
        }

        //----------------------------------
        // variables
        //----------------------------------

        if (symbol.startsWith("G$VAR_")) {
          const name = this.extractVariableName(symbol);

          if (this.variables[name]) {
            this.variables[name].address = addr;

            log(`Variable address: ${name} -> 0x${addr.toString(16)}`);
          }
        }

        continue;
      }
    }

    log(`Parse complete`);
    log(`Total symbols: ${Object.keys(this.symbols).length}`);
    log(`Total variables: ${Object.keys(this.variables).length}`);
    log(`Total BASIC lines: ${Object.keys(this.lines).length}`);
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
    const addr = this.lines[line] || null;

    log(`getAddressForLine(${line}) -> ${addr}`);

    return addr;
  }

  getVariable(name) {
    const v = this.variables[name] || null;

    log(`getVariable(${name}) -> ${v ? "found" : "null"}`);

    return v;
  }

  getVariables() {
    log(`getVariables() -> ${Object.keys(this.variables).length} vars`);

    return this.variables;
  }

  getLines() {
    log(`getLines() -> ${Object.keys(this.lines).length} lines`);

    return this.lines;
  }
}

module.exports = CDBParser;
module.exports.setDebug = setDebug;
