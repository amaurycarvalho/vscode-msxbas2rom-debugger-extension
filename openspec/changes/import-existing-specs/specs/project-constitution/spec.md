## ADDED Requirements

### Requirement: Project Constitution
The project SHALL maintain a constitution defining immutable principles and mandatory guidelines for AI agents and human developers.

#### Scenario: Agent consults constitution before working
- **WHEN** an AI agent begins working on the project
- **THEN** the agent SHALL first consult the constitution document

#### Scenario: Surprising findings are documented
- **WHEN** an agent encounters something in the project that surprises them
- **THEN** the agent SHALL alert the developer and propose a change to the constitution

#### Scenario: Cross-references are consulted
- **WHEN** an agent needs to understand project structure
- **THEN** the agent SHALL consult `openspec/specs/` for all project specifications
- **THEN** the agent SHALL consult `openspec/changes/` for active change proposals
- **THEN** the agent SHALL consult `openspec/specs/project-constitution/spec.md` for architectural decision records

### Requirement: Glossary
The project SHALL maintain a glossary of terms and concepts used across specifications.

| Term | Definition |
|------|------------|
| SDD | Spec Driven Development |

#### Scenario: Glossary is consulted
- **WHEN** an unfamiliar term is encountered
- **THEN** the glossary SHALL be checked for its definition

### Requirement: Architecture Decision Records
The project SHALL maintain Architecture Decision Records (ADRs) in a dedicated directory with status, context, decision, and consequences.

#### Scenario: New ADR is created
- **WHEN** an architectural decision is made
- **THEN** an ADR file SHALL be created following the standard template
- **THEN** the ADR SHALL include: Status, Context, Decision, and Consequences sections

#### Scenario: Existing ADR is consulted
- **WHEN** an architectural decision needs context
- **THEN** the ADR repository at `openspec/specs/project-constitution/spec.md` SHALL be consulted

### Requirement: ADR-001 Architecture Foundations
ADR-001 establishes the foundational decisions for the project. The system SHALL implement the following architectural decisions as recorded in ADR-001.

#### Scenario: SDD methodology is adopted
- **WHEN** a new feature is developed
- **THEN** specifications SHALL be created or updated before implementation

#### Scenario: Clean Code + SOLID principles are followed
- **WHEN** code is reviewed
- **THEN** it SHALL adhere to Clean Code and SOLID principles

#### Scenario: Cross-platform Node.js stack is used
- **WHEN** the project is built
- **THEN** it SHALL build and run on Linux, Windows, and macOS

#### Scenario: TDD + BDD is used for user stories
- **WHEN** a new feature is implemented
- **THEN** unit tests SHALL be written in `tests/unit/`
- **THEN** integration tests SHALL be written in `tests/integration/`
- **THEN** coverage SHALL reach 100% for medium/high criticality code and 90% for low criticality code

#### Scenario: Extension is packaged as VSIX
- **WHEN** a release is made
- **THEN** the extension SHALL be packaged as a VSIX file

#### Scenario: Security by design is applied
- **WHEN** code is designed or reviewed
- **THEN** security SHALL be considered by design
- **THEN** known vulnerabilities (OWASP, CISA) SHALL be flagged with mitigations proposed
- **THEN** unused code SHALL be removed

#### Scenario: Technological restrictions are followed
- **WHEN** a dependency is added
- **THEN** poorly understood, unvalidated, or unmaintained third-party frameworks, SDKs, libraries, components, or services SHALL NOT be used

### Requirement: User Story Pattern
All user stories SHALL follow the mandatory pattern defined in ADR-001: User Story in "As [actor], I need [functionality] so that [benefit/value]" format, explicit Acceptance Criteria, BDD scenarios with Given/When/Then, Technical Specification, and References.

#### Scenario: New user story is created
- **WHEN** a new user story is written
- **THEN** it SHALL include the Story, Acceptance Criteria, BDD Scenarios (Given/When/Then), Technical Specification, and References sections

### Requirement: Reference Structure
The project SHALL maintain a consistent module structure aligned with the debugger extension architecture.

