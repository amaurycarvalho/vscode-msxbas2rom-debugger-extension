# VSCode Debugger Extension for MSXBAS2ROM

Debugger for MSX BASIC programs compiled with MSXBAS2ROM.

## Requirements

- [openMSX](https://openmsx.org/)
- [msxbas2rom](https://github.com/amaurycarvalho/msxbas2rom)

## Installation

Download the VSIX file from [Releases](https://github.com/amaurycarvalho/vscode-msxbas2rom-debugger-extension) and install:

code --install-extension msx-debugger.vsix

Or via VSCode:

View → Extensions (CTRL+SHIFT+X) → ... → Install from VSIX

## Usage

1. Compile your program:

msxbas2rom test.bas

2. Start debugging:

F5

## Features

- Breakpoints in BASIC lines
- Variable watch
- Step execution
- Integration with openMSX
