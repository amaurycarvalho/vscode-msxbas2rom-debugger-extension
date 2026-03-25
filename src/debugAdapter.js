// debugAdapter.js

const {
  DebugSession,
  InitializedEvent,
  StoppedEvent,
  TerminatedEvent,
  InvalidatedEvent,
  Thread,
  StackFrame,
  Scope,
  Source,
  Handles,
  OutputEvent,
  Event,
} = require("vscode-debugadapter");

const CDBParser = require("./cdbParser");
const OpenMSXControl = require("./openmsxControl");
const VariableDecoder = require("./variableDecoder");

const fs = require("fs");
const path = require("path");

//--------------------------------------------------
// Logging
//--------------------------------------------------

const LOG_FILE = "/tmp/msx-debug.log";
let DEBUG_ENABLED = false;

function log(msg) {
  if (!DEBUG_ENABLED) return;

  const timestamp = Date.now();
  const dateObject = new Date(timestamp);
  const isoString = dateObject.toISOString();

  fs.appendFileSync(LOG_FILE, `${isoString} [debugAdapter] ${msg}\n`);
}

//--------------------------------------------------
// MSXDebugSession class
//--------------------------------------------------

class MSXDebugSession extends DebugSession {
  constructor() {
    super();

    this.threadId = 1;
    this.currentLine = 1;

    this.msx = null;
    this.cdb = null;

    this.debuggingFlag = false;
    this.autoBreakpointsEnabled = false;

    this.userBreakpointIdsBySource = new Map(); // source -> [id]
    this.userBreakpointsBySource = new Map(); // source -> Set(line)
    this.autoBreakpointIds = new Set(); // ids created at launch for all LIN_*

    this.emuBreakpointInfo = new Map(); // id -> { kind, source, line, basicLine }

    this.sourceHandles = new Handles();
  }

  //--------------------------------------------------
  // INITIALIZE
  //--------------------------------------------------

  initializeRequest(response, args) {
    log("initializeRequest");

    response.body = {
      supportsConfigurationDoneRequest: true,
      supportsEvaluateForHovers: true,
      supportsSetVariable: false,
      supportsStepBack: false,
      supportsDataBreakpoints: false,
      supportsConditionalBreakpoints: false,
    };

    this.sendResponse(response);
    this.sendEvent(new InitializedEvent());

    log("initializeRequest executed");
  }

  //--------------------------------------------------
  // configurationDoneRequest
  //--------------------------------------------------
  configurationDoneRequest(response, args) {
    log("configurationDone");

    this.sendResponse(response);
  }

