const BaseCommand = require("../base");

class Peek16MemoryCommand extends BaseCommand {
  constructor(addr) {
    super();
    this.addr = addr;
  }
  toTCL() {
    return `peek16 0x${this.addr.toString(16)}`;
  }
  parse(r) {
    return this.toInt(r);
  }
  log() {
    return `peek16 address ${this.addr}`;
  }
}
module.exports = Peek16MemoryCommand;
