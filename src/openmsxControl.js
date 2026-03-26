// openmsxControl.js
// reference:
//   https://openmsx.org/manual/openmsx-control.html
//   https://openmsx.org/manual/commands.html

const { spawn } = require("child_process");
const EventEmitter = require("events");
const fs = require("fs");
const path = require("path");
const Logger = require("./logger");

const logger = new Logger("openmsxControl");

function setDebug(enabled) {
  Logger.configure({ debugEnabled: enabled });
}

function setVerbose(enabled) {
  Logger.configure({ verboseEnabled: enabled });
}

function setLogPath(logPath) {
  Logger.configure({ logPath });
}

function splitCommand(command) {
  const parts = [];
  let current = "";
  let quote = null;

  for (let i = 0; i < command.length; i++) {
    const ch = command[i];

    if (quote) {
      if (ch === quote) {
        quote = null;
      } else if (ch === "\\" && i + 1 < command.length) {
        current += command[i + 1];
        i++;
      } else {
        current += ch;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }

    if (/\s/.test(ch)) {
      if (current.length) {
        parts.push(current);
        current = "";
      }
      continue;
    }

    current += ch;
  }

  if (current.length) {
    parts.push(current);
  }

  return parts;
}

function normalizeOpenMSXCommand(cmd) {
  if (!cmd || process.platform !== "darwin") return cmd;

  if (!cmd.endsWith(".app")) return cmd;

  const candidate = path.join(cmd, "Contents", "MacOS", "openmsx");
  if (fs.existsSync(candidate)) {
    return candidate;
  }

  return cmd;
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

  start(timeoutMs = 8000) {
    logger.info(`Launching openMSX: ${this.openmsxPath} ${this.romPath}`);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (this.readyEmitted) return;
        const err = new Error(`openMSX startup timeout after ${timeoutMs}ms`);
        logger.error(err.message);
        reject(err);
      }, timeoutMs);

      const parts = splitCommand(this.openmsxPath || "");
      if (!parts.length) {
        const err = new Error("openMSX path is empty");
        logger.error(err.message);
        reject(err);
        return;
      }

      const cmd = normalizeOpenMSXCommand(parts[0]);
      const args = parts.slice(1);

      logger.debug(`spawn cmd: ${cmd}`);
      logger.debug(`spawn args: ${JSON.stringify(args)}`);

      const controlMode = process.platform === "win32" ? "pipe" : "stdio";

      this.proc = spawn(cmd, [
        ...args,
        "-control",
        controlMode,
        "-cart",
        this.romPath,
      ]);

      this.proc.stdout.on("data", (data) => {
        const text = data.toString("latin1");
        logger.debug(`stdout: ${text.trim()}`);
        this._onData(text);
      });

      this.proc.stderr.on("data", (data) => {
        const text = data.toString("latin1");
        logger.debug(`stderr: ${text.trim()}`);
      });

      this.proc.on("close", (code) => {
        logger.info(`openMSX closed with code ${code}`);
        this.emit("close");
      });

      this.proc.on("error", (err) => {
        logger.error(`spawn error: ${err}`);
        reject(err);
      });

      this.once("output", () => {
        logger.info("openMSX control channel ready");
        clearTimeout(timeout);
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

    if (!this.readyEmitted) {
      this.readyEmitted = true;
      this.emit("output", "ready");
    }

    // strip wrapper tags to simplify parsing
    this.buffer = this.buffer
      .replace(/<openmsx-output>/g, "")
      .replace(/<\/openmsx-output>/g, "");

    //--------------------------------------------------
    // reply handler (command responses)
    //--------------------------------------------------

    while (true) {
      let match = this.buffer.match(/<reply[^>]*>([\s\S]*?)<\/reply>/);
      if (!match) break;

      let full = match[0];
      const result = match[1];

      logger.debug(`reply: ${result}`);

      const resolve = this.pendingReplies.shift();

      if (resolve) {
        resolve(result);
      } else {
        logger.error("reply received but no pending command");
      }

      //--------------------------------------------------
      // current breakpoint reply
      //--------------------------------------------------
      match = result.match(/bp#(\d+)\s+\{\s*-address\s+(\d+)/);
      if (match) {
        const id = match[1];
        const address = match[2];

        logger.debug(`Breakpoint bp#${id} at address ${address}`);

        this.emit("breakpointHit", {
          id,
          address,
        });
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

      logger.debug(`event: ${eventId} = ${eventContent}`);

      //--------------------------------------------------
      // cpu suspended event
      //--------------------------------------------------

      if (eventId.includes("cpu")) {
        if (eventContent.includes("suspended")) {
          this.emit("paused");
          this.getCurrentBreakpoint();
        }
      }

      //--------------------------------------------------
      // remove current event from buffer list
      //--------------------------------------------------
      this.buffer = this.buffer.replace(full, "");
      processed = true;
    }

    // prevent unbounded buffer growth if no complete tags are received
    if (this.buffer.length > 65536) {
      logger.warning("buffer overflow, trimming");
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

      logger.debug(`SEND: ${command}`);

      this.proc.stdin.write(cmd);
    });
  }

  //--------------------------------------------------
  // Emulator control
  //--------------------------------------------------

  async continue() {
    logger.debug("continue");
    await this.send("debug cont");
  }

  async break() {
    logger.debug("break");
    await this.send("debug break");
  }

  async step() {
    logger.debug("step");
    await this.send("debug step");
  }

  //--------------------------------------------------
  // Breakpoints
  //--------------------------------------------------

  getCurrentBreakpoint() {
    logger.debug(`Requesting current address and breakpoint number`);
    this.send(
      'set bps [debug breakpoint list] ; set i [lsearch -regexp $bps "-address [reg PC]"] ; list [lindex $bps [expr {$i - 1}]] [lindex $bps $i]',
    );
  }

  async setBreakpoint(address) {
    logger.debug(`setBreakpoint ${address}`);

    const cmd = `debug set_bp ${address}`;

    const result = await this.send(cmd);

    const idMatch = result.match(/bp#(\d+)/);
    const id = idMatch ? parseInt(idMatch[1]) : null;

    logger.debug(`Breakpoint created id=${id}`);

    return id;
  }

  async removeBreakpoint(id) {
    logger.debug(`removeBreakpoint ${id}`);

    const cmd = `debug remove_bp bp#${id}`;

    return await this.send(cmd);
  }

  async enableBreakpoint(id) {
    logger.debug(`enableBreakpoint ${id}`);

    const cmd = `debug breakpoint configure bp#${id} -enabled 1`;

    return await this.send(cmd);
  }

  async disableBreakpoint(id) {
    logger.debug(`disableBreakpoint ${id}`);

    const cmd = `debug breakpoint configure bp#${id} -enabled 0`;

    return await this.send(cmd);
  }

  //--------------------------------------------------
  // Memory access
  //--------------------------------------------------

  async readMemory(address, size) {
    return await this.readBlock(address, size);
  }

  //--------------------------------------------------
  // Parse hex memory output
  //--------------------------------------------------

  _parseHex(text) {
    if (!text) return Buffer.alloc(0);

    const trimmed = text.trim();
    if (trimmed.length === 0) return Buffer.alloc(0);

    if (/[^0-9a-fA-F\s?]/.test(trimmed)) {
      return Buffer.from(trimmed, "latin1");
    }

    const hex = trimmed.split(/\s+/);

    const bytes = hex.map((x) => {
      if (x === "??") return 0;
      const value = parseInt(x, 16);
      return Number.isNaN(value) ? 0 : value;
    });

    return Buffer.from(bytes);
  }

  _parseIntReply(text) {
    if (!text) return null;
    const match = text.match(/-?\d+/);
    return match ? parseInt(match[0], 10) : null;
  }

  _formatAddress(address) {
    return `0x${address.toString(16)}`;
  }

  async _sendAndParseInt(command) {
    const reply = await this.send(command);
    const value = this._parseIntReply(reply);
    return value === null ? 0 : value;
  }

  //--------------------------------------------------
  // Convenience readers
  //--------------------------------------------------

  async readUInt16(address) {
    return await this.peek16(address);
  }

  async readFloat24(address) {
    const b0 = await this.peek(address);
    const w1 = await this.peek16(address + 1);

    if (!b0) return 0;

    const sign = w1 & 0x8000 ? -1 : 1;
    const mantissa = (w1 & 0x7fff) | 0x8000;
    const exponent = b0 - 0x80;

    return sign * (mantissa / 65536) * Math.pow(2, exponent);
  }

  async readPascalString(address) {
    const len = await this.peek(address);
    if (!len) return "";

    const strBuf = await this.readBlock(address + 1, len);

    return strBuf.toString("ascii");
  }

  //--------------------------------------------------
  // openMSX memory helpers
  //--------------------------------------------------

  async peek(address) {
    return await this._sendAndParseInt(`peek ${this._formatAddress(address)}`);
  }

  async peek16(address) {
    return await this._sendAndParseInt(
      `peek16 ${this._formatAddress(address)}`,
    );
  }

  async peekS16(address) {
    return await this._sendAndParseInt(
      `peek_s16 ${this._formatAddress(address)}`,
    );
  }

  async readBlock(address, size) {
    logger.debug(`readBlock addr=${address} size=${size}`);
    const cmd = `debug read_block {Main RAM} ${this._formatAddress(address)} ${size}`;
    const result = await this.send(cmd);
    return Buffer.from(result, "latin1");
  }

  //--------------------------------------------------
  // Registers
  //--------------------------------------------------

  async getRegister(name) {
    const regName = String(name || "").trim();
    if (!regName) return 0;
    return await this._sendAndParseInt(`reg ${regName}`);
  }

  //--------------------------------------------------
  // Shutdown
  //--------------------------------------------------

  async stop() {
    logger.info("Stopping openMSX");
    await this.send("quit");

    if (this.proc) this.proc.kill();
  }
}

module.exports = OpenMSXControl;
module.exports.setDebug = setDebug;
module.exports.setVerbose = setVerbose;
module.exports.setLogPath = setLogPath;
