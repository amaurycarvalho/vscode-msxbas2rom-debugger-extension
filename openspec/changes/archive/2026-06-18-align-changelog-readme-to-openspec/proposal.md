## Why

The project's CHANGELOG.md and README.md do not follow OpenSpec conventions, creating inconsistency with the project's documentation standards. This makes it harder for contributors and AI agents to navigate the project and understand its release history.

## What Changes

- Rewrite CHANGELOG.md following Keep a Changelog format (reverse chronological, grouped by version with Added/Changed/Fixed sections)
- Rewrite README.md to align with OpenSpec project conventions, including references to openspec/specs/ and the project constitution
- Update README badges, installation, usage, and development sections to match the project's actual maturity

## Capabilities

### New Capabilities

- `changelog-standard`: CHANGELOG.md following Keep a Changelog format with proper version groupings, dates, and semantic versioning links
- `readme-standard`: README.md following OpenSpec project conventions with specification references and clear project structure

### Modified Capabilities

- *(none – no existing specs need requirement changes)*

## Impact

- `CHANGELOG.md` – full rewrite formatting, content preserved
- `README.md` – structural rewrite, content and links preserved/enhanced