```
VSCode Debugger Extension for MSXBAS2ROM
|
+--extension.js
|  +--debugAdapter.js
|  |  +--cdbParser.js
|  |  +--variableDecoder.js
|  |  +--debugService.js
|  |     +--openmsxControl.js
|  +--semanticTokens.js
|  +--logger.js
```

#### Scenario: Module structure is verified
- **WHEN** the project structure is inspected
- **THEN** it SHALL follow the reference structure defined by ADR-001

#### Scenario: Package structure is viewed interactively
- **WHEN** a developer wants to inspect the package structure
- **THEN** they SHALL execute: `Command Palette (Ctrl+Shift+P) → Tasks: Run Task → Package scanning checking`

### Requirement: Specification Conventions
User stories SHALL be written in English and follow the "As a / I want / so that" format. BDD scenarios SHALL use explicit Given/When/Then statements, even when still early in scope.

#### Scenario: Story format is verified
- **WHEN** a user story is created
- **THEN** it SHALL follow the "As a / I want / so that" format
- **THEN** BDD scenarios SHALL use Given/When/Then

### Requirement: Code Conventions and Architectural Invariants
The project SHALL follow documented code conventions and architectural patterns discovered during development.

The role of the insights document is to describe emergent knowledge discovered during development. It is NOT a source of formal requirements or architectural rules. If an insight becomes stable and recurring, it should be promoted to:
- `project-constitution` (if normative)
- `glossary` (if semantic)
- an ADR (if architectural)

If an insight is no longer relevant, remove it.

#### Scenario: Domain commands follow standard export pattern
- **WHEN** domain commands are organized
- **THEN** they SHALL be re-exported via `src/domain/commands/index.js`
- **THEN** they SHALL be grouped by domain: `breakpoint`, `control`, `memory`, `register`

#### Scenario: Debugger integrates with openMSX and VSCode views
- **WHEN** the debugger extension runs
- **THEN** it SHALL integrate with openMSX
- **THEN** it SHALL expose VSCode-standard debug views (Variables, Call Stack, stepping)

### Requirement: Historic Scope Decisions
The project SHALL document the resolution of the original US-001 scope tension, which was resolved by splitting it into focused user stories (US-001 for breakpoints and stepping, US-002 for variable inspection, US-003 for stack trace).

#### Scenario: Scope decision is referenced
- **WHEN** a new user story is being created
- **THEN** the precedent of splitting broad stories into focused ones SHALL be followed

### Requirement: Semantic Versioning
The project SHALL use semantic versioning, maintained as the `version` constant in `package.json`.

#### Scenario: Version is bumped
- **WHEN** a new release is prepared
- **THEN** the version in `package.json` SHALL follow semver convention

### Requirement: Release Branches
New releases SHALL be registered as branches following the pattern `release/vX.Y.Z` and pushed to the remote repository.

#### Scenario: Release is cut
- **WHEN** a release is ready
- **THEN** a branch `release/vX.Y.Z` SHALL be created: `git checkout -b release/vX.Y.Z`
- **THEN** the branch SHALL be pushed: `git push origin release/vX.Y.Z`
- **THEN** the working branch returns to main: `git switch main`
- **THEN** `CONTRIBUTING.md` SHALL be consulted for more information on the release process

### Requirement: Release Roadmap
The project SHALL maintain a release roadmap mapping user stories to semantic versions.

#### Scenario: Release roadmap is consulted
- **WHEN** planning a new release
- **THEN** the release roadmap SHALL be checked for the next planned version

Release history and plan:

| Release | User Stories | Description |
|---------|-------------|-------------|
| 0.1.0 | US-001 | Initial openMSX integration, breakpoints, step-by-step debugging |
| 0.2.0 | US-002 | Variable inspection / array viewer support |
| 0.3.0 | US-003, US-003.1–003.4 | Stack trace support + basic debugging (Continue, Pause, Stop, Restart) |
| 0.3.1 | US-003.5 | Step Into |
| 0.3.2 | US-003.6 | Step Out |
| 0.3.3 | US-003.7 | Step Over |
| 0.3.4 | — | Remove all domain logic from openmsxControl (Command pattern, debugService facade, debugEvent orchestration) |
| 0.4.0 | US-004 | MegaROM support |
| 0.4.1 | — | Migrate codebase to TypeScript, achieve 95% code coverage |
