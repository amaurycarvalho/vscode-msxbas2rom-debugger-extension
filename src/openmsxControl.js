// openmsxControl.js
// reference: 
//   https://openmsx.org/manual/openmsx-control.html
//   https://openmsx.org/manual/commands.html

const { spawn } = require("child_process");
const EventEmitter = require("events");
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
  fs.appendFileSync(LOG_FILE, `[openMSX] ${msg}\n`);
}

//--------------------------------------------------
// OpenMSXControl class
//--------------------------------------------------

class OpenMSXControl extends EventEmitter {
  constructor(openmsxPath, romPath) {
    super();

    this.buffer = "";
    this.openmsxPath = openmsxPath;
    this.romPath = romPath;
  }

  //--------------------------------------------------
  // Start openMSX
  //--------------------------------------------------

  start() {
    log(`Launching openMSX: ${this.openmsxPath} ${this.romPath}`);

    return new Promise((resolve, reject) => {
      const parts = this.openmsxPath.split(" ");

      const cmd = parts[0];
      const args = parts.slice(1);

      log(`spawn cmd: ${cmd}`);
      log(`spawn args: ${JSON.stringify(args)}`);

      this.proc = spawn(cmd, [
        ...args,
        "-control",
        "stdio",
        "-cart",
        this.romPath,
      ]);

      this.proc.stdout.on("data", (data) => {
        const text = data.toString();
        log(`stdout: ${text.trim()}`);
        this._onData(text);
      });

      this.proc.stderr.on("data", (data) => {
        const text = data.toString();
        log(`stderr: ${text.trim()}`);
      });

      this.proc.on("close", (code) => {
        log(`openMSX closed with code ${code}`);
        this.emit("close");
      });

      this.proc.on("error", (err) => {
        log(`spawn error: ${err}`);
        reject(err);
      });

      this.once("output", () => {
        log("openMSX control channel ready");
        resolve();
      });
    });
  }

  //--------------------------------------------------
  // Handle incoming XML
  //--------------------------------------------------

  _onData(data) {
    this.buffer += data;

    if (!this.buffer.includes("<openmsx-output>")) return;

    const output = this.buffer;
    this.buffer = "";

    log(`XML packet received`);

    //--------------------------------------------------
    // reply handler (command responses)
    //--------------------------------------------------

    const replyMatch = output.match(/<reply[^>]*>([\s\S]*?)<\/reply>/);

    if (replyMatch) {
      const result = replyMatch[1];

      log(`reply: ${result}`);

      if (this.currentResolve) {
        this.currentResolve(result);
        this.currentResolve = null;
      }
    }

    //--------------------------------------------------
    // notify handler (events)
    //--------------------------------------------------

    const notifyMatch = output.match(/<notify>([\s\S]*?)<\/notify>/);

    if (notifyMatch) {
      const notify = notifyMatch[1];

      log(`notify: ${notify}`);

      //--------------------------------------------------
      // breakpoint hit
      //--------------------------------------------------

      if (notify.includes("breakpoint")) {
        const idMatch = notify.match(/id="(\d+)"/);

        const id = idMatch ? parseInt(idMatch[1]) : null;

        log(`Breakpoint HIT id=${id}`);

        this.emit("breakpointHit", {
          id,
        });
      }

      //--------------------------------------------------
      // CPU break (manual pause)
      //--------------------------------------------------

      if (notify.includes("break")) {
        log(`CPU break event`);

        this.emit("paused");
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

      log(`SEND: ${command}`);

      this.proc.stdin.write(cmd);
    });
  }

  //--------------------------------------------------
  // Emulator control
  //--------------------------------------------------

  async continue() {
    log("continue");
    await this.send("debug cont");
  }

  async break() {
    log("break");
    await this.send("debug break");
  }

  async step() {
    log("step");
    await this.send("debug step");
  }

  //--------------------------------------------------
  // Breakpoints
  //--------------------------------------------------

  async setBreakpoint(address) {
    log(`setBreakpoint ${address}`);

    const cmd = `debug set_bp ${address}`;

    const result = await this.send(cmd);

    const idMatch = result.match(/id\s*=\s*(\d+)/);

    const id = idMatch ? parseInt(idMatch[1]) : null;

    log(`Breakpoint created id=${id}`);

    return id;
  }

  async removeBreakpoint(id) {
    log(`removeBreakpoint ${id}`);

    const cmd = `debug remove_bp ${id}`;

    return await this.send(cmd);
  }

  //--------------------------------------------------
  // Memory access
  //--------------------------------------------------

  async readMemory(address, size) {
    log(`readMemory addr=${address} size=${size}`);

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
    log("Stopping openMSX");
    await this.msx.send("quit");

    if (this.proc) this.proc.kill();
  }
}

module.exports = OpenMSXControl;
module.exports.setDebug = setDebug;
