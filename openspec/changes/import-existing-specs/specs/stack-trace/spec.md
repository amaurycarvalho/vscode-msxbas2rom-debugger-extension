## ADDED Requirements

### Requirement: Stack Trace Display
The debugger SHALL display the call stack in the VSCode Call Stack view when execution is paused, following the MSX-BASIC GOSUB/RETURN flow. MSX-BASIC GOSUBs (plain ROM) always push 1 integer to the Z80 call stack (SP): the callback address to the next MSX-BASIC line to return.

#### Scenario: Call stack is visible when paused
- **WHEN** execution is paused at a breakpoint
- **WHEN** the Call Stack view is opened in VSCode
- **THEN** the current stack trace is displayed

#### Scenario: Call stack updates after stepping
- **WHEN** execution is paused and the Call Stack view is visible
- **WHEN** the user steps over, into, or out
- **THEN** the call stack updates to reflect the new execution position

#### Scenario: Call stack updates after continue
- **WHEN** a debug session has the Call Stack view visible
- **WHEN** execution continues to another breakpoint
- **THEN** the call stack shows the stack trace at the new paused line

#### Scenario: Top frame matches active line
- **WHEN** execution is paused
- **THEN** the top stack frame matches the active source line

### Requirement: Z80 Stack Pointer Based Frame Reconstruction
The debugger SHALL reconstruct the call stack by reading the Z80 stack pointer (SP) and walking the return addresses.

#### Scenario: Stack is reconstructed on debug init
- **WHEN** debugging initializes
- **THEN** the current `reg SP` address is saved as `startDebuggingSP` and `lastPausedSP`
- **THEN** the VSCode Call Stack is cleared
- **THEN** the current MSX-BASIC line is added to the VSCode Call Stack

#### Scenario: Stack is reconstructed on pause
- **WHEN** debugging pauses
- **THEN** the current `reg SP` address is checked (currentSP)
- **WHEN** currentSP equals lastPausedSP
- **THEN** the procedure stops (no stack change)
- **WHEN** currentSP differs from lastPausedSP
- **THEN** the VSCode Call Stack is cleared
- **THEN** a callback address is read using `peek_u16 [reg SP]`, pushed into `callbackStackList`, and currentSP is incremented by 2
- **THEN** the previous step repeats until currentSP equals startDebuggingSP
- **THEN** each address is popped from callbackStackList, evaluated to find which MSX-BASIC line owns it (paying attention to addresses after the last source line), and the line before it is added as a frame
- **THEN** the previous step repeats until callbackStackList is empty
- **THEN** `lastPausedSP` is updated to currentSP
- **THEN** the current line is added as the top frame of the VSCode Call Stack

### Requirement: Visual Stop Line Integrity
The debugger SHALL ensure the Call Stack view is populated on breakpoint stops even if the pause event fires before `breakpointHit`, by building frames in the adapter on breakpoint stops.

#### Scenario: Call stack is built on breakpoint stop
- **WHEN** a breakpoint is hit and execution pauses
- **THEN** the adapter SHALL build stack frames even if `breakpointHit` event order is uncertain
- **THEN** the Call Stack view SHALL display valid frames
