# US-002 - Variable Inspection for MSXBAS2ROM

## Story

As an MSX-BASIC developer, I want to inspect variable contents while debugging MSXBAS2ROM-compiled programs so that I can understand program state at any breakpoint.

## Acceptance Criteria

- Variable contents can be inspected while debugging.
- Variable values are shown in the VSCode Variables view.
- Variables reflect the current program state at the active source line.

## BDD Scenarios

### Scenario 1: Variables are visible when execution is paused

Given execution is paused at a breakpoint
When I open the Variables view in VSCode
Then I can see the current values of program variables

### Scenario 2: Variable values update after stepping

Given execution is paused and variables are visible
When I step over to the next statement
Then the displayed variable values update to reflect the new program state

### Scenario 3: Variables remain available across continues

Given a debug session with variables visible
When I continue execution to another breakpoint
Then the Variables view shows the variable values at the new paused line

## Technical specification

Use the following guidelines.

### Scalar data types

#### MSX-BASIC example:

```
20 A$ = "Lorem ipsum dolor sit amet."
30 B% = 2021
40 C! = 3.14154
50 D# = 3.14159265359
```

#### CDB example:

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

#### openMSX example:

```
For Signed Integer:

  peek_s16 0xC138 <--- reads a 16-bit signed integer
    2021 <--- is the value in decimal notation

For String (pascal style):

  peek 0xC038 <--- reads an 8-bit unsigned integer
    130 <---- is the string size in decimal notation

  debug read_block {Main RAM} 0xC039 [peek 0xC038] <--- returns the string

For Single (24 bits float point):

  taking 1 byte at a time:
    peek 0xC13A
    peek 0xC13B
    peek 0xC13C
  then take the 3 received values ​​and convert them to 24-bit floats.

  Or do:
   peek 0xC13A
   peek16 0xC13B <--- returns unsigned 16 bits

For Double (24 bits float point):

  do the same as for Single
```

### Array data types

#### MSX-BASIC guideline:

- Only one dimensional (x) or bidimensional (x and y) arrays are allowed;
- Each Y axis block has one entire block of X axis elements.

Example:

```
01 DIM A#(1), B%(2), M$(6)
02 DIM C%(3,2)
```

#### CDB example:

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

#### openMSX guideline:

- Array elements follows each one in the RAM memory in a continuous block;
- The reading process for each array element is the same as the scalar data type.

Example (pseudo code):

```
DIM A%(1,2)

A% = { { 0, 1 },
       { 2, 3 },
       { 4, 5 } }
```
