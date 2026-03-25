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

const workspace = {
  workspaceFolders: [],
  getConfiguration: () => ({ get: () => false }),
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
  RelativePattern,
  SemanticTokensLegend,
  SemanticTokensBuilder,
};

