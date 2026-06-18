## Context

MegaROM support requires changes across multiple debugger subsystems. The key challenge is that MegaROM addresses include a segment number prefix (6-digit hex) while plain ROM uses 4-digit addresses. Breakpoints must include slot conditions to trigger only when the correct bank is active.

## Goals / Non-Goals

**Goals:**
- Detect MegaROM format from filename suffix
- Parse 6-digit CDB addresses correctly
- Create segment-aware breakpoints using `pc_in_slot`
- Track active segment via `0xC023`
- Handle 3-value stack frames for MegaROM GOSUBs
- Pass all existing plain ROM tests unchanged

**Non-Goals:**
- Support for all MegaROM mappers — only ASCII8 and KonamiSCC initially
- Performance optimizations for bank switching

## Decisions

1. **Filename-Based Format Detection** — Parse the ROM filename for `[ASCII8]`, `[KonamiSCC]` etc. suffixes rather than requiring explicit configuration. `mega-rom-support` spec covers this requirement.

2. **Address Normalization Layer** — Create an address module that normalizes 4-digit (plain) and 6-digit (MegaROM) addresses. Breakpoint addresses are stored with full segment info; variable addresses discard the segment prefix.

3. **Conditional Breakpoints** — Use `debug breakpoint create -address <addr> -condition {[pc_in_slot X X <segment>]}` for MegaROM. Plain ROM breakpoints remain unconditional.

4. **Segment Tracking** — Read `peek 0xC023` on each breakpoint hit to determine active segment for source line mapping.

5. **Stack Frame Adaptation** — Detect MegaROM mode and read 3 values per stack frame instead of 1.

## Risks / Trade-offs

- [Format coverage] Only ASCII8 and KonamiSCC are tested initially → other mappers added as needed
- [Performance] `peek 0xC023` on every breakpoint hit adds latency → negligible for debugging use case
- [Complexity] Two address formats increase code surface → mitigated by normalization layer
