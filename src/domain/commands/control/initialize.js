const BaseCommand = require("../base");

class InitializeControlCommand extends BaseCommand {
  toTCL() {
    return (
      "openmsx_update enable status; " +
      "set renderer SDLGL-PP; " +
      "set power on"
    );
  }
  log() {
    return `initialize control command`;
  }
}
module.exports = InitializeControlCommand;
