## ADDED Requirements

### Requirement: TypeScript Compilation
The project SHALL use the TypeScript compiler (`tsc`) to compile `.ts` source files to JavaScript.

#### Scenario: TypeScript compiles without errors
- **WHEN** the build command is executed
- **THEN** `tsc` SHALL compile all `.ts` files to the output directory
- **THEN** no type errors SHALL be emitted

### Requirement: Strict Type Configuration
The project SHALL enable `strict: true` in `tsconfig.json` for maximum type safety, minimizing use of `any` in favor of `unknown` with type guards.

#### Scenario: Strict mode is enabled
- **WHEN** `tsconfig.json` is inspected
- **THEN** `strict` SHALL be set to `true`

### Requirement: Domain Interfaces
The project SHALL define TypeScript interfaces for all domain entities including breakpoints, variables, CDB symbols, stack frames, and TCL commands.

#### Scenario: Domain entities have type definitions
- **WHEN** a domain entity is imported
- **THEN** it SHALL have a corresponding TypeScript interface or type

### Requirement: Build Pipeline
The project SHALL set up a build pipeline where `tsc` compiles to an `out/` directory and VSIX packaging runs from that directory.

#### Scenario: Build produces expected output
- **WHEN** the build script runs
- **THEN** compiled JavaScript files SHALL be in the `out/` directory
- **THEN** the VSIX package SHALL be created from `out/`
