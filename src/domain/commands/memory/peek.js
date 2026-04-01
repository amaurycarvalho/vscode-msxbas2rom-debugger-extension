const BaseCommand = require("../base");

class PeekMemoryCommand extends BaseCommand {
  constructor(addr) {
    super();
    this.addr = addr;
  }
  toTCL() {
    return `peek 0x${this.addr.toString(16)}`;
  }
  parse(r) {
    return this.toInt(r);
  }
  log() {
    return `peek address ${this.addr}`;
  }
}
module.exports = PeekMemoryCommand;
