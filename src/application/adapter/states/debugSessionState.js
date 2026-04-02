class DebugSessionState {
  constructor(name, flags = {}) {
    this.name = name;
    this.flags = flags;
  }

  async enter(session) {
    await this._applyFlags(session);
  }

  async exit(session) {}

  async _applyFlags(session) {
    if ("debuggingRunning" in this.flags) {
      session.debuggingRunning = this.flags.debuggingRunning;
    }
    if ("debuggingActive" in this.flags) {
      session.debuggingActive = this.flags.debuggingActive;
    }
    if ("autoBreakpointsEnabled" in this.flags) {
      await session._setAutoBreakpointsEnabled(this.flags.autoBreakpointsEnabled);
    }
  }

  async onBreakpointHit(session, info) {
    const PausedState = require("./pausedState");
    await session._transitionTo(new PausedState());
  }

  async onPaused(session) {
    const PausedState = require("./pausedState");
    await session._transitionTo(new PausedState());
  }

  async onEndProgram(session) {
    const TerminatedState = require("./terminatedState");
    await session._transitionTo(new TerminatedState());
  }
}

module.exports = DebugSessionState;
