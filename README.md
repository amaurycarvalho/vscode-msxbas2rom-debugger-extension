# VSCode Debugger Extension for MSXBAS2ROM

Debugger for MSX-BASIC programs compiled with MSXBAS2ROM.

## Requirements

- [VSCode](https://code.visualstudio.com/)
- [openMSX (>=21.0)](https://openmsx.org/)
- [msxbas2rom (>=0.3.3.9)](https://github.com/amaurycarvalho/msxbas2rom)

## Installation

Download the VSIX file from [Releases](https://github.com/amaurycarvalho/vscode-msxbas2rom-debugger-extension) and install:

```bash
code --install-extension msxbas2rom-debugger-_version_.vsix
```

Or via VSCode:

```
View → Extensions (CTRL+SHIFT+X) → ... → Install from VSIX
```

## Usage

1. Open VSCode and select your project folder;
2. Configure emulator and compiler paths: `File → Preferences → Settings (ctrl+,) → Extensions → MSXBAS2ROM Debugger`;  
   if you use openMSX installed from flathub: `flatpak run org.openmsx.openMSX`.
3. Optional logging settings: `msxDebugger.enableDebugLogs` enables logging to the output channel and `msx-debug.log`; `msxDebugger.enableVerboseLogs` enables detailed protocol/memory logs; `msxDebugger.logPath` sets the folder that will contain `msx-debug.log` (default `%TEMP%` on Windows and `/tmp` on other systems).
4. Initialize the project: `ctrl+shift+P → Show and Run Commands → MSXBAS2ROM: Initialize Project`;
5. Open one of the MSX BASIC files;
6. Test it with F5.

## Features

- Breakpoints in MSX-BASIC lines;
- Variables contents;
- Step execution;
- Integration with openMSX.
