const breakpoint = {
  SetBreakpointCommand: require("./breakpoint/set"),
  RemoveBreakpointCommand: require("./breakpoint/remove"),
  GetCurrentBreakpointCommand: require("./breakpoint/getCurrent"),
  EnableAllBreakpointsCommand: require("./breakpoint/enableAll"),
  DisableAllBreakpointsCommand: require("./breakpoint/disableAll"),
  EnableBreakpointCommand: require("./breakpoint/enable"),
  DisableBreakpointCommand: require("./breakpoint/disable"),
  CreateOnceBreakpointCommand: require("./breakpoint/createOnce"),
};

const control = {
  InitializeControlCommand: require("./control/initialize"),
  PauseControlCommand: require("./control/pause"),
  ResumeControlCommand: require("./control/resume"),
  StepControlCommand: require("./control/step"),
};

const memory = {
  PeekMemoryCommand: require("./memory/peek"),
  Peek16MemoryCommand: require("./memory/peek16"),
  PeekS16MemoryCommand: require("./memory/peekS16"),
  ReadBlockMemoryCommand: require("./memory/readBlock"),
};

const register = {
  GetRegisterCommand: require("./register/get"),
};

module.exports = {
  breakpoint,
  control,
  memory,
  register,
};
