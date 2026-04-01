const BaseCommand = require("../base");

class CreateOnceBreakpointCommand extends BaseCommand {
  constructor(addr) {
    super();
    this.addr = addr;
  }
  toTCL() {
    return `debug breakpoint create -address ${this.addr} -once 1`;
  }
  parse(r) {
    const m = r.match(/bp#(\d+)/);
    return m ? parseInt(m[1], 10) : null;
  }
  log() {
    return `create once breakpoint at address ${this.addr}`;
  }
}

module.exports = CreateOnceBreakpointCommand;
