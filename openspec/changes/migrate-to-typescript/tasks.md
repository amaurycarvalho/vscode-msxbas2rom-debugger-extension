## 1. Setup

- [ ] 1.1 Add TypeScript as dev dependency (`typescript`, `@types/node`, `@types/vscode`)
- [ ] 1.2 Create `tsconfig.json` with strict mode enabled
- [ ] 1.3 Create `src/` directory structure mirroring current module layout
- [ ] 1.4 Update build scripts in `package.json` for TypeScript compilation
- [ ] 1.5 Update `.vscodeignore` to include `out/` directory

## 2. Type Definitions

- [ ] 2.1 Create `src/types.ts` with interfaces for all domain entities
- [ ] 2.2 Define breakpoint, variable, stack frame, and CDB symbol types
- [ ] 2.3 Define TCL command and response types

## 3. Module Migration (Leaf to Root)

- [ ] 3.1 Migrate `logger.js` → `logger.ts`
- [ ] 3.2 Migrate `cdbParser.js` → `cdbParser.ts`
- [ ] 3.3 Migrate `variableDecoder.js` → `variableDecoder.ts`
- [ ] 3.4 Migrate `openmsxControl.js` → `openmsxControl.ts`
- [ ] 3.5 Migrate `debugService.js` → `debugService.ts`
- [ ] 3.6 Migrate `debugAdapter.js` → `debugAdapter.ts`
- [ ] 3.7 Migrate `semanticTokens.js` → `semanticTokens.ts`
- [ ] 3.8 Migrate `extension.js` → `extension.ts`

## 4. Build and Verify

- [ ] 4.1 Run TypeScript compiler and fix all type errors
- [ ] 4.2 Run existing test suite to verify no runtime regressions
- [ ] 4.3 Build VSIX package from compiled TypeScript output