  //--------------------------------------------------
  // LAUNCH
  //--------------------------------------------------
  async launchRequest(response, args) {
    const workspace = args.program ? path.dirname(args.program) : process.cwd();

    const romPath = path.resolve(workspace, args.rom);
    const cdbPath = path.resolve(workspace, args.cdb);

    const enableDebugLogs = args.enableDebugLogs;
    DEBUG_ENABLED = enableDebugLogs === true || enableDebugLogs === "true";
    const enableVerboseLogs =
      args.enableVerboseLogs === true || args.enableVerboseLogs === "true";

    OpenMSXControl.setDebug(DEBUG_ENABLED);
    CDBParser.setDebug(DEBUG_ENABLED);
    VariableDecoder.setDebug(DEBUG_ENABLED);
    OpenMSXControl.setVerbose(enableVerboseLogs);
    CDBParser.setVerbose(enableVerboseLogs);
    VariableDecoder.setVerbose(enableVerboseLogs);

    log("launchRequest called");

    log("ROM: " + romPath);
    log("CDB: " + cdbPath);

    const openmsxPath = args.openmsxPath || "openmsx";

    log("openMSX path: " + openmsxPath);

    //--------------------------------------------------
    // load CDB
    //--------------------------------------------------

    log("Loading CDB...");

    try {
      this.cdb = new CDBParser(cdbPath);
    } catch (e) {
      log("CDB ERROR: " + e.toString());
      throw e;
    }

    log("CDB loaded");

    //--------------------------------------------------
    // store program path
    //--------------------------------------------------

    this.program = args.program;

    //--------------------------------------------------
    // start emulator
    //--------------------------------------------------

    log("Starting openMSX");

    this.msx = new OpenMSXControl(openmsxPath, romPath);

    try {
      await this.msx.start();
    } catch (err) {
      log(`openMSX start error: ${err}`);
      response.success = false;
      response.message =
        "Failed to start openMSX. Check 'msxDebugger.openmsxPath'.";
      this.sendResponse(response);
      return;
    }

    log("openMSX started");

    log("enabling events watching");
    await this.msx.send("openmsx_update enable status");
    //await this.msx.send("openmsx_update enable hardware");
    //await this.msx.send("openmsx_update enable setting");
    //await this.msx.send("openmsx_update enable setting-info");
    //await this.msx.send("openmsx_update enable led");

    log("showing emulator screen");
    await this.msx.send("set renderer SDLGL-PP");

    log("power on the machine");
    await this.msx.send("set power on");

    //--------------------------------------------------
    // auto breakpoints (all LIN_* and END_PGM)
    //--------------------------------------------------

    const linesMap = this._getBasicLineMap(this.program);
    const editorLineByBasicLine = {};

    for (const editorLineStr of Object.keys(linesMap)) {
      const editorLine = parseInt(editorLineStr, 10);
      const basicLine = linesMap[editorLine];
      if (basicLine !== null && basicLine !== undefined) {
        editorLineByBasicLine[basicLine] = editorLine;
      }
    }

    const cdbLines = this.cdb.getLines();

    for (const basicLineStr of Object.keys(cdbLines)) {
      const basicLine = parseInt(basicLineStr, 10);
      const addr = cdbLines[basicLineStr];

      const editorLine = editorLineByBasicLine[basicLine] || null;
      const id = await this.msx.setBreakpoint(addr);

      this.autoBreakpointIds.add(id);
      this.emuBreakpointInfo.set(id, {
        kind: "auto-line",
        source: this.program,
        line: editorLine,
        basicLine,
      });
    }

    const endAddr = this.cdb.getEndProgramAddress();
    if (endAddr !== null && endAddr !== undefined) {
      const endId = await this.msx.setBreakpoint(endAddr);
      this.emuBreakpointInfo.set(endId, {
        kind: "end",
        source: this.program,
        line: null,
        basicLine: null,
      });
    } else {
      log("END_PGM not found in CDB; endProgram breakpoint not created");
    }

    // Start debugging as if Pause is active: stop at the first auto breakpoint.
    this.debuggingFlag = true;
    await this._setAutoBreakpointsEnabled(true);

    //--------------------------------------------------
    // openMSX events
    //--------------------------------------------------

    this.msx.on("breakpointHit", (info) => {
      const id = parseInt(info.id) || 1;
      const addr = parseInt(info.address) || 0;

      log(`Breakpoint id=${id} address=${addr}`);

      const meta = this.emuBreakpointInfo.get(id) || null;

      if (meta && meta.kind === "end") {
        this._handleEndProgram();
        return;
      }

      const line = meta ? meta.line : null;
      const source = meta ? meta.source : this.program;

      const hasUserBreakpoint = this._hasUserBreakpoint(source, line);

      if (!this.debuggingFlag && !hasUserBreakpoint) {
        log(`Ignoring breakpoint id=${id} (debuggingFlag off)`);
        // Ensure auto breakpoints are disabled to avoid repeated hits
        if (this.autoBreakpointsEnabled) {
          this._setAutoBreakpointsEnabled(false).then(() => {
            this.msx.continue();
          });
        }
        return;
      }

      if (line !== null && line !== undefined) {
        log(`MSX-BASIC source code line=${line}`);
        this.currentLine = line;
      }

      this.sendEvent(new StoppedEvent("breakpoint", this.threadId));
      this.sendEvent(new InvalidatedEvent(["variables"]));
    });

    this.msx.on("paused", () => {
      log("Pause event received");

      this.sendEvent(new StoppedEvent("pause", this.threadId));
      this.sendEvent(new InvalidatedEvent(["variables"]));
    });

    this.msx.on("endProgram", async (info) => {
      await this._handleEndProgram();
    });

    this.sendResponse(response);
  }

  //--------------------------------------------------
  // THREADS
  //--------------------------------------------------

  threadsRequest(response) {
    response.body = {
      threads: [new Thread(this.threadId, "MSX CPU")],
    };

    this.sendResponse(response);
  }

  //--------------------------------------------------
  // BREAKPOINTS
  //--------------------------------------------------

  async setBreakPointsRequest(response, args) {
    const source = args.source.path;
    const linesMap = this._getBasicLineMap(source);

    const existingIds = this.userBreakpointIdsBySource.get(source) || [];
    for (const id of existingIds) {
      await this.msx.removeBreakpoint(id);
      this.emuBreakpointInfo.delete(id);
    }

    this.userBreakpointIdsBySource.set(source, []);

    const breakpoints = [];
    const userLines = new Set();

    for (const bp of args.breakpoints) {
      const editorLine = bp.line;
      userLines.add(editorLine);
      const basicLine = linesMap[editorLine] || null;
      const addr =
        basicLine !== null ? this.cdb.getAddressForLine(basicLine) : null;

      if (addr !== null) {
        const id = await this.msx.setBreakpoint(addr);

        this.userBreakpointIdsBySource.get(source).push(id);
        this.emuBreakpointInfo.set(id, {
          kind: "user",
          source,
          line: editorLine,
          basicLine,
        });

        breakpoints.push({
          id,
          verified: true,
          line: editorLine,
        });
      } else {
        breakpoints.push({
          verified: false,
          line: editorLine,
        });
      }
    }

    this.userBreakpointsBySource.set(source, userLines);

    response.body = { breakpoints };

    this.sendResponse(response);
  }

