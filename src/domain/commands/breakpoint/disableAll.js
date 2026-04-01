const BaseCommand = require("../base");

class DisableAllBreakpointsCommand extends BaseCommand {
  toTCL() {
    return `foreach {id config} [debug breakpoint list] { debug breakpoint configure $id -enabled 0 }`;
  }
  log() {
    return `disable all breakpoints`;
  }
}
module.exports = DisableAllBreakpointsCommand;
