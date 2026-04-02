const DebugSessionState = require("./debugSessionState");

class RunningStepState extends DebugSessionState {
  constructor() {
    super("running-step", {
      debuggingRunning: true,
      debuggingActive: true,
      autoBreakpointsEnabled: true,
    });
  }
}

module.exports = RunningStepState;
