const BaseCommand = require("../base");

class PeekS16MemoryCommand extends BaseCommand {
  constructor(addr) {
    super();
    this.addr = addr;
  }
  toTCL() {
    return `peek_s16 0x${this.addr.toString(16)}`;
  }
  parse(r) {
    return this.toInt(r);
  }
  log() {
    return `peek_s16 address ${this.addr}`;
  }
}
module.exports = PeekS16MemoryCommand;