  //--------------------------------------------------
  // STACK TRACE
  //--------------------------------------------------

  stackTraceRequest(response, args) {
    const frames = [];

    log(`stack trace request: ${this.program}:${this.currentLine}`);

    frames.push(
      new StackFrame(
        1,
        "MSX BASIC",
        new Source(path.basename(this.program), this.program),
        this.currentLine,
        0,
      ),
    );

    response.body = {
      stackFrames: frames,
      totalFrames: frames.length,
    };

    this.sendResponse(response);
  }

  //--------------------------------------------------
  // SOURCE
  //--------------------------------------------------

  sourceRequest(response, args) {
    try {
      const ref = args.sourceReference;

      if (!ref) {
        response.success = false;
        this.sendResponse(response);
        return;
      }

      const file = this.sourceHandles.get(ref);

      const content = fs.readFileSync(file, "utf8");

      response.body = {
        content: content,
      };
    } catch (err) {
      log("sourceRequest error: " + err.toString());

      response.success = false;
    }

    this.sendResponse(response);
  }

  //--------------------------------------------------
  // BASIC line mapping
  //--------------------------------------------------

  _getBasicLineMap(sourcePath) {
    const map = {};

    try {
      const content = fs.readFileSync(sourcePath, "utf8");
      const lines = content.split(/\r?\n/);

      for (let i = 0; i < lines.length; i++) {
        const text = lines[i];
        const match = text.match(/^\s*(\d+)\b/);
        if (match) {
          map[i + 1] = parseInt(match[1], 10);
        }
      }
    } catch (err) {
      log(`_getBasicLineMap error: ${err.toString()}`);
    }

    return map;
  }

  //--------------------------------------------------
  // SCOPES
  //--------------------------------------------------

  scopesRequest(response, args) {
    const scopes = [new Scope("Variables", 1, false)];

    response.body = {
      scopes,
    };

    this.sendResponse(response);
  }

  //--------------------------------------------------
  // VARIABLES
  //--------------------------------------------------

  async variablesRequest(response, args) {
    const vars = [];

    const allVars = this.cdb.getVariables();

    for (const name in allVars) {
      const v = allVars[name];

      const value = await VariableDecoder.decode(v, this.msx);

      vars.push({
        name: name,
        value: value.toString(),
        variablesReference: 0,
      });
    }

    response.body = {
      variables: vars,
    };

    this.sendResponse(response);
  }

  //--------------------------------------------------
  // CONTINUE
  //--------------------------------------------------

  async continueRequest(response, args) {
    this.debuggingFlag = false;
    await this._setAutoBreakpointsEnabled(false);
    this.msx.continue();

    this.sendResponse(response);
  }

  //--------------------------------------------------
  // STEP
  //--------------------------------------------------

  async nextRequest(response, args) {
    this.debuggingFlag = true;
    await this._setAutoBreakpointsEnabled(true);
    //this.msx.step();
    this.msx.continue();

    this.sendResponse(response);
  }

  async stepInRequest(response, args) {
    this.debuggingFlag = true;
    await this.nextRequest(response, args);
  }

  async stepOutRequest(response, args) {
    this.debuggingFlag = true;
    await this.nextRequest(response, args);
  }

  //--------------------------------------------------
  // PAUSE
  //--------------------------------------------------

  async pauseRequest(response, args) {
    await this._setAutoBreakpointsEnabled(true);
    this.debuggingFlag = true;
    //this.msx.break();

    this.sendResponse(response);

    this.msx.continue();
  }

  //--------------------------------------------------
  // DISCONNECT
  //--------------------------------------------------

  disconnectRequest(response, args) {
    if (this.msx) this.msx.stop();

    this.sendResponse(response);

    this.sendEvent(new TerminatedEvent());
  }

  async showModal(msg) {
    this.sendEvent(new OutputEvent(`${msg}\n`));
  }

  _hasUserBreakpoint(source, line) {
    if (!source || line === null || line === undefined) return false;

    const set = this.userBreakpointsBySource.get(source);

    return set ? set.has(line) : false;
  }

  async _handleEndProgram() {
    log(`End of the user program`);

    this.sendEvent(new StoppedEvent("pause", this.threadId));
    this.sendEvent(
      new Event("endProgram", {
        message: "End of the user program.",
      }),
    );
  }

  async _setAutoBreakpointsEnabled(enabled) {
    if (this.autoBreakpointsEnabled === enabled) return;
    this.autoBreakpointsEnabled = enabled;

    for (const id of this.autoBreakpointIds) {
      if (enabled) {
        await this.msx.enableBreakpoint(id);
      } else {
        await this.msx.disableBreakpoint(id);
      }
    }
  }
}

if (process.env.MSX_UNIT_TEST !== "1") {
  DebugSession.run(MSXDebugSession);
}

module.exports = {
  MSXDebugSession,
};
