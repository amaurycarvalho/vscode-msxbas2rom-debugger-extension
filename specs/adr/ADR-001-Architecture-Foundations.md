# ADR-001 – VSCode Debugger Extension for MSXBAS2ROM architecture foundations

---

## Status

Accepted

## Context

General definitions applicable to the entire project.

---

## Decision

Adopt as a foundation:

1. Spec Driven Development (SDD);
2. Clean Code + SOLID;
3. Node.js as the main stack (code compatible with Linux, Windows and macOS);
4. TDD + BDD for user stories;
5. Deliverable as a VSIX package.

---

## Reference Structure

Execute `Command pallete (ctrl+shif+P) -> Tasks: Run Task -> Package scanning checking` to see the package structure.

It will be something like this:

```
VSCode Debugger Extension for MSXBAS2ROM
|
+--extension.js
   |
   +--debugAdapter.js
   |  |
   |  +--cdbParser.js
   |  |
   |  +--variableDecoder.js
   |  |
   |  +--openmsxControl.js
   |
   +--semanticTokens.js
   |
   +--logger.js
```

---

## Mandatory Use Case Pattern

All use cases must contain:

1. User Story in the format: "As [actor], I need [functionality] so that [benefit/value]".
2. Explicit Acceptance Criteria.
3. Behavioral scenarios in BDD (`Given / When / Then`).

---

### Technological Restrictions

- Do not use poorly understood, unprofessionally unvalidated, or unmaintained third-party frameworks, SDKs, libraries, components, or services.

--

### Security and Quality

- Security by design.
- Alert if there are known vulnerabilities (OWASP, CISA) and propose mitigation.
- Propose removal of unused code.

--

## Testing Strategy

- Use of TDD.
  - Unit tests at `tests/unit/` folder.
  - Integration tests at `tests/integration/` folder.
- Minimum coverage of 100% for medium/high criticality code.
- Minimum coverage of 90% for low criticality code.

--

## Application versioning

- Uses semantic versioning style;
- App version it's mantained as a constant named `version` at `package.json` file.

--

## Application releases

New releases needs to be registered as a new branch in the repository:

```
git checkout -b release/v0.0.0
git push origin release/v0.0.0
git switch main
```

See `CONTRIBUTING.md` for more information.
