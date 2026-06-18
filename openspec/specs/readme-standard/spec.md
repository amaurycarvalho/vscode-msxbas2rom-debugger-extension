# Readme Standard

## Purpose

Defines the required structure and content for the project's README.md, ensuring it follows OpenSpec project conventions and provides clear guidance for contributors and users.

## Requirements

### Requirement: README references OpenSpec specifications
The project README SHALL contain a section referencing the OpenSpec specifications and project constitution to guide contributors and AI agents.

#### Scenario: README links to project constitution
- **WHEN** a developer reads the README
- **THEN** the README SHALL include a link to `openspec/specs/project-constitution/spec.md`

#### Scenario: README mentions SDD methodology
- **WHEN** a developer reads the README
- **THEN** the README SHALL mention that the project uses Spec-Driven Development (SDD)

### Requirement: README includes development setup
The project README SHALL include a development section with instructions for building, testing, and packaging the extension.

#### Scenario: Development commands are documented
- **WHEN** a developer reads the development section
- **THEN** the README SHALL list the commands to install dependencies, run tests, and build the extension

### Requirement: README preserves existing content
The README SHALL retain all existing information about requirements, installation, usage, and features.

#### Scenario: Existing sections are kept
- **WHEN** README is restructured
- **THEN** requirements section SHALL still be present
- **THEN** installation section SHALL still be present
- **THEN** usage section SHALL still be present
- **THEN** features section SHALL still be present
