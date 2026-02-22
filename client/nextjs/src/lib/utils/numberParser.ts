/**
 * Parses a numeric string according to the given region's number format.
 *
 * Rules:
 * - For regions like Chile, Argentina, Colombia, Uruguay, Brazil, Paraguay:
 *   - DOT (.) is thousands separator
 *   - COMMA (,) is decimal separator
 * - For regions like USA, Mexico, Peru, Panama, Ecuador, El Salvador:
 *   - DOT (.) is decimal separator
 *   - COMMA (,) is thousands separator
 *
 * @param value - The raw string value as it appears on the receipt
 * @param region - The region/locale code (e.g., 'es-CL', 'en-US')
 * @returns The parsed number, or NaN if parsing fails
 */
export function parseNumber(
  value: string | number | undefined | null,
  region: string,
): number {
  if (value === null || value === undefined || value === "") {
    return NaN;
  }

  // If already a number, return as-is
  if (typeof value === "number") {
    return value;
  }

  // Trim and clean the string
  let str = value.trim();

  // Determine which format we're using
  const dotAsThousandsRegions = [
    "es-CL",
    "es-AR",
    "es-CO",
    "es-UY",
    "pt-BR",
    "es-PY",
  ];
  const dotAsDecimalRegions = [
    "en-US",
    "en",
    "es-MX",
    "es-PE",
    "es-PA",
    "es-EC",
    "es-SV",
  ];

  // Check if region matches any known pattern (use prefix matching for flexibility)
  const isDotThousands = dotAsThousandsRegions.some((r) =>
    region.startsWith(r),
  );
  const isDotDecimal = dotAsDecimalRegions.some((r) => region.startsWith(r));

  // Remove any currency symbols, spaces, and non-numeric characters except dots and commas
  str = str.replace(/[^\d.,-]/g, "");

  if (isDotThousands) {
    // Dot is thousands separator, comma is decimal
    // Remove all dots, replace comma with dot
    str = str.replace(/\./g, "").replace(",", ".");
  } else if (isDotDecimal) {
    // Dot is decimal, comma is thousands separator
    // Remove all commas, keep dot as is
    str = str.replace(/,/g, "");
  } else {
    // Default: try to be smart - if there's a comma and a dot, assume dot is thousands
    // If only one separator, assume it's decimal
    const hasComma = str.includes(",");
    const hasDot = str.includes(".");

    if (hasComma && hasDot) {
      // Both present - count digits after each to decide
      const dotParts = str.split(".");
      // If the part after the dot has 3 digits, dot is thousands
      if (dotParts[1] && dotParts[1].length === 3) {
        str = str.replace(/\./g, "").replace(",", ".");
      } else {
        // Otherwise, comma is thousands
        str = str.replace(/,/g, "");
      }
    } else if (hasComma) {
      // Only comma - assume it's decimal (common in CLP/ARS)
      str = str.replace(",", ".");
    }
    // If only dot, keep as decimal (common in USD)
  }

  // Parse the cleaned string
  const num = parseFloat(str);
  return isNaN(num) ? NaN : num;
}

/**
 * Safely parses a number and rounds to 2 decimal places if valid.
 */
export function parseMonetaryValue(
  value: string | number | undefined | null,
  region: string,
): number {
  const parsed = parseNumber(value, region);
  if (isNaN(parsed)) {
    return NaN;
  }
  return Math.round(parsed * 100) / 100;
}
