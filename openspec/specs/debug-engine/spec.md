# Debug Engine

## Purpose

Core debugger engine for MSXBAS2ROM-compiled programs running on openMSX. Covers breakpoints, step-by-step execution controls (Step Into/Out/Over, Continue, Pause, Stop, Restart), and TCL command integration.

## Requirements

### Requirement: Step-by-Step Debugging
As an MSX-BASIC developer, I want to place breakpoints and step through MSXBAS2ROM-compiled programs inside VSCode using the openMSX emulator so that I can control execution precisely while debugging. The debugger SHALL support step-by-step execution that advances the program according to the chosen step action while keeping the emulator state consistent.

#### Scenario: Step-by-step execution in VSCode controls the emulator
- **WHEN** a debug session is running and execution is paused
- **WHEN** I step over, step into, or step out in VSCode
- **THEN** the program advances one statement according to the chosen step action
- **THEN** the emulator state remains consistent with the current source line

### Requirement: Breakpoints Set at Source Lines
The debugger SHALL allow breakpoints to be created at any code line in the MSX-BASIC source.

#### Scenario: Breakpoint stops execution at a source line
- **WHEN** an MSXBAS2ROM-compiled program is loaded in openMSX and a debug session is started in VSCode
- **WHEN** I set a breakpoint on a specific source line and start or continue execution
- **THEN** execution stops at that line in the VSCode editor
- **THEN** the current line is highlighted as the active statement

### Requirement: Breakpoints Configured Before Launch
Breakpoints configured before the debug session launches SHALL be applied after `launchRequest`.

#### Scenario: Pre-launch breakpoints are applied
- **WHEN** breakpoints are set before starting a debug session
- **THEN** they SHALL be applied after the launch request completes

### Requirement: TCL Command Integration
The debugger SHALL communicate with openMSX using TCL commands over stdio (or pipe on Windows). The following TCL commands SHALL be supported:

- `openmsx_update enable status`
- `set renderer SDLGL-PP`
- `set power on`
- `debug break`
- `debug cont`
- `debug step`
- `debug set_bp <address>`
- `debug remove_bp bp#<id>`
- `debug breakpoint configure bp#<id> -enabled 1`
- `set bps [debug breakpoint list] ; set i [lsearch -regexp $bps "-address [reg PC]"] ; list [lindex $bps [expr {$i - 1}]] [lindex $bps $i]`
- `debug read_block {Main RAM} <address> <size>`

Additional TCL commands that are documented but currently unused:
- `openmsx_update enable hardware`
- `openmsx_update enable setting`
- `openmsx_update enable setting-info`
- `openmsx_update enable led`

