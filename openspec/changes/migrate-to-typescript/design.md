## Context

The codebase is pure JavaScript organized as: `extension.js` → `debugAdapter.js` → `cdbParser.js`, `variableDecoder.js`, `debugService.js` → `openmsxControl.js`, plus `semanticTokens.js` and `logger.js`. Migration to TypeScript should preserve this architecture while adding types.

## Goals / Non-Goals

**Goals:**
- Add TypeScript compiler and strict mode configuration
- Rename `.js` to `.ts` across all source files
- Define interfaces for all domain entities (breakpoints, variables, CDB symbols, stack frames)
- Add type-safe wrappers for TCL command execution
- Set up build pipeline with `tsc` and VSIX packaging
- Maintain 100% API compatibility at runtime

**Non-Goals:**
- Runtime behavior changes or refactoring beyond adding types
- Migration of test files (handled separately)
- Changing the extension's public API

## Decisions

1. **Incremental Migration** — Rename files one at a time, starting from leaf modules (no dependencies) working up to entry points. Each module is type-checked independently.

2. **Strict Mode** — Enable `strict: true` in tsconfig.json for maximum type safety.

3. **Interface-First** — Define all domain interfaces in a `src/types.ts` file before converting modules.

4. **Build Pipeline** — `tsc` compiles to `out/` directory; VSIX packages from `out/`. Update `.vscodeignore` accordingly.

5. **`any` Avoidance** — Minimize use of `any`; prefer `unknown` with type guards for dynamic data (openMSX responses, CDB parser output).

## Risks / Trade-offs

- [Build complexity] Two-step build (tsc → vsce) vs single JS step → mitigated by npm scripts
- [Type coverage] Some dynamic patterns (CDB parsing, TCL responses) resist clean typing → use discriminated unions
- [Test impact] Tests need import path updates → minimal impact, run after each module migration
