const BaseCommand = require("../base");

class DisableBreakpointCommand extends BaseCommand {
  constructor(id) {
    super();
    this.id = id;
  }
  toTCL() {
    return `debug breakpoint configure bp#${this.id} -enabled 0`;
  }
  log() {
    return `disable breakpoint bp#${this.id}`;
  }
}
module.exports = DisableBreakpointCommand;
