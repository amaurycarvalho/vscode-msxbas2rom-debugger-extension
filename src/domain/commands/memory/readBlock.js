const BaseCommand = require("../base");

class ReadBlockMemoryCommand extends BaseCommand {
  constructor(addr, size) {
    super();
    this.addr = addr;
    this.size = size;
  }
  toTCL() {
    return `debug read_block {Main RAM} 0x${this.addr.toString(16)} ${this.size}`;
  }
  parse(r) {
    const text = r?.toString?.() ?? "";
    return Buffer.from(text, "latin1");
  }
  log() {
    return `read_block address ${this.addr} size ${this.size}`;
  }
}
module.exports = ReadBlockMemoryCommand;
