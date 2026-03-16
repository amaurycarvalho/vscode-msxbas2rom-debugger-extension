// extension.js

const vscode = require("vscode");
const path = require("path");
const fs = require("fs");

const { DebugAdapterExecutable } = require("vscode");

const log = vscode.window.createOutputChannel("MSX Debugger");

function logMsg(msg) {
  log.appendLine(`[EXT] ${msg}`);
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  //--------------------------------------------------
  // Debug Adapter registration
  //--------------------------------------------------

  logMsg("Extension activated");

  const factory = new MSXDebugAdapterDescriptorFactory(context);
  context.subscriptions.push(
    vscode.debug.registerDebugAdapterDescriptorFactory("msx", factory),
  );
  context.subscriptions.push(factory);

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

      vscode.window.showInformationMessage("MSXBAS2ROM project initialized.");
    },
  );
  context.subscriptions.push(initCommand);

  logMsg("Initialize project command executed");

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

    logMsg("Node path: " + nodePath);

    return new DebugAdapterExecutable(nodePath, [adapterPath]);
  }

  dispose() {}
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
