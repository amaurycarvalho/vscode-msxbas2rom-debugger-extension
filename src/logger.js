// logger.js

const fs = require("fs");
const path = require("path");
const os = require("os");

class Logger {
  constructor(scope) {
    this.scope = scope;
  }

  static configure({
    debugEnabled,
    verboseEnabled,
    logPath,
    outputChannel,
  } = {}) {
    if (typeof debugEnabled === "boolean") {
      Logger._debugEnabled = debugEnabled;
    }
    if (typeof verboseEnabled === "boolean") {
      Logger._verboseEnabled = verboseEnabled;
    }
    if (typeof logPath === "string" && logPath.length > 0) {
      Logger._logPath = logPath;
    }
    if (outputChannel) {
      Logger._outputChannel = outputChannel;
    }
  }

  static _expandPath(inputPath) {
    if (!inputPath) return inputPath;

    let out = inputPath;

    if (process.platform === "win32") {
      const temp = process.env.TEMP || process.env.TMP || os.tmpdir();
      out = out.replace(/%TEMP%/gi, temp).replace(/%TMP%/gi, temp);
    } else {
      const temp = os.tmpdir();
      out = out.replace(/%TEMP%/gi, temp).replace(/%TMP%/gi, temp);
    }

    const envTemp = process.env.TEMP || process.env.TMP || "";
    out = out.replace(/\$TEMP\b/g, envTemp).replace(/\$TMP\b/g, envTemp);

    return out;
  }

  static _resolveLogFile() {
    const base =
      Logger._expandPath(Logger._logPath) ||
      (process.platform === "win32"
        ? process.env.TEMP || process.env.TMP || os.tmpdir()
        : "/tmp");

    return path.join(base, "msx-debug.log");
  }

  static _writeLine(line) {
    try {
      const filePath = Logger._resolveLogFile();
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.appendFileSync(filePath, `${line}\n`);
    } catch (err) {
      // ignore logging failures
    }

    if (Logger._outputChannel) {
      try {
        Logger._outputChannel.appendLine(line);
      } catch (err) {
        // ignore output channel failures
      }
    }
  }

  _log(level, msg) {
    if (!Logger._debugEnabled) return;
    const timestamp = new Date().toISOString();
    Logger._writeLine(`${timestamp} [${this.scope}] ${level}: ${msg}`);
  }

  info(msg) {
    this._log("info", msg);
  }

  debug(msg) {
    if (!Logger._verboseEnabled) return;
    this._log("debug", msg);
  }

  warning(msg) {
    this._log("warning", msg);
  }

  error(msg) {
    this._log("error", msg);
  }
}

Logger._debugEnabled = false;
Logger._verboseEnabled = false;
Logger._logPath = null;
Logger._outputChannel = null;

module.exports = Logger;
