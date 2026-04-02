const DebugSessionState = require("./debugSessionState");

class RunningContinueState extends DebugSessionState {
  constructor() {
    super("running-continue", {
      debuggingRunning: true,
      debuggingActive: false,
      autoBreakpointsEnabled: false,
    });
  }
}

module.exports = RunningContinueState;
