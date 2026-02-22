import { parseNumber, parseMonetaryValue } from "../numberParser";

describe("numberParser", () => {
  describe("parseNumber", () => {
    // Test Chilean format (dot as thousands, comma as decimal)
    describe("for Chile (es-CL)", () => {
      it('should parse "2.050" as 2050', () => {
        expect(parseNumber("2.050", "es-CL")).toBe(2050);
      });

      it('should parse "1.500,50" as 1500.5', () => {
        expect(parseNumber("1.500,50", "es-CL")).toBe(1500.5);
      });

      it('should parse "10.000" as 10000', () => {
        expect(parseNumber("10.000", "es-CL")).toBe(10000);
      });

      it('should parse "1.234,56" as 1234.56', () => {
        expect(parseNumber("1.234,56", "es-CL")).toBe(1234.56);
      });
    });

    // Test US format (dot as decimal, comma as thousands)
    describe("for USA (en-US)", () => {
      it('should parse "1,500.50" as 1500.5', () => {
        expect(parseNumber("1,500.50", "en-US")).toBe(1500.5);
      });

      it('should parse "2,500" as 2500', () => {
        expect(parseNumber("2,500", "en-US")).toBe(2500);
      });

      it('should parse "10,000" as 10000', () => {
        expect(parseNumber("10,000", "en-US")).toBe(10000);
      });

      it('should parse "1,234.56" as 1234.56', () => {
        expect(parseNumber("1,234.56", "en-US")).toBe(1234.56);
      });
    });

    // Test edge cases
    describe("edge cases", () => {
      it("should handle already numeric values", () => {
        expect(parseNumber(2050, "es-CL")).toBe(2050);
      });

      it("should return NaN for null/undefined", () => {
        expect(parseNumber(null, "es-CL")).toBeNaN();
        expect(parseNumber(undefined, "es-CL")).toBeNaN();
      });

      it("should strip currency symbols", () => {
        expect(parseNumber("$2.050", "es-CL")).toBe(2050);
        expect(parseNumber("$1,500.50", "en-US")).toBe(1500.5);
      });
    });
  });

  describe("parseMonetaryValue", () => {
    it("should round to 2 decimal places", () => {
      expect(parseMonetaryValue("1.234,567", "es-CL")).toBe(1234.57);
      expect(parseMonetaryValue("1,234.567", "en-US")).toBe(1234.57);
    });
  });
});
