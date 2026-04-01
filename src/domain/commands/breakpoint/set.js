const BaseCommand = require("../base");

class SetBreakpointCommand extends BaseCommand {
  constructor(addr) {
    super();
    this.addr = addr;
  }
  toTCL() {
    return `debug set_bp ${this.addr}`;
  }
  parse(r) {
    const m = r.match(/bp#(\d+)/);
    return m ? parseInt(m[1]) : null;
  }
  log() {
    return `set breakpoint to address ${this.addr}`;
  }
}
module.exports = SetBreakpointCommand;
