// debugAdapter.js

const {
  DebugSession,
  InitializedEvent,
  StoppedEvent,
  BreakpointEvent,
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

const CDBParser = require("../../shared/parser/cdbParser");
const DebugService = require("../services/debugService");
const OpenMSXControl = require("../../infrastructure/openmsx/openmsxControl");
const VariableDecoder = require("../../shared/decoder/variableDecoder");
const Logger = require("../../shared/logger/logger");
const CrashSidecar = require("../../shared/error/crashSidecar");

const fs = require("fs");
const path = require("path");

const logger = new Logger("debugAdapter");

const {
  IdleState,
  PausedState,
  RunningContinueState,
  RunningStepOutState,
  RunningStepState,
  TerminatedState,
} = require("./states");

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
    this.cmd = null;

    this.debuggingActive = false;
    this.autoBreakpointsEnabled = false;
    this.debuggingRunning = false;
    this.state = new IdleState();

    this.userBreakpointIdsBySource = new Map(); // source -> [id]
    this.userBreakpointsBySource = new Map(); // source -> Set(line)
    this.autoBreakpointIds = new Set(); // ids created at launch for all LIN_*

    this.emuBreakpointInfo = new Map(); // id -> { kind, source, line, basicLine }
    this.breakpointStateById = new Map(); // id -> { address, enabled, kind }
    this.breakpointIdByAddress = new Map(); // address -> id

    this.sourceHandles = new Handles();
    this.variableHandles = new Handles();
    this.variablesRoot = this.variableHandles.create({ kind: "root" });

    this.startDebuggingSP = null;
    this.lastPausedSP = null;
    this.cachedStackFrames = null;
    this.basicLineAddressList = null;
    this.editorLineByBasicLine = null;
    this.basicLineByEditorLine = null;
    this.currentStackTracingLine = 0;
    this.endBpId = null;
    this.lastBreakpointHitAt = 0;

    this.lastRequest = null;

    this.crashSidecar = new CrashSidecar({
      scope: "debugAdapter",
      getLogPath: () => Logger.getLogPath(),
      isEnabled: () => Logger.isDebugEnabled(),
      getLastAction: () => this.lastRequest,
      output: (msg) => {
        try {
          this.sendEvent(new OutputEvent(`${msg}\n`, "stderr"));
        } catch (e) {
          // ignore output failures
        }
      },
    });
    this.crashSidecar.install();
  }

  dispatchRequest(request) {
    if (request) {
      this.lastRequest = {
        command: request.command,
        seq: request.seq,
        type: request.type,
      };
    }
    return super.dispatchRequest(request);
  }

  async _transitionTo(state) {
    if (this.state && this.state.name === state.name) return;
    if (this.state && this.state.exit) {
      await this.state.exit(this);
    }
    this.state = state;
    if (this.state && this.state.enter) {
      await this.state.enter(this);
    }
  }

  //--------------------------------------------------
  // INITIALIZE
  //--------------------------------------------------

  initializeRequest(response, args) {
    logger.debug("initializeRequest");

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

    logger.debug("initializeRequest executed");
  }

  //--------------------------------------------------
  // configurationDoneRequest
  //--------------------------------------------------
  configurationDoneRequest(response, args) {
    logger.debug("configurationDone");

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
    const debugEnabled = enableDebugLogs === true || enableDebugLogs === "true";
    const verboseEnabled =
      args.enableVerboseLogs === true || args.enableVerboseLogs === "true";
    const logPath = args.logPath;

    Logger.configure({
      debugEnabled,
      verboseEnabled,
      logPath,
    });

    logger.info("launchRequest called");

    logger.info("ROM: " + romPath);
    logger.info("CDB: " + cdbPath);

    const openmsxPath = args.openmsxPath || "openmsx";

    logger.info("openMSX path: " + openmsxPath);

    //--------------------------------------------------
    // load CDB
    //--------------------------------------------------

    logger.info("Loading CDB...");

    try {
      this.cdb = new CDBParser(cdbPath);
    } catch (e) {
      logger.error("CDB ERROR: " + e.toString());
      throw e;
    }

    logger.info("CDB loaded");

    //--------------------------------------------------
    // store program path
    //--------------------------------------------------

    this.program = args.program;

    //--------------------------------------------------
    // start emulator
    //--------------------------------------------------

    logger.info("Starting openMSX");

    this.msx = new OpenMSXControl(openmsxPath, romPath);

    try {
      await this.msx.start();
    } catch (err) {
      logger.error(`openMSX start error: ${err}`);
      response.success = false;
      response.message =
        "Failed to start openMSX. Check 'msxDebugger.openmsxPath'.";
      this.sendResponse(response);
      return;
    }

    logger.info("openMSX started");

    try {
      this.cmd = new DebugService(this.msx);
    } catch (e) {
      logger.error("debug service error: " + e.toString());
      throw e;
    }

    this.cmd.control.initialize();

    //--------------------------------------------------
    // auto breakpoints (all LIN_* and END_STMT)
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
      const id = await this.cmd.breakpoint.set(addr);

      this.autoBreakpointIds.add(id);
      this._trackBreakpoint(id, addr, "auto-line");
      this.emuBreakpointInfo.set(id, {
        kind: "auto-line",
        source: this.program,
        line: editorLine,
        basicLine,
        address: addr,
      });
    }

    const endAddr = this.cdb.getEndProgramAddress();
    if (endAddr !== null && endAddr !== undefined) {
      this.endBpId = await this.cmd.breakpoint.set(endAddr);
      this._trackBreakpoint(this.endBpId, endAddr, "end");
      this.emuBreakpointInfo.set(this.endBpId, {
        kind: "end",
        source: this.program,
        line: null,
        basicLine: null,
        address: endAddr,
      });
    } else {
      logger.error(
        "END_STMT not found in CDB; endProgram breakpoint not created",
      );
    }

    // Start debugging as if Pause is active: stop at the first auto breakpoint.
    await this._transitionTo(new RunningStepState());

    // Apply any user breakpoints that were configured before launch.
    await this._applyUserBreakpoints();

    logger.debug("Debugging is running");

    //--------------------------------------------------
    // openMSX events
    //--------------------------------------------------

    this.msx.on("breakpointHit", async (info) => {
      this.lastBreakpointHitAt = Date.now();
      const idRaw = parseInt(info.id, 10);
      const id = Number.isNaN(idRaw) ? null : idRaw;
      const addrRaw = parseInt(info.address, 0);
      const addr = Number.isNaN(addrRaw) ? null : addrRaw;

      logger.debug(`Breakpoint id=${id} address=${addr}`);

      const meta = id !== null ? this.emuBreakpointInfo.get(id) || null : null;

      if (meta && meta.kind === "end") {
        this._handleEndProgram();
        return;
      }

      let line = meta ? meta.line : null;
      let source = meta ? meta.source : this.program;

      if ((line === null || line === undefined) && addr !== null) {
        const basicLine = this._getBasicLineAtOrBeforeAddress(addr);
        const editorLineByBasicLine = this._getEditorLineByBasicLine(
          this.program,
        );
        if (basicLine && editorLineByBasicLine[basicLine]) {
          line = editorLineByBasicLine[basicLine];
          source = this.program;
        }
      }

      const hasUserBreakpoint = this._hasUserBreakpoint(source, line);

      if (!this.debuggingActive && !hasUserBreakpoint) {
        logger.debug(`Ignoring breakpoint id=${id} (debuggingFlag off)`);
        // Ensure auto breakpoints are disabled to avoid repeated hits
        if (this.autoBreakpointsEnabled) {
          this._setAutoBreakpointsEnabled(false).then(() => {
            this.cmd.control.resume();
          });
        }
        return;
      }

      if (line !== null && line !== undefined) {
        logger.debug(`MSX-BASIC source code line=${line}`);
        this.currentLine = line;
        this.cachedStackFrames = null;
      }

      if (
        this.startDebuggingSP === null ||
        this.startDebuggingSP === undefined
      ) {
        try {
          const sp = await this.cmd.register.get("SP");
          this.startDebuggingSP = sp;
          this.lastPausedSP = sp;
          this.cachedStackFrames = null;
        } catch (err) {
          logger.error(`Failed to read SP on breakpoint: ${err}`);
        }
      }

      this.sendEvent(new StoppedEvent("breakpoint", this.threadId));
      //this.sendEvent(new InvalidatedEvent(["variables"]));
      if (this.state && this.state.onBreakpointHit) {
        await this.state.onBreakpointHit(this, { id, addr, meta, line, source });
      }
    });

    this.msx.on("paused", async () => {
      logger.debug("Pause event received");
      // If a breakpoint just hit, keep the breakpoint stop reason/line.
      const sinceHitMs = Date.now() - this.lastBreakpointHitAt;
      if (sinceHitMs < 100) return;

      if (
        this.startDebuggingSP === null ||
        this.startDebuggingSP === undefined
      ) {
        try {
          const sp = await this.cmd.register.get("SP");
          this.startDebuggingSP = sp;
          this.lastPausedSP = sp;
          this.cachedStackFrames = null;
        } catch (err) {
          logger.error(`Failed to read SP on pause: ${err}`);
        }
      }

      this.sendEvent(new StoppedEvent("pause", this.threadId));
      //this.sendEvent(new InvalidatedEvent(["variables"]));
      if (this.state && this.state.onPaused) {
        await this.state.onPaused(this);
      }
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
      if (this.cmd !== null) await this.cmd.breakpoint.remove(id);
      this._untrackBreakpoint(id);
    }

    this.userBreakpointIdsBySource.set(source, []);

    const breakpoints = [];
    const userLines = new Set();

    for (const bp of args.breakpoints) {
      const editorLine = bp.line;
      userLines.add(editorLine);
      const basicLine = linesMap[editorLine] || null;
      const addr =
        basicLine !== null && this.cdb !== null
          ? this.cdb.getAddressForLine(basicLine)
          : null;

      if (addr !== null) {
        const id = this.cmd !== null ? await this.cmd.breakpoint.set(addr) : null;

        if (id !== null && id !== undefined) {
          this.userBreakpointIdsBySource.get(source).push(id);
          this._trackBreakpoint(id, addr, "user");
          this.emuBreakpointInfo.set(id, {
            kind: "user",
            source,
            line: editorLine,
            basicLine,
            address: addr,
          });
        }

        const bpResponse = {
          line: editorLine,
          verified: true,
        };
        if (id !== null && id !== undefined) bpResponse.id = id;

        breakpoints.push(bpResponse);
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

  async stackTraceRequest(response, args, request) {
    if (!this.debuggingRunning) {
      super.stackTraceRequest(response, args, request);
      return;
    }

    if (this.currentLine == this.currentStackTracingLine) {
      logger.debug(`stack trace request for same line (ignored)`);
      if (this.cachedStackFrames) {
        response.body = {
          stackFrames: this.cachedStackFrames,
          totalFrames: this.cachedStackFrames.length,
        };
        this.sendResponse(response);
        return;
      }
    }
    this.currentStackTracingLine = this.currentLine;

    logger.debug(`stack trace request for line: ${this.currentLine}`);

    const frames = await this._buildStackFrames();

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
      logger.error("sourceRequest error: " + err.toString());

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
      logger.error(`_getBasicLineMap error: ${err.toString()}`);
    }

    return map;
  }

  _getEditorLineByBasicLine(sourcePath) {
    if (this.editorLineByBasicLine) return this.editorLineByBasicLine;

    const linesMap = this._getBasicLineMap(sourcePath);
    const editorLineByBasicLine = {};
    const basicLineByEditorLine = {};

    for (const editorLineStr of Object.keys(linesMap)) {
      const editorLine = parseInt(editorLineStr, 10);
      const basicLine = linesMap[editorLine];
      if (basicLine !== null && basicLine !== undefined) {
        editorLineByBasicLine[basicLine] = editorLine;
        basicLineByEditorLine[editorLine] = basicLine;
      }
    }

    this.editorLineByBasicLine = editorLineByBasicLine;
    this.basicLineByEditorLine = basicLineByEditorLine;
    return editorLineByBasicLine;
  }

  _getBasicLineAddressList() {
    if (this.basicLineAddressList) return this.basicLineAddressList;

    const lines = this.cdb ? this.cdb.getLines() : {};
    const list = Object.keys(lines).map((basicLineStr) => ({
      basicLine: parseInt(basicLineStr, 10),
      address: lines[basicLineStr],
    }));

    list.sort((a, b) => a.address - b.address);

    this.basicLineAddressList = list;
    return list;
  }

  _getBasicLineBeforeAddress(callbackAddress) {
    const list = this._getBasicLineAddressList();
    if (!list.length) return null;

    if (callbackAddress <= list[0].address) {
      return list[0].basicLine;
    }

    const last = list[list.length - 1];
    if (callbackAddress > last.address) {
      return last.basicLine;
    }

    let idx = -1;
    for (let i = 0; i < list.length; i++) {
      if (list[i].address >= callbackAddress) {
        idx = i;
        break;
      }
    }

    if (idx <= 0) return list[0].basicLine;
    return list[idx - 1].basicLine;
  }

  _getBasicLineAtOrBeforeAddress(callbackAddress) {
    const list = this._getBasicLineAddressList();
    if (!list.length) return null;

    if (callbackAddress <= list[0].address) {
      return list[0].basicLine;
    }

    const last = list[list.length - 1];
    if (callbackAddress >= last.address) {
      return last.basicLine;
    }

    for (let i = 0; i < list.length; i++) {
      if (list[i].address === callbackAddress) {
        return list[i].basicLine;
      }
      if (list[i].address > callbackAddress) {
        return list[i - 1].basicLine;
      }
    }

    return list[0].basicLine;
  }

  async _buildStackFrames() {
    const frames = [];
    const source = new Source(path.basename(this.program), this.program);

    const currentLine = this.currentLine || 1;
    this._getEditorLineByBasicLine(this.program);
    const currentBasicLine =
      this.basicLineByEditorLine && this.basicLineByEditorLine[currentLine]
        ? this.basicLineByEditorLine[currentLine]
        : null;
    const topLabel = currentBasicLine
      ? `MSX BASIC ${currentBasicLine}`
      : "MSX BASIC";

    frames.push(new StackFrame(1, topLabel, source, currentLine, 0));

    if (!this.msx || !this.cdb) {
      this.cachedStackFrames = frames;
      return frames;
    }

    let currentSP = null;
    try {
      currentSP = await this.cmd.register.get("SP");
    } catch (err) {
      logger.error(`Failed to read SP: ${err}`);
      this.cachedStackFrames = frames;
      return frames;
    }

    if (this.startDebuggingSP === null || this.startDebuggingSP === undefined) {
      this.startDebuggingSP = currentSP;
    }

    if (
      this.lastPausedSP !== null &&
      currentSP === this.lastPausedSP &&
      this.cachedStackFrames
    ) {
      return this.cachedStackFrames;
    }

    this.lastPausedSP = currentSP;

    const callbackStackList = [];

    if (currentSP < this.startDebuggingSP) {
      let sp = currentSP;
      let depth = 0;
      const maxDepth = 60;

      while (sp < this.startDebuggingSP && depth < maxDepth) {
        try {
          const callbackAddr = await this.msx.peek16(sp);
          callbackStackList.push(callbackAddr);
        } catch (err) {
          logger.error(`Failed to peek SP: ${err}`);
          this.cachedStackFrames = frames;
          return frames;
        }
        sp += 2;
        depth++;
      }
    }

    const editorLineByBasicLine = this._getEditorLineByBasicLine(this.program);
    let frameId = 2;

    logger.debug(`stack top label: ${topLabel}`);

    for (const callbackAddr of callbackStackList) {
      const basicLine = this._getBasicLineBeforeAddress(callbackAddr);
      if (!basicLine) continue;

      const editorLine = editorLineByBasicLine[basicLine];
      if (!editorLine) continue;

      const lineLabel = `MSX BASIC ${basicLine}`;
      logger.debug(`stack line label: ${lineLabel}`);

      frames.push(new StackFrame(frameId++, lineLabel, source, editorLine, 0));
    }

    this.cachedStackFrames = frames;
    return frames;
  }

  //--------------------------------------------------
  // SCOPES
  //--------------------------------------------------

  scopesRequest(response, args) {
    const scopes = [new Scope("Variables", this.variablesRoot, false)];

    response.body = {
      scopes,
    };

    this.sendResponse(response);
  }

  //--------------------------------------------------
  // VARIABLES
  //--------------------------------------------------

  async variablesRequest(response, args) {
    const handle = this.variableHandles.get(args.variablesReference);

    if (!handle || handle.kind === "root") {
      const vars = [];
      const allVars = this.cdb.getVariables();

      for (const name in allVars) {
        const v = allVars[name];

        if (v.arrayInfo) {
          const dims = v.arrayInfo.dims;
          const elementType = v.arrayInfo.elementType;
          const ref = this.variableHandles.create({
            kind: "array",
            variable: v,
            dims,
            elementType,
          });

          vars.push({
            name,
            value: `${elementType}[${dims.join("x")}]`,
            variablesReference: ref,
          });
          continue;
        }

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
      return;
    }

    if (handle.kind === "array") {
      const vars = await this._expandArray(handle);
      response.body = { variables: vars };
      this.sendResponse(response);
      return;
    }

    if (handle.kind === "array-row") {
      const vars = await this._expandArrayRow(handle);
      response.body = { variables: vars };
      this.sendResponse(response);
      return;
    }

    response.body = { variables: [] };
    this.sendResponse(response);
  }

  //--------------------------------------------------
  // CONTINUE
  //--------------------------------------------------

  async continueRequest(response, args) {
    await this._transitionTo(new RunningContinueState());
    this.cmd.control.resume();

    this.sendResponse(response);
  }

  //--------------------------------------------------
  // STEP
  //--------------------------------------------------

  async nextRequest(response, args) {
    await this._transitionTo(new RunningStepState());
    this.cmd.control.resume();

    this.sendResponse(response);
  }

  async stepInRequest(response, args) {
    await this.nextRequest(response, args);
  }

  async stepOutRequest(response, args) {
    const frames = await this._buildStackFrames();
    if (!frames || frames.length <= 1) {
      await this.continueRequest(response, args);
      return;
    }

    if (this.cmd) {
      await this.cmd.breakpoint.disableAll();
      for (const id of this.breakpointStateById.keys()) {
        this._setBreakpointEnabledState(id, false);
      }
    }

    let sp = null;
    try {
      sp = await this.cmd.register.get("SP");
    } catch (err) {
      logger.error(`Failed to read SP for Step Out: ${err}`);
      this.sendResponse(response);
      return;
    }

    const returnAddr = await this.cmd.memory.peek16(sp);

    const existingId = this.breakpointIdByAddress.get(returnAddr) ?? null;
    let tempId = null;

    if (existingId !== null) {
      await this.cmd.breakpoint.enable(existingId);
      this._setBreakpointEnabledState(existingId, true);
    } else {
      tempId = await this.cmd.breakpoint.createOnce(returnAddr);
      this._trackBreakpoint(tempId, returnAddr, "temp-stepout");
    }

    await this._transitionTo(new RunningStepOutState({ tempBreakpointId: tempId }));
    this.cmd.control.resume();

    this.sendResponse(response);
  }

  //--------------------------------------------------
  // PAUSE
  //--------------------------------------------------

  async pauseRequest(response, args) {
    await this._transitionTo(new RunningStepState());

    this.sendResponse(response);

    this.cmd.control.resume();
  }

  //--------------------------------------------------
  // DISCONNECT
  //--------------------------------------------------

  disconnectRequest(response, args) {
    if (this.msx) this.msx.stop();

    this._transitionTo(new TerminatedState()).catch((err) => {
      logger.error(`Failed to transition to terminated: ${err}`);
    });

    this.sendResponse(response);

    this.sendEvent(new TerminatedEvent());
  }

  async showModal(msg) {
    this.sendEvent(new OutputEvent(`${msg}\n`));
  }

  _trackBreakpoint(id, address, kind) {
    if (id === null || id === undefined) return;
    if (address === null || address === undefined) return;
    this.breakpointStateById.set(id, {
      address,
      enabled: true,
      kind,
    });
    this.breakpointIdByAddress.set(address, id);
  }

  _untrackBreakpoint(id) {
    if (id === null || id === undefined) return;
    const info = this.breakpointStateById.get(id);
    if (info && info.address !== null && info.address !== undefined) {
      this.breakpointIdByAddress.delete(info.address);
    }
    this.breakpointStateById.delete(id);
    this.emuBreakpointInfo.delete(id);
  }

  _setBreakpointEnabledState(id, enabled) {
    const info = this.breakpointStateById.get(id);
    if (!info) return;
    info.enabled = enabled;
  }

  async _enableAllBreakpointsState() {
    if (!this.cmd) return;
    await this.cmd.breakpoint.enableAll();
    this.autoBreakpointsEnabled = true;
    for (const id of this.breakpointStateById.keys()) {
      this._setBreakpointEnabledState(id, true);
    }
  }

  _hasUserBreakpoint(source, line) {
    if (!source || line === null || line === undefined) return false;

    const set = this.userBreakpointsBySource.get(source);

    return set ? set.has(line) : false;
  }

  async _handleEndProgram() {
    logger.info(`End of the user program`);
    await this._transitionTo(new TerminatedState());

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

    if (!this.cmd) return;
    if (enabled) {
      await this.cmd.breakpoint.enableAll();
      for (const id of this.breakpointStateById.keys()) {
        this._setBreakpointEnabledState(id, true);
      }
      return;
    }

    await this.cmd.breakpoint.disableAll();
    for (const id of this.breakpointStateById.keys()) {
      this._setBreakpointEnabledState(id, false);
    }

    // After global enable/disable, toggle only manual breakpoints individually.
    for (const ids of this.userBreakpointIdsBySource.values()) {
      for (const id of ids) {
        await this.cmd.breakpoint.enable(id);
        this._setBreakpointEnabledState(id, true);
      }
    }

    // Keep end-program breakpoint active even when auto-line breakpoints are off
    if (this.endBpId) {
      await this.cmd.breakpoint.enable(this.endBpId);
      this._setBreakpointEnabledState(this.endBpId, true);
    }
  }

  async _applyUserBreakpoints() {
    if (!this.cmd || !this.cdb) return;

    for (const [source, userLines] of this.userBreakpointsBySource.entries()) {
      const linesMap = this._getBasicLineMap(source);

      const existingIds = this.userBreakpointIdsBySource.get(source) || [];
      for (const id of existingIds) {
        await this.cmd.breakpoint.remove(id);
        this._untrackBreakpoint(id);
      }

      this.userBreakpointIdsBySource.set(source, []);

      for (const editorLine of userLines) {
        const basicLine = linesMap[editorLine] || null;
        const addr =
          basicLine !== null ? this.cdb.getAddressForLine(basicLine) : null;
        if (addr === null) continue;

        const id = await this.cmd.breakpoint.set(addr);
        if (id === null || id === undefined) continue;

        this.userBreakpointIdsBySource.get(source).push(id);
        this._trackBreakpoint(id, addr, "user");
        this.emuBreakpointInfo.set(id, {
          kind: "user",
          source,
          line: editorLine,
          basicLine,
          address: addr,
        });

        // Notify VSCode that this breakpoint is now verified.
        this.sendEvent(
          new BreakpointEvent("changed", {
            id,
            verified: true,
            line: editorLine,
            source: new Source(path.basename(source), source),
          }),
        );
      }
    }
  }

  //--------------------------------------------------
  // Array expansion helpers
  //--------------------------------------------------

  async _expandArray(handle) {
    const vars = [];
    const { variable, dims, elementType } = handle;

    if (!dims || dims.length === 0) return vars;

    const elementSize = this._getElementSize(elementType);
    if (elementSize <= 0) return vars;

    if (dims.length === 1 || dims[1] === 1) {
      const count = dims[0];
      for (let i = 0; i < count; i++) {
        const value = await this._decodeElementAt(
          elementType,
          variable.address + i * elementSize,
        );
        vars.push({
          name: `${i}`,
          value: value.toString(),
          variablesReference: 0,
        });
      }

      return vars;
    }

    const xSize = dims[0];
    const ySize = dims[1];

    for (let y = 0; y < ySize; y++) {
      const ref = this.variableHandles.create({
        kind: "array-row",
        variable,
        dims,
        rowIndex: y,
        elementType,
      });

      vars.push({
        name: `${y}`,
        value: `${elementType}[${xSize}]`,
        variablesReference: ref,
      });
    }

    return vars;
  }

  async _expandArrayRow(handle) {
    const vars = [];
    const { variable, dims, rowIndex, elementType } = handle;

    if (!dims || dims.length < 2) return vars;

    const xSize = dims[0];
    const elementSize = this._getElementSize(elementType);
    if (elementSize <= 0) return vars;
    const rowOffset = rowIndex * xSize * elementSize;

    for (let x = 0; x < xSize; x++) {
      const value = await this._decodeElementAt(
        elementType,
        variable.address + rowOffset + x * elementSize,
      );

      vars.push({
        name: `${x}`,
        value: value.toString(),
        variablesReference: 0,
      });
    }

    return vars;
  }

  _getElementSize(elementType) {
    switch (elementType) {
      case "int16":
        return 2;
      case "float24":
        return 3;
      case "pstring":
        return 256;
      default:
        return 0;
    }
  }

  async _decodeElementAt(elementType, address) {
    const variable = {
      type: elementType,
      address,
      symbol: "arrayElement",
    };

    return await VariableDecoder.decode(variable, this.msx);
  }
}

if (process.env.MSX_UNIT_TEST !== "1") {
  DebugSession.run(MSXDebugSession);
}

module.exports = {
  MSXDebugSession,
};
