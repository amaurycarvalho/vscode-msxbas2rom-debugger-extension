// variableDecoder.js

const fs = require("fs");

//--------------------------------------------------
// Logging
//--------------------------------------------------

const LOG_FILE = "/tmp/msx-debug.log";

let DEBUG_ENABLED = false;
let VERBOSE_ENABLED = false;

function setDebug(enabled) {
  DEBUG_ENABLED = enabled;
}

function setVerbose(enabled) {
  VERBOSE_ENABLED = enabled;
}

function log(msg) {
  if (!DEBUG_ENABLED) return;

  const timestamp = Date.now();
  const dateObject = new Date(timestamp);
  const isoString = dateObject.toISOString();

  fs.appendFileSync(LOG_FILE, `${isoString} [variableDecoder] ${msg}\n`);
}

function vlog(msg) {
  if (!DEBUG_ENABLED || !VERBOSE_ENABLED) return;
  log(msg);
}

//--------------------------------------------------
// VariableDecoder class
//--------------------------------------------------

class VariableDecoder {
  //--------------------------------------------------
  // Decode variable based on CDB type
  //--------------------------------------------------

  static async decode(variable, emulator) {
    log(
      `decode variable: ${variable.symbol || "unknown"} type=${variable.type} addr=0x${variable.address?.toString(16)}`,
    );

    switch (variable.type) {
      case "int16":
        return await this.decodeInt16(variable, emulator);

      case "float24":
        return await this.decodeFloat24(variable, emulator);

      case "string":
      case "pstring":
        return await this.decodeString(variable, emulator);

      default:
        log(`unsupported type: ${variable.type}`);
        return "<unsupported>";
    }
  }

  //--------------------------------------------------
  // 16-bit signed integer
  //--------------------------------------------------

  static async decodeInt16(variable, emulator) {
    vlog(`decodeInt16 addr=0x${variable.address.toString(16)}`);

    const value = await emulator.peekS16(variable.address);

    log(`decoded int16: ${value}`);

    return value;
  }

  //--------------------------------------------------
  // 24-bit floating point
  //--------------------------------------------------

  static async decodeFloat24(variable, emulator) {
    vlog(`decodeFloat24 addr=0x${variable.address.toString(16)}`);

    const b0 = await emulator.peek(variable.address);
    const w1 = await emulator.peek16(variable.address + 1);
    if (!b0) {
      vlog("decoded float24: 0");
      return 0;
    }

    const sign = w1 & 0x8000 ? -1 : 1;
    const mantissa = (w1 & 0x7fff) | 0x8000;
    const exponent = b0 - 0x80;

    const value =
      sign * (mantissa / 65536) * Math.pow(2, exponent);

    log(`decoded float24: ${value}`);

    return value;
  }

  //--------------------------------------------------
  // Pascal string
  //--------------------------------------------------

  static async decodeString(variable, emulator) {
    vlog(`decodeString addr=0x${variable.address.toString(16)}`);

    const length = await emulator.peek(variable.address);

    vlog(`string length: ${length}`);

    if (length === 0) {
      vlog("empty string");
      return "";
    }

    const strBuf = await emulator.readBlock(variable.address + 1, length);

    const value = strBuf.toString("ascii");

    log(`decoded string: "${value}"`);

    return value;
  }
}

module.exports = VariableDecoder;
module.exports.setDebug = setDebug;
module.exports.setVerbose = setVerbose;
