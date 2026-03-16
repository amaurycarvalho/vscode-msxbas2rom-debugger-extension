// openmsxControl.js

const { spawn } = require("child_process");
const EventEmitter = require("events");

class OpenMSXControl extends EventEmitter {
  constructor(openmsxPath, romPath) {
    super();

    this.openmsxPath = openmsxPath;
    this.romPath = romPath;
  }

  //--------------------------------------------------
  // Start openMSX
  //--------------------------------------------------

  start() {
    return new Promise((resolve, reject) => {
      this.proc = spawn(this.openmsxPath, ["-control", "stdio", this.romPath]);

      this.proc.stdout.on("data", (data) => {
        this._onData(data.toString());
      });

      this.proc.stderr.on("data", (data) => {
        console.error("openMSX:", data.toString());
      });

      this.proc.on("close", () => {
        this.emit("close");
      });

      resolve();
    });
  }

  //--------------------------------------------------
  // Handle incoming XML
  //--------------------------------------------------

  _onData(data) {
    this.buffer += data;

    if (!this.buffer.includes("</openmsx-output>")) return;

    const output = this.buffer;
    this.buffer = "";

    const replyMatch = output.match(/<reply[^>]*>([\s\S]*?)<\/reply>/);

    if (replyMatch) {
      const result = replyMatch[1];

      if (this.currentResolve) {
        this.currentResolve(result);
        this.currentResolve = null;
      }
    }

    this.emit("output", output);
  }

  //--------------------------------------------------
  // Send raw command
  //--------------------------------------------------

  send(command) {
    return new Promise((resolve) => {
      this.currentResolve = resolve;

      const cmd = `<command>${command}</command>\n`;

      this.proc.stdin.write(cmd);
    });
  }

  //--------------------------------------------------
  // Emulator control
  //--------------------------------------------------

  async continue() {
    await this.send("debug cont");
  }

  async break() {
    await this.send("debug break");
  }

  async step() {
    await this.send("debug step");
  }

  //--------------------------------------------------
  // Breakpoints
  //--------------------------------------------------

  async setBreakpoint(address) {
    const cmd = `debug set_bp ${address}`;

    return await this.send(cmd);
  }

  async removeBreakpoint(id) {
    const cmd = `debug remove_bp ${id}`;

    return await this.send(cmd);
  }

  //--------------------------------------------------
  // Memory access
  //--------------------------------------------------

  async readMemory(address, size) {
    const cmd = `debug read_block memory ${address} ${size}`;

    const result = await this.send(cmd);

    return this._parseHex(result);
  }

  //--------------------------------------------------
  // Parse hex memory output
  //--------------------------------------------------

  _parseHex(text) {
    if (!text) return Buffer.alloc(0);

    const hex = text.trim().split(/\s+/);

    const bytes = hex.map((x) => parseInt(x, 16));

    return Buffer.from(bytes);
  }

  //--------------------------------------------------
  // Convenience readers
  //--------------------------------------------------

  async readUInt16(address) {
    const buf = await this.readMemory(address, 2);

    return buf.readInt16LE(0);
  }

  async readFloat24(address) {
    const buf = await this.readMemory(address, 3);

    const mantissa = buf[0] | (buf[1] << 8) | (buf[2] << 16);

    return mantissa / 65536;
  }

  async readPascalString(address) {
    const lenBuf = await this.readMemory(address, 1);

    const len = lenBuf[0];

    const strBuf = await this.readMemory(address + 1, len);

    return strBuf.toString("ascii");
  }

  //--------------------------------------------------
  // Shutdown
  //--------------------------------------------------

  stop() {
    if (this.proc) this.proc.kill();
  }
}

module.exports = OpenMSXControl;
