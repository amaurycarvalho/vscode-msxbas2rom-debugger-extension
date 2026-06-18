## Context

The project currently stores specifications in a custom `specs/` folder using SDD conventions: a `constitution.md`, `glossary.md`, `insights.md`, `plan.md`, `tasks.md`, `adr/`, and `user-stories/`. This predates OpenSpec adoption. The migration needs to:

1. Map each existing artifact to its OpenSpec equivalent
2. Preserve all requirement semantics while adopting OpenSpec's capability-based spec format
3. Handle hierarchical user stories (US-003.x substories) by merging them into coherent capability specs
4. Leave the existing codebase untouched — this is purely a specification migration

## Goals / Non-Goals

**Goals:**
- Create OpenSpec capability specs for all implemented functionality
- Register project governance documents (constitution, ADR) as OpenSpec specs
- Enable the OpenSpec workflow for future changes
- Create change proposals for pending work
- Define a clear plan for the old `specs/` directory

**Non-Goals:**
- No code changes or refactoring
- No functional changes to the debugger extension
- No changes to existing test suites

## Decisions

1. **Old-to-New Mapping** — Direct translation preserving semantics:
   - `specs/constitution.md` + `specs/adr/ADR-001.md` + `specs/glossary.md` → `openspec/specs/project-constitution/spec.md`
   - `specs/insights.md` → dispersed across relevant capability specs (edge cases → debug-engine, testing insights → variable-inspection)
   - `US-001` + `US-003.1` through `US-003.7` (execution controls) → `openspec/specs/debug-engine/spec.md`
   - `US-002` → `openspec/specs/variable-inspection/spec.md`
   - `US-003` (stack trace core) → `openspec/specs/stack-trace/spec.md`
   - `US-004` → deferred to its own change proposal (`mega-rom-support`)
   - `specs/plan.md`, `specs/tasks.md` → archived in commit history; roadmap preserved implicitly via pending changes

2. **Substory Allocation** — US-003.x substories are allocated to `debug-engine` rather than `stack-trace` because they define execution controls (Continue, Pause, Stop, Restart, Step Into/Out/Over), which are cohesive with breakpoint and debugging lifecycle logic, not stack reconstruction.

3. **Audit-Driven Corrections** — A comprehensive audit of the initial import revealed significant gaps:
   - 47% of BDD scenarios (19 of 40) were initially missing, mostly from Step Into/Out/Over
   - Detailed technical procedures for all debug commands were omitted
   - CDB symbol format examples and memory read procedures for variable decoding were lost
   - Glossary was eliminated as a dedicated artifact
   - ADR-001 content was at ~50% coverage; missing: security guidelines, technological restrictions, user story template, package reference structure
   - Insights.md non-critical discoveries (4 of 6) were not migrated
   - Reference links (openMSX documentation URLs) were lost

   All gaps were corrected in a second pass after the audit.

4. **No Delta Files Needed** — Since no existing OpenSpec specs exist, all specs are created as "ADDED Requirements" in new capability directories.

5. **Old specs/ Disposition** — See `old-specs-proposal.md` for detailed analysis. Recommended approach: retain briefly for verification, then remove after confirming no remaining references.

## Risks / Trade-offs

- [Loss of granularity] Merging US-003.x substories loses individual story tracking → mitigated by keeping per-command sections with full BDD coverage within the spec
- [Incomplete migration] Audit found 47% of BDD scenarios initially missing → mitigated by comprehensive audit and second-pass correction; all 40 original scenarios now covered
- [Design vs implementation mismatch] Initial design incorrectly mapped US-003.x to `stack-trace` → corrected in updated mapping above; actual placement in `debug-engine` is architecturally more coherent
