// cdbParser.js
//
// Parser for MSXBAS2ROM CDB debug files
//

const fs = require("fs");
const Logger = require("./logger");

const logger = new Logger("cdbParser");

function setDebug(enabled) {
  Logger.configure({ debugEnabled: enabled });
}

function setVerbose(enabled) {
  Logger.configure({ verboseEnabled: enabled });
}

function setLogPath(logPath) {
  Logger.configure({ logPath });
}

//--------------------------------------------------
// CDBParser class
//--------------------------------------------------

class CDBParser {
  constructor(path) {
    this.path = path;

    this.lines = {}; // BASIC line -> address
    this.endProgramAddress = null;
    this.variables = {}; // symbol -> {address,type,name}
    this.symbols = {}; // raw symbols
    this.types = {}; // type definitions

    logger.info(`Opening CDB file: ${path}`);

    const text = fs.readFileSync(path, "utf8");

    logger.info(`CDB file loaded (${text.length} bytes)`);

    this.parse(text);
  }

  parse(text) {
    const rows = text.split(/\r?\n/);

    logger.info(`Parsing ${rows.length} rows`);

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

          logger.debug(`Type detected: ${typeName}`);
        }

        continue;
      }

      //----------------------------------
      // SYMBOL
      //----------------------------------

      if (line.startsWith("S:")) {
        const symbolRaw = line.substring(2).trim();
        const symbolKey = this._normalizeSymbol(symbolRaw);

        lastSymbol = symbolKey;

        this.symbols[symbolKey] = {
          name: symbolKey,
          raw: symbolRaw,
          address: null,
          type: null,
        };

        logger.debug(`Symbol: ${symbolKey}`);

        //----------------------------------
        // detect variable
        //----------------------------------

        if (symbolKey.startsWith("G$VAR_")) {
          const name = this.extractVariableName(symbolRaw);

          this.variables[symbolKey] = {
            symbol: symbolKey,
            name,
            address: null,
            type: this.extractType(symbolRaw),
          };

          logger.debug(
            `Variable detected: ${name} (${this.variables[symbolKey].type})`,
          );
        }

        continue;
      }

      //----------------------------------
      // ADDRESS
      //----------------------------------

      if (line.startsWith("L:")) {
        const parts = line.split(":");

        if (parts.length < 3) continue;

        const symbolRaw = parts[1];
        const symbol = this._normalizeSymbol(symbolRaw);
        const addrHex = parts[2];

        const addr = parseInt(addrHex, 16);

        if (!this.symbols[symbol]) continue;

        this.symbols[symbol].address = addr;

        logger.debug(`Address: ${symbol} -> 0x${addr.toString(16)}`);

        //----------------------------------
        // Program start and end
        //----------------------------------

        if (symbol.startsWith("G$END_PGM")) {
          this.endProgramAddress = addr;
        }

        //----------------------------------
        // BASIC lines
        //----------------------------------

        if (symbol.startsWith("G$LIN_")) {
          const match = symbol.match(/LIN_(\d+)/);

          if (match) {
            const lineNumber = parseInt(match[1]);

            this.lines[lineNumber] = addr;

            logger.debug(`BASIC line ${lineNumber} -> 0x${addr.toString(16)}`);
          }
        }

        //----------------------------------
        // variables
        //----------------------------------

        if (symbol.startsWith("G$VAR_")) {
          const name = this.extractVariableName(symbolRaw);

          if (this.variables[symbol]) {
            this.variables[symbol].address = addr;

            logger.debug(`Variable address: ${name} -> 0x${addr.toString(16)}`);
          }
        }

        continue;
      }
    }

    logger.info(`Parse complete`);
    logger.info(`Total symbols: ${Object.keys(this.symbols).length}`);
    logger.info(`Total variables: ${Object.keys(this.variables).length}`);
    logger.info(`Total BASIC lines: ${Object.keys(this.lines).length}`);
  }

  //----------------------------------
  // helpers
  //----------------------------------

  _normalizeSymbol(symbol) {
    const withoutSuffix = symbol.split(",")[0];
    const parenPos = withoutSuffix.indexOf("(");
    return parenPos >= 0 ? withoutSuffix.substring(0, parenPos) : withoutSuffix;
  }

  extractVariableName(symbol) {
    const match = symbol.match(/G\$VAR_(.+?)\$0_0\$0/);
    if (match) return match[1];

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

    logger.debug(`getAddressForLine(${line}) -> ${addr}`);

    return addr;
  }

  getVariable(name) {
    const v = this.variables[name] || null;

    logger.debug(`getVariable(${name}) -> ${v ? "found" : "null"}`);

    return v;
  }

  getVariables() {
    const result = {};
    const counts = {};

    for (const symbol of Object.keys(this.variables)) {
      const v = this.variables[symbol];
      const base = v.name || symbol;
      const count = counts[base] || 0;
      counts[base] = count + 1;

      const name = count === 0 ? base : `${base}#${count + 1}`;
      result[name] = v;
    }

    logger.debug(`getVariables() -> ${Object.keys(result).length} vars`);

    return result;
  }

  getLines() {
    logger.debug(`getLines() -> ${Object.keys(this.lines).length} lines`);

    return this.lines;
  }

  getEndProgramAddress() {
    logger.debug(`getEndProgramAddress() -> ${this.endProgramAddress}`);

    return this.endProgramAddress;
  }
}

module.exports = CDBParser;
module.exports.setDebug = setDebug;
module.exports.setVerbose = setVerbose;
module.exports.setLogPath = setLogPath;
