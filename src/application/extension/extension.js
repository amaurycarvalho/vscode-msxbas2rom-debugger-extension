// extension.js

const vscode = require("vscode");
const path = require("path");
const fs = require("fs");

const { DebugAdapterExecutable } = require("vscode");
const {
  MSXBasicSemanticTokensProvider,
  legend,
} = require("../../shared/vscode/semanticTokens");
const Logger = require("../../shared/logger/logger");
const CrashSidecar = require("../../shared/error/crashSidecar");

//--------------------------------------------------
// Logging
//--------------------------------------------------

const outputChannel = vscode.window.createOutputChannel("MSX Debugger");
const promptedWorkspaces = new Set();
const logger = new Logger("extension");
let crashSidecar = null;

function resetPromptedWorkspaces() {
  promptedWorkspaces.clear();
}

function configureLogger() {
  const config = vscode.workspace.getConfiguration("msxDebugger");
  const enableDebugLogs = config.get("enableDebugLogs") === true;
  const enableVerboseLogs = config.get("enableVerboseLogs") === true;
  const logPath = config.get("logPath");

  Logger.configure({
    debugEnabled: enableDebugLogs,
    verboseEnabled: enableVerboseLogs,
    logPath,
    outputChannel,
  });
}

function getLoggerConfig() {
  const config = vscode.workspace.getConfiguration("msxDebugger");
  return {
    enableDebugLogs: config.get("enableDebugLogs") === true,
    enableVerboseLogs: config.get("enableVerboseLogs") === true,
    logPath: config.get("logPath"),
  };
}

