const BaseCommand = require("../base");

class PauseControlCommand extends BaseCommand {
  toTCL() {
    return "debug break";
  }
  log() {
    return `pause control command`;
  }
}
module.exports = PauseControlCommand;
