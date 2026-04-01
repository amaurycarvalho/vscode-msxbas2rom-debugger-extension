const BaseCommand = require("../base");

class GetRegisterCommand extends BaseCommand {
  constructor(name) {
    super();
    this.name = name;
  }
  toTCL() {
    return `reg ${this.name}`;
  }
  parse(r) {
    return this.toInt(r);
  }
  log() {
    return `get register ${this.name}`;
  }
}
module.exports = GetRegisterCommand;
