# Project Insights

This document captures emergent knowledge discovered during development. Write here your discoveries about this project.

---

## General rules

It is NOT a source of formal requirements or architectural rules.

If an insight becomes stable and recurring, it should be marked here and proposed to be promoted to:

- constitution.md (if normative)
- glossary.md (if semantic)
- an ADR (if architectural)

If an insight registered here is not relevant any more, remove it.

---

## Discoveries

### 1. Observed Code Patterns

### 2. Implicit Conventions

- User stories are written in English and follow the "As a / I want / so that" format.
- BDD scenarios are expected to use explicit Given/When/Then statements, even when still early in scope.

### 3. Repeated Architectural Decisions

- The debugger extension is expected to integrate with openMSX and expose VSCode-standard debug views (Variables, Call Stack, stepping).

### 4. Edge Cases Frequently Missed by AI
- Breakpoints configured before launch need to be applied after `launchRequest`, otherwise they are silently ignored.
- Visual stop line/Call Stack can fail if `stackTraceRequest` is gated by `debuggingActive`; ensure the adapter builds frames on breakpoint stops even if the pause event fires before `breakpointHit`.

### 5. Performance Observations

### 6. Testing Insights
- Array expansion in the Variables view can be unit-tested by driving `variablesRequest` with mock CDB data and openMSX memory readers.

### 7. Refactoring Opportunities

### 8. Open Questions
- None at the moment. The original scope tension in US-001 was resolved by splitting it into focused user stories.
