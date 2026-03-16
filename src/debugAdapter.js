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
} = require("vscode-debugadapter");

const vscode = require("vscode");
const CDBParser = require("./cdbParser");
const OpenMSXControl = require("./openmsxControl");
const VariableDecoder = require("./variableDecoder");

class MSXDebugSession extends DebugSession {
  constructor() {
    super();

    this.breakpoints = {};
    this.threadId = 1;

    this.msx = null;
    this.cdb = null;
  }

  //--------------------------------------------------
  // INITIALIZE
  //--------------------------------------------------

  initializeRequest(response, args) {
    response.body = {
      supportsConfigurationDoneRequest: true,
      supportsEvaluateForHovers: true,
    };

    this.sendResponse(response);
    this.sendEvent(new InitializedEvent());
  }

  //--------------------------------------------------
  // LAUNCH
  //--------------------------------------------------
  async launchRequest(response, args) {
    const config = vscode.workspace.getConfiguration("msxDebugger");

    const openmsxPath = args.openmsx || config.get("openmsxPath") || "openmsx";

    //--------------------------------------------------
    // load CDB
    //--------------------------------------------------

    this.cdb = new CDBParser(args.cdb);

    await this.cdb.load();

    //--------------------------------------------------
    // store program path
    //--------------------------------------------------

    this.program = args.program;

    //--------------------------------------------------
    // start emulator
    //--------------------------------------------------

    this.msx = new OpenMSXControl(openmsxPath, args.rom);

    await this.msx.start();

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

  setBreakPointsRequest(response, args) {
    const source = args.source.path;

    const breakpoints = [];

    for (const bp of args.breakpoints) {
      const line = bp.line;

      const addr = this.cdb.getAddressForLine(line);

      if (addr !== null) {
        this.msx.setBreakpoint(addr);

        breakpoints.push({
          verified: true,
          line,
        });
      } else {
        breakpoints.push({
          verified: false,
          line,
        });
      }
    }

    response.body = {
      breakpoints,
    };

    this.sendResponse(response);
  }

  //--------------------------------------------------
  // STACK TRACE
  //--------------------------------------------------

  stackTraceRequest(response, args) {
    const frames = [];

    frames.push(
      new StackFrame(
        1,
        "MSX BASIC",
        new Source(this.program, this.program),
        1,
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
    this.msx.continue();

    this.sendResponse(response);
  }

  //--------------------------------------------------
  // STEP
  //--------------------------------------------------

  nextRequest(response, args) {
    this.msx.step();

    this.sendResponse(response);

    this.sendEvent(new StoppedEvent("step", this.threadId));
  }

  //--------------------------------------------------
  // PAUSE
  //--------------------------------------------------

  pauseRequest(response, args) {
    this.msx.break();

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
