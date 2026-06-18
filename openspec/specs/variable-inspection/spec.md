# Variable Inspection

## Purpose

Variable inspection for MSXBAS2ROM programs displaying scalar and array values in the VSCode Variables view. Covers MSX-BASIC data types (integer, string, single, double float) and CDB symbol resolution.

## Requirements

### Requirement: Scalar Variable Inspection
As an MSX-BASIC developer, I want to inspect variable contents while debugging MSXBAS2ROM-compiled programs so that I can understand program state at any breakpoint. The debugger SHALL display scalar variable values in the VSCode Variables view when execution is paused, supporting integer (16-bit signed), string (Pascal-style with length prefix), single (24-bit float), and double (24-bit float) types.

MSX-BASIC source example:
```
20 A$ = "Lorem ipsum dolor sit amet."
30 B% = 2021
40 C! = 3.14154
50 D# = 3.14159265359
```
The debugger SHALL display scalar variable values in the VSCode Variables view when execution is paused, supporting integer (16-bit signed), string (Pascal-style with length prefix), single (24-bit float), and double (24-bit float) types.

#### Scenario: Variables are visible when paused
- **WHEN** execution is paused at a breakpoint
- **WHEN** the Variables view is opened in VSCode
- **THEN** the current values of program variables are displayed

#### Scenario: Variable values update after stepping
- **WHEN** execution is paused and variables are visible
- **WHEN** the user steps to the next statement
- **THEN** the displayed variable values update to reflect new program state

#### Scenario: Variables persist across continues
- **WHEN** a debug session has variables visible
- **WHEN** execution continues to another breakpoint
- **THEN** the Variables view shows variable values at the new paused line

### Requirement: Scalar Type Decoding
The debugger SHALL decode each scalar type according to its specific memory layout and CDB type definition.

CDB type definitions:
- `SI:B` — Signed Integer (16-bit): read with `peek_s16 <address>`
- `PSTR` — Pascal String (256 bytes total): byte 0 = length (`peek <address>`), bytes 1-255 = data (`debug read_block {Main RAM} <address+1> <length>`)
- `F24` — Single/Double (24-bit float): read 3 bytes at `peek 0xC13A`, `peek 0xC13B`, `peek 0xC13C` and convert to 24-bit float, or `peek 0xC13A` + `peek16 0xC13B`

CDB symbol format example for scalars:
```
T:F24({3}ST)
F:F24:m0({1}SC:B),0,0
F:F24:m1({1}SC:B),1,0
F:F24:exp({1}SC:B),2,0

T:PSTR({256}ST)
F:PSTR:len({1}SC:B),0,0
F:PSTR:data({255}DA255d,SC:B),1,0

S:G$VAR_A$0_0$0({256}PSTR),G,0,0
L:G$VAR_A$0_0$0:C038
S:G$VAR_B$0_0$0({2}SI:B),G,0,0
L:G$VAR_B$0_0$0:C138
S:G$VAR_C$0_0$0({3}F24),G,0,0
L:G$VAR_C$0_0$0:C13A
S:G$VAR_D$0_0$0({3}F24),G,0,0
L:G$VAR_D$0_0$0:C13D
```

#### Scenario: Signed Integer is decoded
- **WHEN** the debugger reads a variable of type `SI:B` at address `0xC138`
- **THEN** it SHALL use `peek_s16 0xC138` to read a 16-bit signed integer
- **THEN** in the MSX-BASIC example `B% = 2021`, the result at `0xC138` SHALL be `2021`

#### Scenario: Pascal String is decoded
- **WHEN** the debugger reads a variable of type `PSTR` at address `0xC038`
- **THEN** it SHALL read the first byte as the string length using `peek 0xC038`
- **THEN** in the MSX-BASIC example `A$ = "Lorem ipsum..."`, the length at `0xC038` SHALL be `130`
- **THEN** it SHALL read `length` bytes starting at `0xC039` using `debug read_block {Main RAM} 0xC039 [peek 0xC038]`

