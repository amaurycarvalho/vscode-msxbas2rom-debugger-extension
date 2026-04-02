const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const Module = require("node:module");

process.env.NODE_PATH = path.join(__dirname, "stubs");
Module._initPaths();

const vscode = require("vscode");
const extension = require("../../src/application/extension/extension");

test("copyTemplate copies missing file", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ext-"));
  const extPath = path.join(tmpDir, "ext");
  const tplDir = path.join(extPath, "src", "shared", "vscode", "templates");
  const workspaceDir = path.join(tmpDir, "workspace");

  fs.mkdirSync(tplDir, { recursive: true });
  fs.mkdirSync(workspaceDir, { recursive: true });

  fs.writeFileSync(path.join(tplDir, "launch.json"), "TEMPLATE", "utf8");

  extension.copyTemplate(
    { extensionPath: extPath },
    "launch.json",
    workspaceDir,
  );

  const dest = path.join(workspaceDir, "launch.json");
  assert.equal(fs.readFileSync(dest, "utf8"), "TEMPLATE");
});

test("copyTemplate does not overwrite existing file", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ext-"));
  const extPath = path.join(tmpDir, "ext");
  const tplDir = path.join(extPath, "src", "templates");
  const workspaceDir = path.join(tmpDir, "workspace");

  fs.mkdirSync(tplDir, { recursive: true });
  fs.mkdirSync(workspaceDir, { recursive: true });

  fs.writeFileSync(path.join(tplDir, "launch.json"), "TEMPLATE", "utf8");
  fs.writeFileSync(path.join(workspaceDir, "launch.json"), "EXISTING", "utf8");

  extension.copyTemplate(
    { extensionPath: extPath },
    "launch.json",
    workspaceDir,
  );

  const dest = path.join(workspaceDir, "launch.json");
  assert.equal(fs.readFileSync(dest, "utf8"), "EXISTING");
});

test("maybePromptInitialize executes command when .bas exists", async () => {
  extension._test.resetPromptedWorkspaces();

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ws-"));
  const workspaceFolder = { uri: { fsPath: tmpDir } };

  let executeCalls = [];
  vscode.commands.executeCommand = async (cmd) => {
    executeCalls.push(cmd);
  };

  vscode.workspace.findFiles = async () => [path.join(tmpDir, "main.bas")];
  vscode.window.showInformationMessage = async () =>
    "Initialize MSXBAS2ROM Project";

  await extension.maybePromptInitialize({}, workspaceFolder);

  assert.deepEqual(executeCalls, ["msx.initializeProject"]);
});

test("maybePromptInitialize skips when no .bas files", async () => {
  extension._test.resetPromptedWorkspaces();

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ws-"));
  const workspaceFolder = { uri: { fsPath: tmpDir } };

  let prompted = false;
  vscode.workspace.findFiles = async () => [];
  vscode.window.showInformationMessage = async () => {
    prompted = true;
  };

  await extension.maybePromptInitialize({}, workspaceFolder);

  assert.equal(prompted, false);
});

test("maybePromptInitialize skips when launch.json exists", async () => {
  extension._test.resetPromptedWorkspaces();

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ws-"));
  const vscodeDir = path.join(tmpDir, ".vscode");
  fs.mkdirSync(vscodeDir, { recursive: true });
  fs.writeFileSync(path.join(vscodeDir, "launch.json"), "{}", "utf8");

  const workspaceFolder = { uri: { fsPath: tmpDir } };

  let prompted = false;
  vscode.workspace.findFiles = async () => [path.join(tmpDir, "main.bas")];
  vscode.window.showInformationMessage = async () => {
    prompted = true;
  };

  await extension.maybePromptInitialize({}, workspaceFolder);

  assert.equal(prompted, false);
});

test("maybePromptInitialize prompts only once per workspace", async () => {
  extension._test.resetPromptedWorkspaces();

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ws-"));
  const workspaceFolder = { uri: { fsPath: tmpDir } };

  let promptCount = 0;
  vscode.workspace.findFiles = async () => [path.join(tmpDir, "main.bas")];
  vscode.window.showInformationMessage = async () => {
    promptCount += 1;
    return "Initialize MSXBAS2ROM Project";
  };
  vscode.commands.executeCommand = async () => {};

  await extension.maybePromptInitialize({}, workspaceFolder);
  await extension.maybePromptInitialize({}, workspaceFolder);

  assert.equal(promptCount, 1);
});

test("restart debugging when endProgram accepted", async () => {
  const calls = {
    stop: 0,
    start: 0,
  };

  vscode.window.showInformationMessage = async () => "OK";
  vscode.debug.stopDebugging = async () => {
    calls.stop += 1;
  };
  vscode.debug.startDebugging = async () => {
    calls.start += 1;
  };

  let trackerFactory = null;
  vscode.debug.registerDebugAdapterTrackerFactory = (type, factory) => {
    trackerFactory = factory;
    return { dispose() {} };
  };

  const context = { extensionPath: "/tmp/ext", subscriptions: [] };
  extension.activate(context);

  const session = {
    workspaceFolder: { uri: { fsPath: "/tmp/ws" } },
    configuration: { name: "test" },
  };

  const tracker = trackerFactory.createDebugAdapterTracker(session);

  await tracker.onDidSendMessage({ event: "endProgram", body: {} });

  assert.equal(calls.stop, 1);
  assert.equal(calls.start, 1);
});

test("stop debugging when endProgram declined", async () => {
  const calls = {
    stop: 0,
    start: 0,
  };

  vscode.window.showInformationMessage = async () => undefined;
  vscode.debug.stopDebugging = async () => {
    calls.stop += 1;
  };
  vscode.debug.startDebugging = async () => {
    calls.start += 1;
  };

  let trackerFactory = null;
  vscode.debug.registerDebugAdapterTrackerFactory = (type, factory) => {
    trackerFactory = factory;
    return { dispose() {} };
  };

  const context = { extensionPath: "/tmp/ext", subscriptions: [] };
  extension.activate(context);

  const session = {
    workspaceFolder: { uri: { fsPath: "/tmp/ws" } },
    configuration: { name: "test" },
  };

  const tracker = trackerFactory.createDebugAdapterTracker(session);

  await tracker.onDidSendMessage({ event: "endProgram", body: {} });

  assert.equal(calls.stop, 1);
  assert.equal(calls.start, 0);
});
