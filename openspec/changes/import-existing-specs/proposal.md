## Why

The project has been developed using Spec Driven Development (SDD) with a custom `specs/` folder structure. OpenSpec provides a standardized format with richer tooling, artifact lifecycle management, and change tracking. Migrating to OpenSpec centralizes the source of truth, enables automated validation, and unlocks the full OpenSpec workflow for future changes.

## What Changes

- Import existing project constitution, glossary, and ADR into `openspec/specs/` as formal OpenSpec specifications
- Translate all implemented user stories (US-001, US-002, US-003 and substories) into OpenSpec capability specs
- Migrate insights and discovered edge cases into the appropriate OpenSpec artifacts
- Create change proposals for pending work (US-004 MegaROM support, TypeScript migration)
- Remove the old `specs/` folder once migration is complete

## Capabilities

### New Capabilities
- `project-constitution`: Immutable project principles, mandatory guidelines, and agent guardrails
- `debug-engine`: Core debugger engine covering openMSX integration, breakpoints (set/remove/list), step-by-step execution (Step Into/Out/Over), Continue, Pause, Stop, and Restart
- `variable-inspection`: Variable inspection for scalar types (integer, string, single, double) and array types (1D and 2D) in the VSCode Variables view
- `stack-trace`: Call stack trace support using Z80 SP-based frame reconstruction from MSX-BASIC GOSUB/RETURN flow
- `mega-rom-support`: MegaROM bank switching support with segment-aware breakpoints and 6-digit address format (pending implementation)

### Modified Capabilities
- None — this is the initial OpenSpec import; no existing capability specs are being modified

## Impact

- All existing specs are read-only migration sources; no functional code changes
- `openspec/specs/` becomes the single source of truth for project specifications
- Old `specs/` folder marked for removal after migration verification
- Future changes will use `openspec new change` instead of manual spec editing
