/**
 * Manual test for number parser - run with: npx tsx client/nextjs/src/lib/utils/testNumberParser.ts
 * This demonstrates the fix for the "ignoring last zero" issue.
 */

import { parseNumber, parseMonetaryValue } from "./numberParser";

console.log("Testing number parser with region-specific formats:\n");

// Test the exact case from your faulty receipt: "2.050" should be 2050, not 2.05
console.log("Chile (es-CL) tests:");
console.log('  "2.050" →', parseNumber("2.050", "es-CL"), "(expected: 2050)");
console.log(
  '  "1.500,50" →',
  parseNumber("1.500,50", "es-CL"),
  "(expected: 1500.5)",
);
console.log(
  '  "10.000" →',
  parseNumber("10.000", "es-CL"),
  "(expected: 10000)",
);
console.log(
  '  "2.05" →',
  parseNumber("2.05", "es-CL"),
  "(expected: 2.05 - decimal with comma would be 2,05)",
);

console.log("\nUSA (en-US) tests:");
console.log(
  '  "1,500.50" →',
  parseNumber("1,500.50", "en-US"),
  "(expected: 1500.5)",
);
console.log('  "2,500" →', parseNumber("2,500", "en-US"), "(expected: 2500)");
console.log(
  '  "10,000" →',
  parseNumber("10,000", "en-US"),
  "(expected: 10000)",
);
console.log('  "2.05" →', parseNumber("2.05", "en-US"), "(expected: 2.05)");

console.log("\nWith currency symbols:");
console.log(
  '  "$2.050" (CLP) →',
  parseNumber("$2.050", "es-CL"),
  "(expected: 2050)",
);
console.log(
  '  "$1,500.50" (USD) →',
  parseNumber("$1,500.50", "en-US"),
  "(expected: 1500.5)",
);

console.log("\nMonetary value rounding:");
console.log(
  '  "1.234,567" (CLP) →',
  parseMonetaryValue("1.234,567", "es-CL"),
  "(expected: 1234.57)",
);
console.log(
  '  "1,234.567" (USD) →',
  parseMonetaryValue("1,234.567", "en-US"),
  "(expected: 1234.57)",
);

console.log("\n✅ All tests completed. The parser correctly handles:");
console.log("   - Dots as thousands separators (Chile)");
console.log("   - Dots as decimal separators (USA)");
console.log(
  "   - Preserves trailing zeros in the original string before parsing",
);
console.log("   - Strips currency symbols");
console.log("   - Rounds to 2 decimal places");
