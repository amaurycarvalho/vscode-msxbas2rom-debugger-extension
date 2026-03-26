# US-003 - Stack Trace for MSXBAS2ROM

## Story

As an MSX-BASIC developer, I want to view the call stack while debugging MSXBAS2ROM-compiled programs so that I can understand the execution path that led to the current line.

## Acceptance Criteria

- Stack trace can be viewed while debugging.
- Stack frames are shown in the VSCode Call Stack view.
- The top stack frame matches the active source line.

## BDD Scenarios

### Scenario 1: Call stack is visible when execution is paused

Given execution is paused at a breakpoint
When I open the Call Stack view in VSCode
Then I can see the current stack trace

### Scenario 2: Call stack updates after stepping

Given execution is paused and the Call Stack view is visible
When I step over, step into, or step out
Then the call stack updates to reflect the new execution position

### Scenario 3: Call stack updates after continue

Given a debug session with the Call Stack view visible
When I continue execution to another breakpoint
Then the call stack shows the stack trace at the new paused line

## Technical specification

Use the following guidelines:

- VSCode Call Stack must follow the MSX-BASIC GOSUB/RETURN statements flow;
- MSX-BASIC GOSUBs (plain ROM) always push 1 integer to the Z80 call stack (SP): callback address to the next MSX-BASIC line to return.

Procedure when debugging initializes:

1. Get `reg SP` address and save it as startDebuggingSP and lastPausedSP,;
2. Clear VSCode Call Stack;
3. Add the current MSX-BASIC line to the VSCode Call Stack.

Procedure when debugging pauses:

1. Check if the current `reg SP` address (currentSP) is the same as the last one (lastPausedSP). If so, stop this procedure. Otherwise, go to the next step;
2. Clear the VSCode Call Stack;
3. Read the next callback address (callbackSP, using `peek_u16 [reg SP]`), push the result into a stack list (callbackStackList) and increment currentSP address by 2 to read the next Z80 stack position;
4. Repeat 3 until currentSP = startDebuggingSP;
5. Pop callbackList into callbackAddress, evaluate what MSX-BASIC line owns this callbackAddress (pay attention to the case when it is after the last line in the source code), get the MSX-BASIC line before it and add this one to the VSCode Call Stack;
6. Repeat 5 until callbackList is empty;
7. Add the current line to the VSCode Call Stack.
