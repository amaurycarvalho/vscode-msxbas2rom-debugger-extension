const BaseCommand = require("../base");

class EnableAllBreakpointsCommand extends BaseCommand {
  toTCL() {
    return `foreach {id config} [debug breakpoint list] { debug breakpoint configure $id -enabled 1 }`;
  }
  log() {
    return `enable all breakpoints`;
  }
}
module.exports = EnableAllBreakpointsCommand;
