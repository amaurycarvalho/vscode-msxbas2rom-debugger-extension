class DebugEvent {
  handleUpdate(update) {
    if (update.name.includes("cpu") && update.content.includes("suspended")) {
      return { type: "paused" };
    }
    return null;
  }
}
module.exports = DebugEvent;
