const SetBreakpointCommand = require("../../domain/commands/breakpoint/set");
const RemoveBreakpointCommand = require("../../domain/commands/breakpoint/remove");
const GetCurrentBreakpointCommand = require("../../domain/commands/breakpoint/getCurrent");
const EnableAllBreakpointsCommand = require("../../domain/commands/breakpoint/enableAll");
const DisableAllBreakpointsCommand = require("../../domain/commands/breakpoint/disableAll");
const EnableBreakpointCommand = require("../../domain/commands/breakpoint/enable");
const DisableBreakpointCommand = require("../../domain/commands/breakpoint/disable");
const InitializeControlCommand = require("../../domain/commands/control/initialize");
const PauseControlCommand = require("../../domain/commands/control/pause");
const ResumeControlCommand = require("../../domain/commands/control/resume");
const StepControlCommand = require("../../domain/commands/control/step");
const PeekMemoryCommand = require("../../domain/commands/memory/peek");
const Peek16MemoryCommand = require("../../domain/commands/memory/peek16");
const GetRegisterCommand = require("../../domain/commands/register/get");

class ControlDebugService {
  constructor(msx) {
    this.msx = msx;
    this.initializeCommand = new InitializeControlCommand();
    this.resumeCommand = new ResumeControlCommand();
    this.pauseCommand = new PauseControlCommand();
    this.stepCommand = new StepControlCommand();
  }
  initialize() {
    return this.msx.execute(this.initializeCommand);
  }
  async resume() {
    return await this.msx.execute(this.resumeCommand);
  }
  async pause() {
    return await this.msx.execute(this.pauseCommand);
  }
  async step() {
    return await this.msx.execute(this.stepCommand);
  }
}

class BreakpointDebugService {
  constructor(msx) {
    this.msx = msx;
    this.getCurrentBreakpointCommand = new GetCurrentBreakpointCommand();
    this.enableAllBreakpointsCommand = new EnableAllBreakpointsCommand();
    this.disableAllBreakpointsCommand = new DisableAllBreakpointsCommand();
  }
  async set(a) {
    return await this.msx.execute(new SetBreakpointCommand(a));
  }
  async remove(id) {
    return await this.msx.execute(new RemoveBreakpointCommand(id));
  }
  async getCurrent() {
    return await this.msx.execute(this.getCurrentBreakpointCommand);
  }
  async enable(id) {
    return await this.msx.execute(new EnableBreakpointCommand(id));
  }
  async disable(id) {
    return await this.msx.execute(new DisableBreakpointCommand(id));
  }
  async enableAll() {
    return await this.msx.execute(this.enableAllBreakpointsCommand);
  }
  async disableAll() {
    return await this.msx.execute(this.disableAllBreakpointsCommand);
  }
}

class MemoryDebugService {
  constructor(msx) {
    this.msx = msx;
  }
  async peek(a) {
    return await this.msx.execute(new PeekMemoryCommand(a));
  }
  async peek16(a) {
    return await this.msx.execute(new Peek16MemoryCommand(a));
  }
}

class RegisterDebugService {
  constructor(msx) {
    this.msx = msx;
  }
  async get(n) {
    return await this.msx.execute(new GetRegisterCommand(n));
  }
}

class DebugService {
  constructor(msx) {
    this.msx = msx;
    this.control = new ControlDebugService(msx);
    this.breakpoint = new BreakpointDebugService(msx);
    this.memory = new MemoryDebugService(msx);
    this.register = new RegisterDebugService(msx);
  }
}

module.exports = DebugService;
