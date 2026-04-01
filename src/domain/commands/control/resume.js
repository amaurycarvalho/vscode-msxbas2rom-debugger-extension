const BaseCommand = require("../base");

class ResumeControlCommand extends BaseCommand {
  toTCL() {
    return "debug cont";
  }
  log() {
    return `resume control command`;
  }
}
module.exports = ResumeControlCommand;
