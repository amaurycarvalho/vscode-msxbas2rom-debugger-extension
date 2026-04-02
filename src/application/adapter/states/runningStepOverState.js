const DebugSessionState = require("./debugSessionState");
const PausedState = require("./pausedState");

class RunningStepOverState extends DebugSessionState {
  constructor({ startSp }) {
    super("running-stepover", {
      debuggingRunning: true,
      debuggingActive: true,
      autoBreakpointsEnabled: true,
    });
    this.startSp = startSp;
    this.stepChecked = false;
  }

  async onBreakpointHit(session, info) {
    await this._handleStop(session, info);
  }

  async _handleStop(session, info) {
    if (this.stepChecked) {
      await session._transitionTo(new PausedState());
      return;
    }

    this.stepChecked = true;

    if (!session.cmd || !session.cmd.register) {
      await session._transitionTo(new PausedState());
      return;
    }

    let currentSp = null;
    try {
      currentSp = await session.cmd.register.get("SP");
    } catch (err) {
      await session._transitionTo(new PausedState());
      return;
    }

    const meta = info ? info.meta : null;
    const hitUserBreakpoint = meta && meta.kind === "user";
    const shouldStepOut =
      !hitUserBreakpoint &&
      this.startSp !== null &&
      this.startSp !== undefined &&
      currentSp !== null &&
      currentSp !== undefined &&
      currentSp < this.startSp;

    if (!shouldStepOut) {
      await session._transitionTo(new PausedState());
      return;
    }

    const started = await session._startStepOutTransition();
    if (!started) {
      await session._transitionTo(new PausedState());
    }
  }
}

module.exports = RunningStepOverState;
