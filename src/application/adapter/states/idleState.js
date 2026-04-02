const DebugSessionState = require("./debugSessionState");

class IdleState extends DebugSessionState {
  constructor() {
    super("idle", {
      debuggingRunning: false,
      debuggingActive: false,
      autoBreakpointsEnabled: false,
    });
  }
}

module.exports = IdleState;
