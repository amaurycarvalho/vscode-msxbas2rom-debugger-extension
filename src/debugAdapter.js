// debugAdapter.js

const {
  DebugSession,
  InitializedEvent,
  StoppedEvent,
  TerminatedEvent,
  Thread,
  StackFrame,
  Scope,
  Source,
  Handles,
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

    this.breakpoints = {};
    this.threadId = 1;
    this.breakpointIdToLine = new Map();
    this.breakpointAddressToId = new Map();
    this.currentLine = 1;

    this.msx = null;
    this.cdb = null;

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

    DEBUG_ENABLED = args.enableDebugLogs === "true";

    OpenMSXControl.setDebug(DEBUG_ENABLED);
    CDBParser.setDebug(DEBUG_ENABLED);
    VariableDecoder.setDebug(DEBUG_ENABLED);

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

    await this.msx.start();

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
    // openMSX events
    //--------------------------------------------------

    this.msx.on("breakpointHit", (info) => {
      const id = parseInt(info.id) || 1;
      const addr = parseInt(info.address) || 0;

      //const id = this.breakpointAddressToId.get(addr) || 0;
      log(`Breakpoint id=${id} address=${addr}`);

      const line = this.breakpointIdToLine.get(id) || 1;
      log(`MSX-BASIC source code line=${line}`);

      this.currentLine = line;

      this.sendEvent(new StoppedEvent("breakpoint", this.threadId));
    });

    this.msx.on("paused", () => {
      log("Pause event received");

      this.sendEvent(new StoppedEvent("pause", this.threadId));
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

    if (this.breakpoints[source]) {
      for (const id of this.breakpoints[source]) {
        await this.msx.removeBreakpoint(id);
        this.breakpointIdToLine.delete(id);
      }
    }

    this.breakpointAddressToId.clear();
    this.breakpoints[source] = [];

    const breakpoints = [];

    for (const bp of args.breakpoints) {
      const editorLine = bp.line;
      const basicLine = linesMap[editorLine] || null;
      const addr =
        basicLine !== null ? this.cdb.getAddressForLine(basicLine) : null;

      if (addr !== null) {
        const id = await this.msx.setBreakpoint(addr);

        this.breakpoints[source].push(id);
        this.breakpointAddressToId.set(addr, id);
        this.breakpointIdToLine.set(id, editorLine);

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

  continueRequest(response, args) {
    for (const entry of this.breakpointIdToLine) {
      this.msx.disableBreakpoint(entry[0]);
    }

    this.msx.continue();

    this.sendResponse(response);
  }

  //--------------------------------------------------
  // STEP
  //--------------------------------------------------

  nextRequest(response, args) {
    //this.msx.step();
    this.msx.continue();

    this.sendResponse(response);

    this.sendEvent(new StoppedEvent("step", this.threadId));
  }

  stepInRequest(response, args) {
    this.nextRequest(response, args);
  }

  stepOutRequest(response, args) {
    this.nextRequest(response, args);
  }

  //--------------------------------------------------
  // PAUSE
  //--------------------------------------------------

  pauseRequest(response, args) {
    for (const entry of this.breakpointIdToLine) {
      this.msx.enableBreakpoint(entry[0]);
    }

    //this.msx.break();

    this.sendResponse(response);

    this.sendEvent(new StoppedEvent("pause", this.threadId));
  }

  //--------------------------------------------------
  // DISCONNECT
  //--------------------------------------------------

  disconnectRequest(response, args) {
    if (this.msx) this.msx.stop();

    this.sendResponse(response);

    this.sendEvent(new TerminatedEvent());
  }
}

DebugSession.run(MSXDebugSession);
