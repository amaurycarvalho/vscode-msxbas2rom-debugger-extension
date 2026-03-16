# VSCode Debugger Extension for MSXBAS2ROM

Debugger for MSX BASIC programs compiled with MSXBAS2ROM.

## Requirements

- [VSCode](https://code.visualstudio.com/)
- [openMSX](https://openmsx.org/)
- [msxbas2rom](https://github.com/amaurycarvalho/msxbas2rom)

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
3. Initialize the project: `ctrl+shift+P → Show and Run Commands → MSXBAS2ROM: Initialize Project`;
4. Open one of the MSX BASIC files;
5. Test it with F5.

## Features

- Breakpoints in BASIC lines
- Variable watch
- Step execution
- Integration with openMSX
