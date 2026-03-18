// variableDecoder.js

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

  fs.appendFileSync(LOG_FILE, `${isoString} [variableDecoder] ${msg}\n`);
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
    log(`decodeInt16 addr=0x${variable.address.toString(16)}`);

    const buffer = await emulator.readMemory(variable.address, 2);

    log(`raw bytes: ${buffer.toString("hex")}`);

    const value = buffer.readInt16LE(0);

    log(`decoded int16: ${value}`);

    return value;
  }

  //--------------------------------------------------
  // 24-bit floating point
  //--------------------------------------------------

  static async decodeFloat24(variable, emulator) {
    log(`decodeFloat24 addr=0x${variable.address.toString(16)}`);

    const buffer = await emulator.readMemory(variable.address, 3);

    log(`raw bytes: ${buffer.toString("hex")}`);

    const raw = buffer[0] | (buffer[1] << 8) | (buffer[2] << 16);

    const value = raw / 65536;

    log(`decoded float24: ${value}`);

    return value;
  }

  //--------------------------------------------------
  // Pascal string
  //--------------------------------------------------

  static async decodeString(variable, emulator) {
    log(`decodeString addr=0x${variable.address.toString(16)}`);

    const lenBuf = await emulator.readMemory(variable.address, 1);

    const length = lenBuf[0];

    log(`string length: ${length}`);

    if (length === 0) {
      log("empty string");
      return "";
    }

    const strBuf = await emulator.readMemory(variable.address + 1, length);

    const value = strBuf.toString("ascii");

    log(`decoded string: "${value}"`);

    return value;
  }
}

module.exports = VariableDecoder;
module.exports.setDebug = setDebug;
