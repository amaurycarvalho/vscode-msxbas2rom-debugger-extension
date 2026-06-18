## Context

CHANGELOG.md is currently a flat list of versions with single-line descriptions. README.md lacks references to the project's OpenSpec specifications and constitution. Both files should follow OpenSpec conventions to provide consistent documentation for contributors and AI agents.

## Goals / Non-Goals

**Goals:**
- Rewrite CHANGELOG.md using Keep a Changelog format (reverse chronological, grouped by version with Added/Changed/Fixed sections, dates, links to releases)
- Rewrite README.md to reference openspec/specs/ and the project constitution
- Ensure README includes development setup, testing instructions, and contribution pointers
- Preserve all existing content information (version history, features, requirements, installation steps)

**Non-Goals:**
- No functional code changes
- No changes to package.json, version, or release process
- No restructuring of the project's file layout

## Decisions

1. **Keep a Changelog format** — Standard OpenSpec convention; makes release history scannable and links to GitHub compare URLs
2. **README openspec/ badges** — Add a badge/link pointing to `openspec/specs/project-constitution/spec.md` so readers immediately know the project uses Spec-Driven Development
3. **README development section** — Include commands for building, testing, and packaging the extension, sourced from existing package.json scripts

## Risks / Trade-offs

- [Low] Old changelog format is replaced — all historical entries are preserved, only the formatting changes
- [Low] README restructure may temporarily break external links — link targets are preserved, only section organization changes
