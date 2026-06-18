## 1. MegaROM Detection and Configuration

- [x] 1.1 Implement MegaROM format detection from filename suffix
- [x] 1.2 Add address normalization layer for 6-digit vs 4-digit addresses
- [x] 1.3 Update launch configuration to detect MegaROM images

## 2. Segment-Aware Breakpoints

- [x] 2.1 Modify breakpoint creation to accept segment conditions
- [x] 2.2 Implement `pc_in_slot` condition generation for breakpoints
- [x] 2.3 Update breakpoint listing and removal for conditional breakpoints
- [x] 2.4 Add active segment reading from `0xC023` on breakpoint hits

## 3. MegaROM Stack Trace

- [x] 3.1 Modify stack frame reconstruction to read 3-value frames
- [x] 3.2 Update source line mapping with segment-aware address resolution

## 4. Testing

- [x] 4.1 Add unit tests for address normalization
- [x] 4.2 Add integration tests for MegaROM breakpoint flow
- [x] 4.3 Verify all plain ROM tests pass unchanged
