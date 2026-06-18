## Why

The codebase is written in plain JavaScript, which lacks type safety, making refactoring error-prone and reducing IDE productivity. Migrating to TypeScript adds compile-time type checking, improves code documentation through types, enables better IDE support (autocomplete, refactoring), and aligns with VSCode extension ecosystem standards.

## What Changes

- Add TypeScript as a build dependency
- Create `tsconfig.json` with strict mode
- Rename all `.js` files to `.ts` and add type annotations
- Define interfaces for all domain entities (breakpoints, variables, stack frames, CDB symbols)
- Add type-safe wrappers for openMSX TCL communication
- Set up build pipeline (tsc + vsce packaging)
- Maintain runtime behavior identical to current JS implementation

## Capabilities

### New Capabilities
- `type-script-migration`: TypeScript type definitions, migration strategy, and build configuration

### Modified Capabilities
- None — this is a pure implementation change; no spec-level behavior changes

## Impact

- Entire codebase: `.js` → `.ts` rename across all source files
- Build pipeline: add `tsc` compilation step before VSIX packaging
- Test suite: update test imports and type assertions
- CI/CD: update build scripts for TypeScript compilation
- No functional changes to debugger behavior
