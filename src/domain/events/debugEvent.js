const EventEmitter = require("events");

class DebugEvent extends EventEmitter {
  constructor(msx, debugService) {
    super();
    this.msx = msx;
    this.debugService = debugService;

    if (this.msx) {
      this.msx.on("update", (update) => {
        this.handleUpdate(update);
      });
    }
  }

  async handleUpdate(update) {
    if (!update) return null;
    const name = update.name || "";
    const content = update.content || "";

    if (name.includes("cpu") && content.includes("suspended")) {
      let current = null;
      try {
        current = await this.debugService.breakpoint.getCurrent();
      } catch (err) {
        this.emit("error", err);
      }

      if (current && current.id !== undefined && current.address !== undefined) {
        const info = { id: current.id, address: current.address };
        this.emit("breakpointHit", info);
        return { type: "breakpointHit", ...info };
      }

      this.emit("paused");
      return { type: "paused" };
    }

    return null;
  }
}

module.exports = DebugEvent;
