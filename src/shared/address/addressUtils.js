const MEGA_ROM_PATTERN = /\[(ASCII8|KonamiSCC)\]/;

function detectMegaRomFormat(filename) {
  const match = filename.match(MEGA_ROM_PATTERN);
  return match ? match[1] : null;
}

function parseAddress(addrHex) {
  if (addrHex.length === 6) {
    const segment = parseInt(addrHex.substring(0, 2), 16);
    const offset = parseInt(addrHex.substring(2), 16);
    return { segment, offset };
  }
  return { segment: null, offset: parseInt(addrHex, 16) };
}

function formatBreakpointCondition(segment) {
  if (segment !== null && segment !== undefined) {
    return ` -condition {[pc_in_slot X X 0x${segment.toString(16)}]}`;
  }
  return "";
}

module.exports = {
  detectMegaRomFormat,
  parseAddress,
  formatBreakpointCondition,
};
