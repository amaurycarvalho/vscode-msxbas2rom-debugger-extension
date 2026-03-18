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

  const timestamp = Date.now();
  const dateObject = new Date(timestamp);
  const isoString = dateObject.toISOString();

  fs.appendFileSync(LOG_FILE, `${isoString} [openmsxControl] ${msg}\n`);
}

//--------------------------------------------------
// OpenMSXControl class
//--------------------------------------------------

class OpenMSXControl extends EventEmitter {
  constructor(openmsxPath, romPath) {
    super();

    this.buffer = "";
    this.pendingReplies = [];
    this.readyEmitted = false;
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
        log(`raw data: ${text.trim()}`);
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

    let processed = false;

    // strip wrapper tags to simplify parsing
    this.buffer = this.buffer
      .replace(/<openmsx-output>/g, "")
      .replace(/<\/openmsx-output>/g, "");

    //--------------------------------------------------
    // reply handler (command responses)
    //--------------------------------------------------

    while (true) {
      const match = this.buffer.match(/<reply[^>]*>([\s\S]*?)<\/reply>/);
      if (!match) break;

      const full = match[0];
      const result = match[1];

      log(`reply: ${result}`);

      const resolve = this.pendingReplies.shift();

      if (resolve) {
        resolve(result);
      } else {
        log("reply received but no pending command");
      }

      //--------------------------------------------------
      // check for cpuregs response
      //--------------------------------------------------
      const regex =
        /(?<register>AF|BC|DE|HL|SP|PC)\s*=\s*(?<value>[0-9A-F]{4})/g;
      const matches = [...result.matchAll(regex)];
      if (matches) {
        const registers = {};
        matches.forEach((match) => {
          registers[match.groups.register] = match.groups.value;
        });
        if (registers.PC)
          this.buffer += `<update type="status" name="breakpoint">${registers.PC}</update>`;
      }

      //--------------------------------------------------
      // remove current reply from buffer list
      //--------------------------------------------------
      this.buffer = this.buffer.replace(full, "");
      processed = true;
    }

    //--------------------------------------------------
    // events handler
    //--------------------------------------------------

    while (true) {
      const regex =
        /<update\s+type="status"\s+name="(?<eventId>\w+)"\s*>(?<eventContent>.*?)<\/update>/;
      const match = this.buffer.match(regex);
      if (!match) break;

      const full = match[0];
      const { eventId, eventContent } = match.groups;

      log(`event: ${eventId} = ${eventContent}`);

      //--------------------------------------------------
      // cpu suspended
      //--------------------------------------------------

      if (eventId.includes("cpu")) {
        if (eventContent.includes("suspended")) {
          this.emit("paused");
          log(`CPU registers status request`);
          this.send("cpuregs");
        }
      }

      //--------------------------------------------------
      // breakpoint
      //--------------------------------------------------

      if (eventId.includes("breakpoint")) {
        const address = eventContent;

        log(`Breakpoint at address=${address}`);

        this.emit("breakpointHit", {
          address,
        });
      }

      //--------------------------------------------------
      // remove current reply from buffer list
      //--------------------------------------------------
      this.buffer = this.buffer.replace(full, "");
      processed = true;
    }

    if (processed && !this.readyEmitted) {
      this.readyEmitted = true;
      this.emit("output", "ready");
    }

    // prevent unbounded buffer growth if no complete tags are received
    if (this.buffer.length > 65536) {
      log("buffer overflow, trimming");
      this.buffer = this.buffer.slice(-8192);
    }
  }

  //--------------------------------------------------
  // Send raw command
  //--------------------------------------------------

  send(command) {
    return new Promise((resolve) => {
      this.pendingReplies.push(resolve);

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

    const idMatch = result.match(/bp#(\d+)/);
    const id = idMatch ? parseInt(idMatch[1]) : null;

    log(`Breakpoint created id=${id}`);

    return id;
  }

  async removeBreakpoint(id) {
    log(`removeBreakpoint ${id}`);

    const cmd = `debug remove_bp bp#${id}`;

    return await this.send(cmd);
  }

  async enableBreakpoint(id) {
    log(`enableBreakpoint ${id}`);

    const cmd = `debug breakpoint configure bp#${id} -enabled 1`;

    return await this.send(cmd);
  }

  async disableBreakpoint(id) {
    log(`enableBreakpoint ${id}`);

    const cmd = `debug breakpoint configure bp#${id} -enabled 0`;

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

  async stop() {
    log("Stopping openMSX");
    await this.send("quit");

    if (this.proc) this.proc.kill();
  }
}

module.exports = OpenMSXControl;
module.exports.setDebug = setDebug;
