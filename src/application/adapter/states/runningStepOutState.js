const DebugSessionState = require("./debugSessionState");
const PausedState = require("./pausedState");

class RunningStepOutState extends DebugSessionState {
  constructor({ tempBreakpointId }) {
    super("running-stepout", {
      debuggingRunning: true,
      debuggingActive: true,
    });
    this.tempBreakpointId = tempBreakpointId;
  }

  async enter(session) {
    // Step Out uses custom breakpoint control; do not toggle auto breakpoints here.
    session.debuggingRunning = true;
    session.debuggingActive = true;
    session.autoBreakpointsEnabled = false;
  }

  async onBreakpointHit(session, info) {
    await session._enableAllBreakpointsState();
    if (this.tempBreakpointId) {
      session._untrackBreakpoint(this.tempBreakpointId);
    }
    await session._transitionTo(new PausedState());
  }

  async onPaused(session) {
    await session._enableAllBreakpointsState();
    if (this.tempBreakpointId) {
      session._untrackBreakpoint(this.tempBreakpointId);
    }
    await session._transitionTo(new PausedState());
  }
}

module.exports = RunningStepOutState;
