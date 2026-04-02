const BaseCommand = require("../base");

class GetCurrentBreakpointCommand extends BaseCommand {
  toTCL() {
    return 'set bps [debug breakpoint list] ; set i [lsearch -regexp $bps "-address [reg PC]"] ; list [lindex $bps [expr {$i - 1}]] [lindex $bps $i]';
  }
  parse(r) {
    if (!r) return null;
    const text = r.toString();
    const match = text.match(/bp#(\d+)\s+\{\s*-address\s+([0-9a-fA-Fx]+)/);
    if (!match) return null;
    const id = parseInt(match[1], 10);
    const address = parseInt(match[2], 0);
    if (Number.isNaN(id) || Number.isNaN(address)) return null;
    return { id, address };
  }
  log() {
    return `get current breakpoint`;
  }
}
module.exports = GetCurrentBreakpointCommand;
