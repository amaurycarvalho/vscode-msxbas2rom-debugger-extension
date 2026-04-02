// crashSidecar.js

const fs = require("fs");
const path = require("path");
const os = require("os");

class CrashSidecar {
  constructor({
    scope,
    getLogPath,
    output,
    getLastAction,
    isEnabled,
    isOwnError,
  } = {}) {
    this.scope = scope || "unknown";
    this.getLogPath = getLogPath || (() => null);
    this.output = typeof output === "function" ? output : null;
    this.getLastAction =
      typeof getLastAction === "function" ? getLastAction : null;
    this.isEnabled = typeof isEnabled === "function" ? isEnabled : () => true;
    this.isOwnError = typeof isOwnError === "function" ? isOwnError : null;
    this._handling = false;
  }

  install() {
    if (CrashSidecar._installed) return;
    CrashSidecar._installed = true;

    process.on("uncaughtException", (err) => {
      this._handle("uncaughtException", err);
    });

    process.on("unhandledRejection", (reason) => {
      this._handle("unhandledRejection", reason);
    });

    process.on("warning", (warning) => {
      this._handle("warning", warning);
    });

    process.on("exit", (code) => {
      this._handle("exit", { code });
    });
  }

  _handle(kind, err) {
    if (this._handling) return;
    this._handling = true;

    try {
      if (!this.isEnabled()) return;
      if (this.isOwnError && !this.isOwnError(err, kind)) return;
      const payload = this._buildPayload(kind, err);
      const filePath = this._writeCrash(payload);
      if (this.output) {
        const msg = `CrashSidecar captured ${kind}. Details at ${filePath}`;
        this.output(msg);
      }
    } catch (e) {
      // Ignore failures to avoid recursive crashes.
    } finally {
      this._handling = false;
    }
  }

  _buildPayload(kind, err) {
    const errorInfo = this._normalizeError(err);
    const lastAction = this.getLastAction ? this.getLastAction() : null;

    return {
      timestamp: new Date().toISOString(),
      scope: this.scope,
      kind,
      pid: process.pid,
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      lastAction,
      error: errorInfo,
    };
  }

  _normalizeError(err) {
    if (!err) return { message: "Unknown error" };

    if (err instanceof Error) {
      return {
        name: err.name,
        message: err.message,
        stack: err.stack,
      };
    }

    if (typeof err === "string") {
      return { message: err };
    }

    try {
      return { message: JSON.stringify(err) };
    } catch (e) {
      return { message: String(err) };
    }
  }

  _resolveCrashFile() {
    return CrashSidecar.resolveCrashFile(this.getLogPath());
  }

  _writeCrash(payload) {
    const filePath = this._resolveCrashFile();
    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.appendFileSync(filePath, `${JSON.stringify(payload)}\n`);
    } catch (e) {
      // ignore write errors
    }
    return filePath;
  }
}

CrashSidecar._installed = false;

CrashSidecar.resolveCrashFile = function resolveCrashFile(logPath) {
  const base =
    CrashSidecar._expandPath(logPath) ||
    (process.platform === "win32"
      ? process.env.TEMP || process.env.TMP || os.tmpdir()
      : "/tmp");

  return path.join(base, "msx-debug.crash.log");
};

CrashSidecar._expandPath = function _expandPath(inputPath) {
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
};

module.exports = CrashSidecar;
