// variableDecoder.js

const fs = require("fs");
const Logger = require("../logger/logger");

const logger = new Logger("variableDecoder");

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
// VariableDecoder class
//--------------------------------------------------

class VariableDecoder {
  //--------------------------------------------------
  // Decode variable based on CDB type
  //--------------------------------------------------

  static async decode(variable, emulator) {
    logger.debug(
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
        logger.warning(`unsupported type: ${variable.type}`);
        return "<unsupported>";
    }
  }

  //--------------------------------------------------
  // 16-bit signed integer
  //--------------------------------------------------

  static async decodeInt16(variable, emulator) {
    logger.debug(`decodeInt16 addr=0x${variable.address.toString(16)}`);

    const value = await emulator.peekS16(variable.address);

    logger.debug(`decoded int16: ${value}`);

    return value;
  }

  //--------------------------------------------------
  // 24-bit floating point
  //--------------------------------------------------

  static async decodeFloat24(variable, emulator) {
    logger.debug(`decodeFloat24 addr=0x${variable.address.toString(16)}`);

    const b0 = await emulator.peek(variable.address);
    const w1 = await emulator.peek16(variable.address + 1);
    if (!b0) {
      logger.debug("decoded float24: 0");
      return 0;
    }

    const sign = w1 & 0x8000 ? -1 : 1;
    const mantissa = (w1 & 0x7fff) | 0x8000;
    const exponent = b0 - 0x80;
    const roundError = 0.000052;

    const value =
      sign * (mantissa / 65536) * Math.pow(2, exponent) + roundError;

    logger.debug(`decoded float24: ${value}`);

    return Math.round(value * 1000) / 1000;
  }

  //--------------------------------------------------
  // Pascal string
  //--------------------------------------------------

  static async decodeString(variable, emulator) {
    logger.debug(`decodeString addr=0x${variable.address.toString(16)}`);

    const length = await emulator.peek(variable.address);

    logger.debug(`string length: ${length}`);

    if (length === 0) {
      logger.debug("empty string");
      return "";
    }

    const strBuf = await emulator.readBlock(variable.address + 1, length);

    const value = strBuf.toString("ascii");

    logger.debug(`decoded string: "${value}"`);

    return value;
  }
}

module.exports = VariableDecoder;
module.exports.setDebug = setDebug;
module.exports.setVerbose = setVerbose;
module.exports.setLogPath = setLogPath;
