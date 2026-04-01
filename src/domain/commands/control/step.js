const BaseCommand = require("../base");

class StepControlCommand extends BaseCommand {
  toTCL() {
    return "debug step";
  }
  log() {
    return `step control command`;
  }
}
module.exports = StepControlCommand;
