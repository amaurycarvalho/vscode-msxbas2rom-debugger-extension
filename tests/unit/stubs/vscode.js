class Disposable {
  dispose() {}
}

class SemanticTokensLegend {
  constructor(tokenTypes) {
    this.tokenTypes = tokenTypes;
  }
}

class SemanticTokensBuilder {
  constructor(legend) {
    this.legend = legend;
    this.tokens = [];
  }

  push(line, char, length, tokenType, tokenModifiers) {
    this.tokens.push({ line, char, length, tokenType, tokenModifiers });
  }

  build() {
    return this.tokens;
  }
}

class RelativePattern {
  constructor(base, pattern) {
    this.base = base;
    this.pattern = pattern;
  }
}

const window = {
  createOutputChannel() {
    return { appendLine() {} };
  },
  showErrorMessage: async () => undefined,
  showWarningMessage: async () => undefined,
  showInformationMessage: async () => undefined,
};

const _configStore = new Map();

const workspace = {
  workspaceFolders: [],
  getConfiguration: () => ({
    get: (key) => _configStore.get(key),
    update: async (key, value) => {
      _configStore.set(key, value);
    },
    inspect: (key) => ({
      globalValue: _configStore.get(key),
      workspaceValue: undefined,
      workspaceFolderValue: undefined,
    }),
  }),
  onDidChangeConfiguration: () => new Disposable(),
  onDidOpenTextDocument: () => new Disposable(),
  onDidChangeWorkspaceFolders: () => new Disposable(),
  findFiles: async () => [],
};

const languages = {
  registerDocumentSemanticTokensProvider: () => new Disposable(),
};

const debug = {
  registerDebugAdapterDescriptorFactory: () => new Disposable(),
  registerDebugAdapterTrackerFactory: () => new Disposable(),
  stopDebugging: async () => {},
  startDebugging: async () => {},
};

const commands = {
  registerCommand: () => new Disposable(),
  executeCommand: async () => {},
};

module.exports = {
  window,
  workspace,
  languages,
  debug,
  commands,
  ConfigurationTarget: {
    Global: 1,
    Workspace: 2,
    WorkspaceFolder: 3,
  },
  RelativePattern,
  SemanticTokensLegend,
  SemanticTokensBuilder,
};
