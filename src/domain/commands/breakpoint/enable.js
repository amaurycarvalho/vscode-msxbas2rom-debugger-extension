const BaseCommand = require("../base");

class EnableBreakpointCommand extends BaseCommand {
  constructor(id) {
    super();
    this.id = id;
  }
  toTCL() {
    return `debug breakpoint configure bp#${this.id} -enabled 1`;
  }
  log() {
    return `enable breakpoint bp#${this.id}`;
  }
}
module.exports = EnableBreakpointCommand;