Reference: [openMSX control](https://openmsx.org/manual/openmsx-control.html) and [openMSX commands](https://openmsx.org/manual/commands.html)

#### Scenario: Debug commands are sent via TCL
- **WHEN** a debug action is triggered
- **THEN** the corresponding TCL command SHALL be sent to openMSX

#### Scenario: TCL commands are documented
- **WHEN** a new TCL command is needed
- **THEN** it SHALL be documented in the requirement
- **THEN** it SHALL reference `specs/user-stories/US-001-*.md` for the full command list

### Requirement: Continue Execution
The debugger SHALL support Continue, resuming execution while skipping automatic breakpoints (LIN_*) but stopping on manual and end-of-program breakpoints.

Procedure when continuing:
1. Disable automatic breakpoints (LIN_*)
2. Ensure manual breakpoints and end-program breakpoint are enabled
3. Continue emulation: `debug cont`

#### Scenario: Continue from a paused state
- **WHEN** the program is paused
- **WHEN** the user executes Continue
- **THEN** automatic breakpoints are disabled
- **THEN** manual breakpoints remain enabled
- **THEN** the end-of-program breakpoint remains enabled
- **THEN** emulation continues

#### Scenario: Continue with no manual breakpoints
- **WHEN** the program is paused
- **WHEN** there are no manual breakpoints defined
- **WHEN** the user executes Continue
- **THEN** automatic breakpoints are disabled
- **THEN** the end-of-program breakpoint remains enabled
- **THEN** emulation continues
- **THEN** execution stops only at the end-of-program breakpoint

### Requirement: Pause Execution
The debugger SHALL support Pause, enabling automatic breakpoints (LIN_*) and continuing emulation to stop at the next available breakpoint.

Procedure when pausing:
1. Enable automatic breakpoints (LIN_*)
2. Continue emulation: `debug cont`

#### Scenario: Pause while program is running
- **WHEN** the program is running
- **WHEN** the user executes Pause
- **THEN** automatic breakpoints are enabled
- **THEN** execution pauses at the next available breakpoint

#### Scenario: Pause when already paused
- **WHEN** the program is paused
- **WHEN** the user executes Pause
- **THEN** automatic breakpoints are enabled
- **THEN** emulation continues
- **THEN** execution pauses at the next automatic or manual breakpoint

### Requirement: Stop Debugging
The debugger SHALL support Stop, terminating the openMSX session cleanly and emitting termination to the client.

Procedure when stopping:
1. Send `quit` to openMSX control and stop the process
2. Transition the debug session to terminated state
3. Emit a terminated event to the client

#### Scenario: Stop while program is running
- **WHEN** the program is running
- **WHEN** the user executes Stop
- **THEN** the openMSX session is stopped
- **THEN** the debug session terminates without errors

#### Scenario: Stop while program is paused
- **WHEN** the program is paused
- **WHEN** the user executes Stop
- **THEN** the openMSX session is stopped
- **THEN** the debug session terminates without errors

### Requirement: Restart Debugging
The debugger SHALL prompt the user to restart when the program reaches its end. The prompt SHALL be modal and block until the user chooses.

Procedure when restarting:
1. When receiving the end-program event, display a modal prompt asking to restart
2. If the user accepts: stop the current session, start a new session with same workspace folder and configuration
3. If the user declines: stop the current session only

#### Scenario: User accepts restart prompt
- **WHEN** the program reaches its end
- **WHEN** the debugger emits an end-program notification
- **WHEN** the user confirms restart
- **THEN** the current debug session stops
- **THEN** a new debug session starts with the same configuration

#### Scenario: User declines restart prompt
- **WHEN** the program reaches its end
- **WHEN** the debugger emits an end-program notification
- **WHEN** the user declines restart
- **THEN** the current debug session stops
- **THEN** no new debug session starts

### Requirement: Step Over Execution
The debugger SHALL support Step Over, keeping in the current scope of the call stack.

Procedure when stepping over:
1. Save the current stack scope: `reg SP`
2. Execute a Step Into [US-003.5]
3. Get the new current stack scope: `reg SP`
4. If the new stack scope is below the last one, execute a Step Out [US-003.6]
5. Otherwise, do nothing

#### Scenario: Step Over on a simple line
- **WHEN** the program is paused at a line without a function call
- **WHEN** the user executes Step Over
- **THEN** a Step Into is executed internally
- **THEN** the stack pointer remains unchanged
- **THEN** execution pauses at the next line in the same scope

#### Scenario: Step Over on a function call
- **WHEN** the program is paused at a line containing a function call
- **WHEN** the user executes Step Over
- **THEN** a Step Into is executed internally
- **THEN** the stack pointer decreases (deeper scope)
- **THEN** a Step Out is executed internally
- **THEN** execution pauses at the next line after the function call
- **THEN** the call stack returns to the original scope

#### Scenario: Step Over at root scope with no function call
- **WHEN** the program is paused at root scope
- **WHEN** the current line does not contain a function call
- **WHEN** the user executes Step Over
- **THEN** a Step Into is executed internally
- **THEN** the stack pointer remains unchanged
- **THEN** no Step Out is executed
- **THEN** execution pauses at the next line

#### Scenario: Step Over on nested function calls
- **WHEN** the program is paused at a line containing nested function calls
- **WHEN** the user executes Step Over
- **THEN** a Step Into is executed internally
- **THEN** the stack pointer decreases
- **THEN** a Step Out is executed internally
- **THEN** execution returns to the original stack level
- **THEN** execution pauses at the next line in the same scope

#### Scenario: Step Over preserves breakpoint behavior
- **WHEN** the program is paused with active breakpoints
- **WHEN** the user executes Step Over
- **THEN** the internal Step Into and Step Out follow their respective breakpoint handling rules
- **THEN** no unintended breakpoint alters the expected Step Over behavior

#### Scenario: Step Over with unchanged stack
- **WHEN** the program is paused
- **WHEN** the user executes Step Over
- **WHEN** the stack pointer after Step Into remains unchanged
- **THEN** no Step Out is executed
- **THEN** execution proceeds normally to the next line

### Requirement: Step Into Execution
The debugger SHALL support Step Into, going down in the scope of the call stack when applicable.

Procedure when stepping into:
1. Enable all breakpoints if they are not already active
2. Continue the emulation until the next breakpoint: `debug cont`

#### Scenario: Step Into in a function call
- **WHEN** the program is paused on a line containing a function call
- **WHEN** there are active breakpoints within the called function
- **WHEN** the user executes Step Into
- **THEN** all breakpoints are enabled
- **THEN** execution continues
- **THEN** execution pauses at the first breakpoint within the called function
- **THEN** the call stack level increases

#### Scenario: Step Into on a line without a function call
- **WHEN** the program is paused on a line that does not contain a function call
- **WHEN** the user executes Step Into
- **THEN** all breakpoints are enabled
- **THEN** execution continues
- **THEN** execution pauses at the next available breakpoint
- **THEN** the call stack level remains the same

#### Scenario: Step Into without defined breakpoints
- **WHEN** the program is paused
- **WHEN** there are no breakpoints defined in the program
- **WHEN** the user executes Step Into
- **THEN** the system continues execution
- **THEN** no error occurs
- **THEN** the behavior is equivalent to a Continue

#### Scenario: Step Into in a function without internal breakpoints
- **WHEN** the program is paused on a line with a function call
- **WHEN** there are no breakpoints inside the called function
- **WHEN** the user executes Step Into
- **THEN** all breakpoints are enabled
- **THEN** execution continues
- **THEN** execution pauses at the next breakpoint outside the function
- **THEN** no entry into the function scope occurs

#### Scenario: Step Into with disabled breakpoints
- **WHEN** the program is paused
- **WHEN** there are breakpoints defined but disabled
- **WHEN** the user executes Step Into
- **THEN** all breakpoints are enabled
- **THEN** execution continues
- **THEN** execution pauses at the next valid breakpoint

#### Scenario: Step Into with emulator not paused
- **WHEN** the emulator is running (not paused)
- **WHEN** the user executes Step Into
- **THEN** the system ignores the command or pauses execution first
- **THEN** no error occurs

#### Scenario: Step Into in chained calls
- **WHEN** the program is paused on a line with multiple chained function calls
- **WHEN** the user executes Step Into
- **THEN** execution enters the first function call
- **THEN** the call stack correctly reflects the new depth
- **THEN** subsequent Step Into executions continue deepening the stack

#### Scenario: Step Into maintains stack consistency
- **WHEN** the program is paused within a function
- **WHEN** the user executes multiple Step Into commands
- **THEN** each step correctly reflects the evolution of the call stack
- **THEN** no scope inconsistency occurs

### Requirement: Step Out Execution
The debugger SHALL support Step Out, going up in the scope of the call stack when applicable. There SHALL be no stepping out from call stack root scope.

Procedure when stepping out:
1. If the stack is in root scope, execute a continueRequest and skip remaining steps
2. Disable all breakpoints
3. Get the current stack returning address: `peek16 [reg SP]`
4. If the return address already has a breakpoint, enable it and go to step 6
5. Otherwise, create a temporary breakpoint at the return address: `debug breakpoint create -address [peek16 [reg SP]] -once 1`
6. Continue emulation: `debug cont`
7. When the breakpoint is hit, enable all breakpoints

#### Scenario: Step Out from a nested function
- **WHEN** the program is paused inside a function (not at root scope)
- **WHEN** the call stack depth is greater than one
- **WHEN** the user executes Step Out
- **THEN** all breakpoints are disabled
- **THEN** the return address is retrieved using `peek16 [reg SP]`
- **THEN** a temporary breakpoint is created at the return address if no breakpoint exists there
- **THEN** emulation continues
- **THEN** execution pauses at the return address
- **THEN** all original breakpoints are re-enabled
- **THEN** the call stack depth decreases by one

#### Scenario: Step Out when return address already has a breakpoint
- **WHEN** the program is paused inside a function
- **WHEN** the return address already has an existing breakpoint
- **WHEN** the user executes Step Out
- **THEN** all breakpoints are disabled
- **THEN** the return address is retrieved using `peek16 [reg SP]`
- **THEN** the existing breakpoint at the return address is enabled
- **THEN** no temporary breakpoint is created
- **THEN** emulation continues
- **THEN** execution pauses at the return address
- **THEN** all breakpoints are re-enabled

#### Scenario: Step Out from root scope
- **WHEN** the program is paused at root scope
- **WHEN** the user executes Step Out
- **THEN** a continueRequest action is performed

#### Scenario: Step Out with no breakpoints defined
- **WHEN** the program is paused inside a function
- **WHEN** there are no breakpoints defined
- **WHEN** the user executes Step Out
- **THEN** the return address is retrieved using `peek16 [reg SP]`
- **THEN** a temporary breakpoint is created at the return address
- **THEN** emulation continues
- **THEN** execution pauses at the return address
- **THEN** no error occurs

#### Scenario: Step Out with disabled breakpoints
- **WHEN** the program is paused inside a function
- **WHEN** breakpoints are defined but all are disabled
- **WHEN** the user executes Step Out
- **THEN** all breakpoints remain disabled during execution
- **THEN** the return address is retrieved using `peek16 [reg SP]`
- **THEN** a temporary breakpoint is created if needed
- **THEN** emulation continues
- **THEN** execution pauses at the return address
- **THEN** all breakpoints are re-enabled after the pause

#### Scenario: Step Out restores breakpoint state
- **WHEN** the program is paused inside a function
- **WHEN** there are multiple breakpoints with mixed enabled/disabled states
- **WHEN** the user executes Step Out
- **THEN** all breakpoints are disabled before continuing
- **THEN** execution continues until the return address
- **THEN** after pausing, all breakpoints are restored to their original states

#### Scenario: Step Out in deeply nested calls
- **WHEN** the program is paused in a deeply nested function
- **WHEN** the call stack depth is greater than 2
- **WHEN** the user executes Step Out
- **THEN** execution resumes until the immediate caller's return address
- **THEN** the call stack depth decreases by exactly one
- **THEN** subsequent Step Out commands continue unwinding the stack one level at a time
