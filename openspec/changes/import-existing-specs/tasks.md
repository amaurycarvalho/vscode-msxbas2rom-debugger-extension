## 1. Register Project Governance Specs

- [x] 1.1 Copy constitution.md, glossary.md, and ADR-001 content into openspec/specs/project-constitution/spec.md
- [x] 1.2 Integrate insights.md discoveries into the appropriate openspec specs
- [ ] 1.3 Validate all governance specs with `openspec validate`

## 2. Register Debug Engine Specs

- [x] 2.1 Translate US-001 (breakpoints + stepping) and all execution controls (US-003.1 through 003.7) into openspec/specs/debug-engine/spec.md
- [x] 2.2 Ensure all TCL commands and BDD scenarios from the original user stories are preserved
- [ ] 2.3 Verify all 29 BDD scenarios (US-001: 2, US-003.1: 2, US-003.2: 2, US-003.3: 2, US-003.4: 2, US-003.5: 8, US-003.6: 7, US-003.7: 6) are present in the spec

## 3. Register Variable Inspection Specs

- [x] 3.1 Translate US-002 (variable inspection + arrays) into openspec/specs/variable-inspection/spec.md
- [x] 3.2 Ensure scalar types (integer, string, single, double) and array types (1D, 2D) are covered with CDB examples and memory read procedures

## 4. Register Stack Trace Specs

- [x] 4.1 Translate US-003 (stack trace) into openspec/specs/stack-trace/spec.md
- [ ] 4.2 Verify stack reconstruction algorithm (init + pause procedures) is fully documented

## 5. Create Pending Change Proposals

- [x] 5.1 Create `mega-rom-support` change for US-004 using `openspec new change`
- [x] 5.2 Create `migrate-to-typescript` change for release 0.4.1 using `openspec new change`
- [x] 5.3 Generate all artifacts (proposal, design, specs, tasks) for each new change

## 6. Audit and Corrections

- [x] 6.1 Perform comprehensive audit comparing old specs/ vs new openspec/ content
- [x] 6.2 Fix identified gaps: missing BDD scenarios, technical procedures, CDB examples, ADR content
- [x] 6.3 Add glossary as a dedicated requirement in project-constitution spec

## 7. Validation and Cleanup

- [ ] 7.1 Run `openspec validate` on all specs and changes
- [ ] 7.2 Review `old-specs-proposal.md` and decide on disposition of old `specs/` folder
- [ ] 7.3 If removing old specs/: verify no scripts or docs reference `specs/` paths
- [ ] 7.4 If removing old specs/: execute `git rm -r specs/` and commit
- [ ] 7.5 If removing old specs/: update `AGENTS.md` to reference `openspec/specs/`