async function enforceVerboseDependsOnDebug() {
  const config = vscode.workspace.getConfiguration("msxDebugger");
  const enableDebugLogs = config.get("enableDebugLogs") === true;
  const enableVerboseLogs = config.get("enableVerboseLogs") === true;

  if (enableDebugLogs || !enableVerboseLogs) return;

  const inspected = config.inspect("enableVerboseLogs");
  const vscodeConfig = vscode.ConfigurationTarget;
  let target = vscodeConfig.Global;

  if (inspected && inspected.workspaceFolderValue !== undefined) {
    target = vscodeConfig.WorkspaceFolder;
  } else if (inspected && inspected.workspaceValue !== undefined) {
    target = vscodeConfig.Workspace;
  }

  await config.update("enableVerboseLogs", false, target);
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  configureLogger();
  enforceVerboseDependsOnDebug().catch((err) => {
    logger.warning(`Failed to enforce verbose logging setting: ${err}`);
  });

  if (!crashSidecar) {
    crashSidecar = new CrashSidecar({
      scope: "extensionHost",
      getLogPath: () => Logger.getLogPath(),
      isEnabled: () => Logger.isDebugEnabled(),
      isOwnError: (err, kind) => {
        const stack = err && err.stack ? String(err.stack) : "";
        const message = err && err.message ? String(err.message) : "";
        const haystack = `${stack}\n${message}`;
        return haystack.includes(context.extensionPath);
      },
      output: (msg) => {
        try {
          outputChannel.appendLine(msg);
        } catch (e) {
          // ignore output failures
        }
      },
    });
    crashSidecar.install();
  }

  const configListener = vscode.workspace.onDidChangeConfiguration(async (event) => {
    if (event.affectsConfiguration("msxDebugger")) {
      configureLogger();
      logger.info("Logger configuration updated");

      await enforceVerboseDependsOnDebug();

      const session = vscode.debug.activeDebugSession;
      if (session && session.type === "msx") {
        const { enableDebugLogs, enableVerboseLogs, logPath } = getLoggerConfig();
        session
          .customRequest("msx/setLoggerConfig", {
            enableDebugLogs,
            enableVerboseLogs,
            logPath,
          })
          .catch((err) => {
            logger.warning(`Failed to sync logger config: ${err}`);
          });
      }
    }
  });
  context.subscriptions.push(configListener);

  //--------------------------------------------------
  // Log helpers
  //--------------------------------------------------

  function openLogFile(filePath, label) {
    try {
      if (!fs.existsSync(filePath)) {
        vscode.window.showErrorMessage(
          `${label} not found. Enable logs and retry.`,
        );
        return;
      }
      const uri = vscode.Uri.file(filePath);
      vscode.commands.executeCommand("vscode.open", uri);
    } catch (err) {
      vscode.window.showErrorMessage(
        `Failed to open ${label}: ${err.message}`,
      );
    }
  }

  const openDebugLogCmd = vscode.commands.registerCommand(
    "msx.openDebugLog",
    () => {
      const filePath = Logger.resolveLogFile();
      openLogFile(filePath, "MSX debug log");
    },
  );
  context.subscriptions.push(openDebugLogCmd);

  const openCrashLogCmd = vscode.commands.registerCommand(
    "msx.openCrashLog",
    () => {
      const filePath = CrashSidecar.resolveCrashFile(Logger.getLogPath());
      openLogFile(filePath, "MSX crash log");
    },
  );
  context.subscriptions.push(openCrashLogCmd);

  const openSettingsCmd = vscode.commands.registerCommand(
    "msx.configure",
    () => {
      vscode.commands.executeCommand("workbench.action.openSettings", "msxDebugger");
    },
  );
  context.subscriptions.push(openSettingsCmd);

  //--------------------------------------------------
  // Semantic tokens provider registration
  //--------------------------------------------------

  const selector = { language: "msx-basic" };

  context.subscriptions.push(
    vscode.languages.registerDocumentSemanticTokensProvider(
      selector,
      new MSXBasicSemanticTokensProvider(),
      legend,
    ),
  );

  //--------------------------------------------------
  // Debug Adapter registration
  //--------------------------------------------------

  logger.info("Extension activated");

  const factory = new MSXDebugAdapterDescriptorFactory(context);
  context.subscriptions.push(
    vscode.debug.registerDebugAdapterDescriptorFactory("msx", factory),
  );
  context.subscriptions.push(factory);
  context.subscriptions.push(
    vscode.debug.registerDebugAdapterTrackerFactory(
      "msx",
      new MSXDebugAdapterTrackerFactory(),
    ),
  );

  logger.info("Debug adapter factory registered");

  //--------------------------------------------------
  // Initialize project command
  //--------------------------------------------------

  const initCommand = vscode.commands.registerCommand(
    "msx.initializeProject",
    async function () {
      const folders = vscode.workspace.workspaceFolders;

      if (!folders || folders.length === 0) {
        vscode.window.showErrorMessage(
          "MSXBAS2ROM project initialization requires a workspace folder. Please open a folder first.",
        );
        return;
      }

      const workspacePath = folders[0].uri.fsPath;
      const vscodeDir = path.join(workspacePath, ".vscode");

      if (!fs.existsSync(vscodeDir)) {
        fs.mkdirSync(vscodeDir);
      }

      copyTemplate(context, "launch.json", vscodeDir);
      copyTemplate(context, "tasks.json", vscodeDir);
      copyTemplate(context, ".gitignore", workspacePath);

      vscode.window.showInformationMessage("MSXBAS2ROM project initialized.");
    },
  );
  context.subscriptions.push(initCommand);

  logger.info("Initialize project command executed");

  //--------------------------------------------------
  // Detect missing templates on workspace open
  //--------------------------------------------------

  const workspaceFolders = vscode.workspace.workspaceFolders || [];
  workspaceFolders.forEach((folder) => {
    maybePromptInitialize(context, folder);
  });

  const workspaceListener = vscode.workspace.onDidChangeWorkspaceFolders(
    (event) => {
      event.added.forEach((folder) => {
        maybePromptInitialize(context, folder);
      });
    },
  );
  context.subscriptions.push(workspaceListener);

  //--------------------------------------------------
  // Auto detect BASIC files
  //--------------------------------------------------

  const openListener = vscode.workspace.onDidOpenTextDocument(
    async (document) => {
      const file = document.fileName.toLowerCase();
      if (!file.endsWith(".bas")) return;

      const folders = vscode.workspace.workspaceFolders;

      if (!folders || folders.length === 0) {
        vscode.window.showWarningMessage(
          "MSX BASIC file detected but no workspace folder is open. Please open a folder first.",
        );
        return;
      }

      const workspacePath = folders[0].uri.fsPath;
      const vscodeDir = path.join(workspacePath, ".vscode");
      const launchPath = path.join(vscodeDir, "launch.json");

      if (fs.existsSync(launchPath)) return;

      const action = await vscode.window.showInformationMessage(
        "MSX BASIC file detected. Initialize MSXBAS2ROM project?",
        "Initialize MSXBAS2ROM Project",
      );

      if (action === "Initialize MSXBAS2ROM Project") {
        await vscode.commands.executeCommand("msx.initializeProject");
      }
    },
  );
  context.subscriptions.push(openListener);
}

