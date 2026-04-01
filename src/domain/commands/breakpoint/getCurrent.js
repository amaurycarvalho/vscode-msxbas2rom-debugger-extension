const BaseCommand = require("../base");

class GetCurrentBreakpointCommand extends BaseCommand {
  toTCL() {
    return 'set bps [debug breakpoint list] ; set i [lsearch -regexp $bps "-address [reg PC]"] ; list [lindex $bps [expr {$i - 1}]] [lindex $bps $i]';
  }
  parse(r) {
    return this.toInt(r);
  }
  log() {
    return `get current breakpoint`;
  }
}
module.exports = GetCurrentBreakpointCommand;
