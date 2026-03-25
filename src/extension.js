// extension.js

const vscode = require("vscode");
const path = require("path");
const fs = require("fs");

const { DebugAdapterExecutable } = require("vscode");
const { MSXBasicSemanticTokensProvider, legend } = require("./semanticTokens");

//--------------------------------------------------
// Logging
//--------------------------------------------------

const log = vscode.window.createOutputChannel("MSX Debugger");
const promptedWorkspaces = new Set();

function resetPromptedWorkspaces() {
  promptedWorkspaces.clear();
}

function logMsg(msg) {
  if (!isDebugEnabled()) return;

  const timestamp = Date.now();
  const dateObject = new Date(timestamp);
  const isoString = dateObject.toISOString();

  log.appendLine(`${isoString} [extension] ${msg}`);
}

function isDebugEnabled() {
  return vscode.workspace
    .getConfiguration("msxDebugger")
    .get("enableDebugLogs", "false");
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
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

  logMsg("Extension activated");

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

  logMsg("Debug adapter factory registered");

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

  logMsg("Initialize project command executed");

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
  const src = path.join(context.extensionPath, "src", "templates", filename);
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
    logMsg(`Failed to scan workspace for .bas files: ${err}`);
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
    logMsg("createDebugAdapterDescriptor called");

    const adapterPath = path.join(
      this.context.extensionPath,
      "src",
      "debugAdapter.js",
    );

    logMsg("Adapter path: " + adapterPath);

    const nodePath = "node";

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
              logMsg(`Failed to stop session for restart: ${err}`);
            }

            try {
              await vscode.debug.startDebugging(folder, config);
            } catch (err) {
              logMsg(`Failed to restart debugging: ${err}`);
            }
          } else {
            try {
              await vscode.debug.stopDebugging(session);
            } catch (err) {
              logMsg(`Failed to stop debugging: ${err}`);
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