#### Scenario: 24-bit Float is decoded
- **WHEN** the debugger reads a variable of type `F24` at address `0xC13A`
- **THEN** it SHALL read 3 consecutive bytes: `peek 0xC13A`, `peek 0xC13B`, `peek 0xC13C` and convert them to a 24-bit floating point value
- **THEN** alternatively: `peek 0xC13A` + `peek16 0xC13B` returns unsigned 16 bits
- **THEN** Double (24-bit float) uses the same procedure as Single

### Requirement: Array Variable Inspection
The debugger SHALL support array variable inspection for one-dimensional (x) and two-dimensional (x, y) arrays. Array elements follow each other in RAM memory in a continuous block. Each Y axis block contains one entire block of X axis elements. The reading process for each array element is the same as the scalar data type.

MSX-BASIC DIM examples:
```
01 DIM A#(1), B%(2), M$(6)
02 DIM C%(3,2)
```

Memory layout example (pseudo-code):
```
DIM A%(1,2)

A% = { { 0, 1 },
       { 2, 3 },
       { 4, 5 } }
```

CDB symbol format example for arrays:
```
T:F24({3}ST)
F:F24:m0({1}SC:B),0,0
F:F24:m1({1}SC:B),1,0
F:F24:exp({1}SC:B),2,0

T:PSTR({256}ST)
F:PSTR:len({1}SC:B),0,0
F:PSTR:data({255}DA255d,SC:B),1,0

S:G$VAR_A$0_0$0({6}DA2d,DA1d,F24),G,0,0
L:G$VAR_A$0_0$0:C038
S:G$VAR_B$0_0$0({6}DA3d,DA1d,SI:B),G,0,0
L:G$VAR_B$0_0$0:C062
S:G$VAR_C$0_0$0({24}DA4d,DA3d,SI:B),G,0,0
L:G$VAR_C$0_0$0:C04A
S:G$VAR_M$0_0$0({1792}DA7d,DA1d,PSTR),G,0,0
L:G$VAR_M$0_0$0:C068
```

The array dimension encoding in CDB:
- `DA2d,DA1d` = 2 dimensions: X=2, Y=1 (total 2 elements)
- `DA3d,DA1d` = 2 dimensions: X=3, Y=1 (total 3 elements)
- `DA4d,DA3d` = 2 dimensions: X=4, Y=3 (total 12 elements)
- `DA7d,DA1d` = 2 dimensions: X=7, Y=1 (total 7 elements of type PSTR)

#### Scenario: Array expansion shows elements
- **WHEN** execution is paused and an array variable is visible
- **WHEN** the user expands the array in the Variables view
- **THEN** individual element values are displayed

#### Scenario: Array element types are decoded correctly
- **WHEN** an array contains elements of a specific type (integer, string, float)
- **THEN** each element is decoded according to its type specification

#### Scenario: Array dimensions are parsed from CDB
- **WHEN** the debugger encounters an array variable
- **THEN** the array dimensions are parsed from the DA(d) pattern in the CDB symbol
- **THEN** the first dimension is the X axis, the second is the Y axis
- **THEN** each Y block contains one complete set of X elements in contiguous memory

### Requirement: CDB Symbol Resolution
The debugger SHALL use the CDB (Code Debugger) file produced by MSXBAS2ROM to resolve variable names, types, and memory addresses. Each variable entry follows the format:

```
S:G$<name>$<scope>$<flags>({<size>}<type>),<category>,<flags>,<extra>
L:G$<name>$<scope>$<flags>:<address>
```

#### Scenario: Variable is resolved from CDB
- **WHEN** the debugger needs to read a variable
- **THEN** the variable name, type, and address are resolved from the CDB file
- **THEN** the variable name is extracted from the `G$<name>` pattern

#### Scenario: Array expansion can be unit tested
- **WHEN** testing array expansion in the Variables view
- **THEN** `variablesRequest` can be driven with mock CDB data and openMSX memory readers
