// openmsxControl.js
// reference:
//   https://openmsx.org/manual/openmsx-control.html
//   https://openmsx.org/manual/commands.html

const { spawn } = require("child_process");
const EventEmitter = require("events");
const fs = require("fs");
const path = require("path");
const Logger = require("../../shared/logger/logger");
const OpenMSXXmlParser = require("./openmsxXmlParser");

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

    this.pendingReplies = [];
    this.readyEmitted = false;
    this.openmsxPath = openmsxPath;
    this.romPath = romPath;
    this.queue = [];
    this.processing = false;
    this.parser = new OpenMSXXmlParser();
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
    if (!this.readyEmitted) {
      this.readyEmitted = true;
      this.emit("output", "ready");
    }

    const parsed = this.parser.feed(data);

    //--------------------------------------------------
    // reply handler (command responses)
    //--------------------------------------------------

    for (const result of parsed.replies) {
      logger.debug(`reply: ${result}`);

      const resolve = this.pendingReplies.shift();

      if (resolve) {
        resolve(result);
      } else {
        logger.error("reply received but no pending command");
      }
    }

    //--------------------------------------------------
    // events handler
    //--------------------------------------------------

    for (const update of parsed.updates) {
      logger.debug(`event: ${update.name} = ${update.content}`);
      this.emit("update", update);
    }
  }

  //--------------------------------------------------
  // Send raw command
  //--------------------------------------------------

  send(command) {
    return new Promise((resolve, reject) => {
      this.queue.push({ command, resolve, reject });
      this._processQueue();
    });
  }

  async _processQueue() {
    if (this.processing) return;
    if (this.queue.length === 0) return;

    this.processing = true;

    const { command, resolve, reject } = this.queue.shift();

    try {
      const result = await this._sendInternal(command);
      resolve(result);
    } catch (err) {
      reject(err);
    } finally {
      this.processing = false;
      this._processQueue(); // processa próximo
    }
  }

  _sendInternal(command) {
    return new Promise((resolve) => {
      this.pendingReplies.push(resolve);

      const cmd = `<command>${command}</command>\n`;

      logger.debug(`SEND: ${command}`);

      this.proc.stdin.write(cmd);
    });
  }

  flushQueue() {
    while (this.queue.length) {
      const item = this.queue.shift();
      item.reject(new Error("Queue cleared"));
    }
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
