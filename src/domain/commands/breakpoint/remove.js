const BaseCommand = require("../base");

class RemoveBreakpointCommand extends BaseCommand {
  constructor(id) {
    super();
    this.id = id;
  }
  toTCL() {
    return `debug remove_bp bp#${this.id}`;
  }
  log() {
    return `remove breakpoint bp#${this.id}`;
  }
}
module.exports = RemoveBreakpointCommand;
