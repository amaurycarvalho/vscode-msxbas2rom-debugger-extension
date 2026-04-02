const DebugSessionState = require("./debugSessionState");

class PausedState extends DebugSessionState {
  constructor() {
    super("paused", {
      debuggingRunning: true,
      debuggingActive: true,
    });
  }
}

module.exports = PausedState;
