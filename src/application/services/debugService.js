const {
  breakpoint: {
    SetBreakpointCommand,
    RemoveBreakpointCommand,
    GetCurrentBreakpointCommand,
    EnableAllBreakpointsCommand,
    DisableAllBreakpointsCommand,
    EnableBreakpointCommand,
    DisableBreakpointCommand,
    CreateOnceBreakpointCommand,
  },
  control: {
    InitializeControlCommand,
    PauseControlCommand,
    ResumeControlCommand,
    StepControlCommand,
  },
  memory: {
    PeekMemoryCommand,
    Peek16MemoryCommand,
    PeekS16MemoryCommand,
    ReadBlockMemoryCommand,
  },
  register: { GetRegisterCommand },
} = require("../../domain/commands");

class ControlDebugService {
  constructor(msx) {
    this.msx = msx;
    this.initializeCommand = new InitializeControlCommand();
    this.resumeCommand = new ResumeControlCommand();
    this.pauseCommand = new PauseControlCommand();
    this.stepCommand = new StepControlCommand();
  }
  async _execute(command) {
    const raw = await this.msx.send(command.toTCL());
    return command.parse(raw);
  }
  initialize() {
    return this._execute(this.initializeCommand);
  }
  async resume() {
    return await this._execute(this.resumeCommand);
  }
  async pause() {
    return await this._execute(this.pauseCommand);
  }
  async step() {
    return await this._execute(this.stepCommand);
  }
}

class BreakpointDebugService {
  constructor(msx) {
    this.msx = msx;
    this.getCurrentBreakpointCommand = new GetCurrentBreakpointCommand();
    this.enableAllBreakpointsCommand = new EnableAllBreakpointsCommand();
    this.disableAllBreakpointsCommand = new DisableAllBreakpointsCommand();
  }
  async _execute(command) {
    const raw = await this.msx.send(command.toTCL());
    return command.parse(raw);
  }
  async set(a) {
    return await this._execute(new SetBreakpointCommand(a));
  }
  async remove(id) {
    return await this._execute(new RemoveBreakpointCommand(id));
  }
  async createOnce(a) {
    return await this._execute(new CreateOnceBreakpointCommand(a));
  }
  async getCurrent() {
    return await this._execute(this.getCurrentBreakpointCommand);
  }
  async enable(id) {
    return await this._execute(new EnableBreakpointCommand(id));
  }
  async disable(id) {
    return await this._execute(new DisableBreakpointCommand(id));
  }
  async enableAll() {
    return await this._execute(this.enableAllBreakpointsCommand);
  }
  async disableAll() {
    return await this._execute(this.disableAllBreakpointsCommand);
  }
}

class MemoryDebugService {
  constructor(msx) {
    this.msx = msx;
  }
  async _execute(command) {
    const raw = await this.msx.send(command.toTCL());
    return command.parse(raw);
  }
  async peek(a) {
    return await this._execute(new PeekMemoryCommand(a));
  }
  async peek16(a) {
    return await this._execute(new Peek16MemoryCommand(a));
  }
  async peekS16(a) {
    return await this._execute(new PeekS16MemoryCommand(a));
  }
  async readBlock(address, size) {
    return await this._execute(new ReadBlockMemoryCommand(address, size));
  }
}

class RegisterDebugService {
  constructor(msx) {
    this.msx = msx;
  }
  async _execute(command) {
    const raw = await this.msx.send(command.toTCL());
    return command.parse(raw);
  }
  async get(n) {
    return await this._execute(new GetRegisterCommand(n));
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
