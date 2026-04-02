const DebugSessionState = require("./debugSessionState");

class TerminatedState extends DebugSessionState {
  constructor() {
    super("terminated", {
      debuggingRunning: false,
      debuggingActive: false,
      autoBreakpointsEnabled: false,
    });
  }
}

module.exports = TerminatedState;
