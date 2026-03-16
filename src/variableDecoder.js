// variableDecoder.js

class VariableDecoder {
  //--------------------------------------------------
  // Decode variable based on CDB type
  //--------------------------------------------------

  static async decode(variable, emulator) {
    switch (variable.type) {
      case "int16":
        return await this.decodeInt16(variable, emulator);

      case "float24":
        return await this.decodeFloat24(variable, emulator);

      case "string":
        return await this.decodeString(variable, emulator);

      default:
        return "<unsupported>";
    }
  }

  //--------------------------------------------------
  // 16-bit signed integer
  //--------------------------------------------------

  static async decodeInt16(variable, emulator) {
    const buffer = await emulator.readMemory(variable.address, 2);

    return buffer.readInt16LE(0);
  }

  //--------------------------------------------------
  // 24-bit floating point
  //--------------------------------------------------

  static async decodeFloat24(variable, emulator) {
    const buffer = await emulator.readMemory(variable.address, 3);

    const raw = buffer[0] | (buffer[1] << 8) | (buffer[2] << 16);

    // conversão simples usada pelo compilador
    const value = raw / 65536;

    return value;
  }

  //--------------------------------------------------
  // Pascal string
  //--------------------------------------------------

  static async decodeString(variable, emulator) {
    const lenBuf = await emulator.readMemory(variable.address, 1);

    const length = lenBuf[0];

    if (length === 0) return "";

    const strBuf = await emulator.readMemory(variable.address + 1, length);

    return strBuf.toString("ascii");
  }
}

module.exports = VariableDecoder;
