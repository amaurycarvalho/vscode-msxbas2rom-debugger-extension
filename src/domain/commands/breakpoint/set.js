const BaseCommand = require("../base");
const { formatBreakpointCondition } = require("../../../shared/address/addressUtils");

class SetBreakpointCommand extends BaseCommand {
  constructor(addr, segment) {
    super();
    this.addr = addr;
    this.segment = segment;
  }
  toTCL() {
    const condition = formatBreakpointCondition(this.segment);
    return `debug breakpoint create -address 0x${this.addr.toString(16)}${condition}`;
  }
  parse(r) {
    const m = r.match(/bp#(\d+)/);
    return m ? parseInt(m[1]) : null;
  }
  log() {
    return `set breakpoint at address 0x${this.addr.toString(16)}` +
      (this.segment !== null && this.segment !== undefined
        ? ` (segment 0x${this.segment.toString(16)})`
        : "");
  }
}
module.exports = SetBreakpointCommand;
