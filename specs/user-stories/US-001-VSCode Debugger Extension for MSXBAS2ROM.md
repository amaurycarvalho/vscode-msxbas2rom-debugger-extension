# US-001 - Breakpoints and Step-by-Step Debugging for MSXBAS2ROM

## Story

As an MSX-BASIC developer, I want to place breakpoints and step through MSXBAS2ROM-compiled programs inside VSCode using the openMSX emulator so that I can control execution precisely while debugging.

## Acceptance Criteria

- Breakpoints can be created at any code line.
- Compiled code can be executed step by step in the VSCode IDE while emulated by openMSX.

## BDD Scenarios

### Scenario 1: Breakpoint stops execution at a source line

Given a MSXBAS2ROM-compiled program is loaded in openMSX
And a debug session is started in VSCode
When I set a breakpoint on a specific source line
And I start or continue execution
Then execution stops at that line in the VSCode editor
And the current line is highlighted as the active statement

### Scenario 2: Step-by-step execution in VSCode controls the emulator

Given a debug session is running and execution is paused
When I step over, step into, or step out in VSCode
Then the program advances one statement according to the chosen step action
And the emulator state remains consistent with the current source line

## Technical specification

Use the following guidelines.

- The extension uses `stdio` (or `pipe` if `Windows` platform) for communication;
- Main TCL commands used:

```
openmsx_update enable status
set renderer SDLGL-PP
set power on
debug break
debug cont
debug step
debug set_bp <address>
debug remove_bp bp#<id>
debug breakpoint configure bp#<id> -enabled 1
set bps [debug breakpoint list] ; set i [lsearch -regexp $bps "-address [reg PC]"] ; list [lindex $bps [expr {$i - 1}]] [lindex $bps $i]
debug read_block {Main RAM} <address> <size>
```

Others (unused):

```
openmsx_update enable hardware
openmsx_update enable setting
openmsx_update enable setting-info
openmsx_update enable led
```

Reference guide:

- [openMSX control](https://openmsx.org/manual/openmsx-control.html);
- [openMSX commands](https://openmsx.org/manual/commands.html).