//--------------------------------------------------
// Template copier
//--------------------------------------------------

function copyTemplate(context, filename, targetDir) {
  const src = path.join(
    context.extensionPath,
    "src",
    "shared",
    "vscode",
    "templates",
    filename,
  );
  const dest = path.join(targetDir, filename);

  if (fs.existsSync(dest)) return;

  try {
    fs.copyFileSync(src, dest);
  } catch (err) {
    vscode.window.showErrorMessage(
      `Failed to copy template ${filename}: ${err.message}`,
    );
  }
}

//--------------------------------------------------
// Workspace prompt helper
//--------------------------------------------------

async function maybePromptInitialize(context, workspaceFolder) {
  if (!workspaceFolder) return;

  const workspacePath = workspaceFolder.uri.fsPath;
  if (promptedWorkspaces.has(workspacePath)) return;

  const vscodeDir = path.join(workspacePath, ".vscode");
  const launchPath = path.join(vscodeDir, "launch.json");
  if (fs.existsSync(launchPath)) return;

  let basFiles = [];
  try {
    basFiles = await vscode.workspace.findFiles(
      new vscode.RelativePattern(workspaceFolder, "**/*.bas"),
      "**/node_modules/**",
      1,
    );
  } catch (err) {
    logger.warning(`Failed to scan workspace for .bas files: ${err}`);
    return;
  }

  if (!basFiles || basFiles.length === 0) return;

  promptedWorkspaces.add(workspacePath);

  const action = await vscode.window.showInformationMessage(
    "MSX BASIC files detected in this workspace. Initialize MSXBAS2ROM project?",
    "Initialize MSXBAS2ROM Project",
  );

  if (action === "Initialize MSXBAS2ROM Project") {
    await vscode.commands.executeCommand("msx.initializeProject");
  }
}

//--------------------------------------------------
// Debug adapter factory
//--------------------------------------------------

class MSXDebugAdapterDescriptorFactory {
  constructor(context) {
    this.context = context;
  }

  createDebugAdapterDescriptor(session) {
    logger.debug("createDebugAdapterDescriptor called");

    const adapterPath = path.join(
      this.context.extensionPath,
      "src",
      "application",
      "adapter",
      "debugAdapter.js",
    );

    logger.debug("Adapter path: " + adapterPath);

    const nodePath = process.execPath || "node";

    return new DebugAdapterExecutable(nodePath, [adapterPath]);
  }

  dispose() {}
}

class MSXDebugAdapterTrackerFactory {
  createDebugAdapterTracker(session) {
    return {
      onDidSendMessage: async (message) => {
        if (message && message.event === "endProgram") {
          const text =
            (message.body && message.body.message) ||
            "End of the user program.";

          const action = await vscode.window.showInformationMessage(
            "End of the user program. Restart?",
            { modal: true },
            "OK",
          );

          if (action === "OK") {
            const folder = session.workspaceFolder || null;
            const config = session.configuration;

            try {
              await vscode.debug.stopDebugging(session);
            } catch (err) {
              logger.warning(`Failed to stop session for restart: ${err}`);
            }

            try {
              await vscode.debug.startDebugging(folder, config);
            } catch (err) {
              logger.warning(`Failed to restart debugging: ${err}`);
            }
          } else {
            try {
              await vscode.debug.stopDebugging(session);
            } catch (err) {
              logger.warning(`Failed to stop debugging: ${err}`);
            }
          }
        }
      },
    };
  }
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
  copyTemplate,
  maybePromptInitialize,
  _test: {
    resetPromptedWorkspaces,
  },
};
