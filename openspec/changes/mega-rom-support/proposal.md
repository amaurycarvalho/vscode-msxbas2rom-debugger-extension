## Why

MSXBAS2ROM can compile MSX-BASIC programs larger than 32KB into MegaROM images using bank switching (ASCII8, KonamiSCC formats). The current debugger only supports plain ROM images. Adding MegaROM support enables debugging of larger, real-world MSX-BASIC projects.

## What Changes

- Detect MegaROM format from ROM filename suffix (e.g., `[ASCII8]`, `[KonamiSCC]`)
- Interpret 6-digit CDB addresses with segment prefix for breakpoints and symbol resolution
- Create breakpoints with `pc_in_slot` conditions for segment-aware stopping
- Read active segment from `0xC023` on breakpoint hits
- Handle 3-value Z80 stack frames (helper + segment + address) for MegaROM GOSUBs
- Maintain backward compatibility with plain ROM debugging

## Capabilities

### New Capabilities
- `mega-rom-support`: MegaROM bank switching support with segment-aware breakpoints, 6-digit address format, and backward-compatible plain ROM behavior

### Modified Capabilities
- None

## Impact

- `debug-engine` capability: breakpoint creation logic needs segment condition handling
- `stack-trace` capability: frame reconstruction needs 3-value stack reading
- `variable-inspection` capability: address resolution needs segment prefix parsing
- openMSX control layer: new TCL commands for `pc_in_slot` conditions
