class BaseCommand {
  toTCL() {
    return "";
  }
  parse(r) {
    return r?.toString?.() ?? "";
  }
  toInt(r) {
    const m = r.match(/-?\d+/);
    return m ? parseInt(m[0]) : 0;
  }
  log() {
    return "command: " + this.toTCL();
  }
}
module.exports = BaseCommand;
