// extension.js

const vscode = require("vscode");
const path = require("path");
const fs = require("fs");

const { DebugAdapterExecutable } = require("vscode");
const { BADFLAGS } = require("dns");

function activate(context) {
  //--------------------------------------------------
  // Debug Adapter registration
  //--------------------------------------------------

  const factory = new MSXDebugAdapterDescriptorFactory(context);

  context.subscriptions.push(
    vscode.debug.registerDebugAdapterDescriptorFactory("msx", factory),
  );

  context.subscriptions.push(factory);

  //--------------------------------------------------
  // Initialize project command
  //--------------------------------------------------

  const initCommand = vscode.commands.registerCommand(
    "msx.initializeProject",
    async function () {
      const folders = vscode.workspace.workspaceFolders;

      if (!folders || folders.length === 0) {
        vscode.window.showErrorMessage("Open a workspace folder first.");

        return;
      }

      const workspacePath = folders[0].uri.fsPath;

      const vscodeDir = path.join(workspacePath, ".vscode");

      if (!fs.existsSync(vscodeDir)) {
        fs.mkdirSync(vscodeDir);
      }

      copyTemplate(context, "launch.json", vscodeDir);
      copyTemplate(context, "tasks.json", vscodeDir);

      vscode.window.showInformationMessage("MSX project initialized.");
    },
  );

  context.subscriptions.push(initCommand);

  //--------------------------------------------------
  // Auto detect BASIC files
  //--------------------------------------------------

  const openListener = vscode.workspace.onDidOpenTextDocument(
    async (document) => {
      const file = document.fileName.toLowerCase();

      if (!file.endsWith(".bas")) return;

      const folders = vscode.workspace.workspaceFolders;

      if (!folders) return;

      const workspacePath = folders[0].uri.fsPath;

      const vscodeDir = path.join(workspacePath, ".vscode");

      const launchPath = path.join(vscodeDir, "launch.json");

      if (fs.existsSync(launchPath)) return;

      const action = await vscode.window.showInformationMessage(
        "MSX BASIC file detected. Initialize MSX project?",

        "Initialize MSX Project",
      );

      if (action === "Initialize MSX Project") {
        vscode.commands.executeCommand("msx.initializeProject");
      }
    },
  );

  context.subscriptions.push(openListener);
}

function deactivate() {}

//--------------------------------------------------
// Template copier
//--------------------------------------------------

function copyTemplate(context, filename, targetDir) {
  const src = path.join(context.extensionPath, "src", "templates", filename);
  const dest = path.join(targetDir, filename);

  if (fs.existsSync(dest)) return;

  fs.copyFileSync(src, dest);
}

//--------------------------------------------------
// Debug adapter factory
//--------------------------------------------------

class MSXDebugAdapterDescriptorFactory {
  constructor(context) {
    this.context = context;
  }

  createDebugAdapterDescriptor(session) {
    const adapterPath = path.join(
      this.context.extensionPath,
      "debugAdapter.js",
    );

    const nodePath = process.execPath;

    return new DebugAdapterExecutable(nodePath, [adapterPath]);
  }

  dispose() {}
}

module.exports = {
  activate,
  deactivate,
};
