import { calculateReceiptIntegrity } from "../receiptIntegrity";
import { ReceiptData } from "../../components/receiptAnalizer/types";

describe("Receipt Integrity Logic", () => {
  
  test("User Provided Data: CENCOSUD RETAIL S.A.", () => {
    const data: ReceiptData = {
      merchantName: "CENCOSUD RETAIL S.A.",
      date: "2026-01-14",
      total: 22628,
      currency: "CLP",
      items: [
        { name: "BOLSA REUTILIZABLE", totalPrice: 390, quantity: 1, unitPrice: 390 },
        { name: "QUESO MANT LAM", totalPrice: 3535, quantity: 0.286, unitPrice: 12360.13986013986 },
        { name: "PECHUGA POLLO GRAN", totalPrice: 4391, quantity: 0.846, unitPrice: 5190.307328605201 },
        { name: "HARINA SIN POLVO 1", totalPrice: 1740, quantity: 1, unitPrice: 1740 },
        { name: "HUACHALOMO V BRA P", totalPrice: 6792, quantity: 1, unitPrice: 6792 },
        { name: "YOGURT FRU DE SUR", totalPrice: 550, quantity: 1, unitPrice: 550 },
        { name: "BEBIDA L.SODA Z 3L", totalPrice: 3150, quantity: 1, unitPrice: 3150 },
        { name: "CREMA ESPESA SOPRO", totalPrice: 2780, quantity: 2, unitPrice: 1390 }
      ],
      category: "Food",
      discount: 700,
      taxAmount: 3613,
      taxRate: 0.19 
    };

    const score = calculateReceiptIntegrity(data);
    console.log(`[Test] CENCOSUD Score: ${score}`);
    expect(score).toBeGreaterThanOrEqual(80);
  });

  test("Perfect alignment with separate tax", () => {
    const data: ReceiptData = {
      merchantName: "Test Store",
      date: "2024-03-20",
      total: 119.00,
      currency: "USD",
      items: [
        { name: "Item 1", totalPrice: 100.00, quantity: 1, unitPrice: 100.00 }
      ],
      category: "Other",
      taxAmount: 19.00,
      taxRate: 0.19,
      discount: 0
    };
    
    const score = calculateReceiptIntegrity(data);
    expect(score).toBe(100);
  });

  test("Tax Rate Integrity Check (Success)", () => {
    const data: ReceiptData = {
      merchantName: "Tax Check",
      date: "2024-03-20",
      total: 119.00,
      currency: "USD",
      items: [{ name: "Item", totalPrice: 100, quantity: 1, unitPrice: 100 }],
      taxAmount: 19,
      taxRate: 0.19,
      discount: 0,
      category: "Other"
    };
    const score = calculateReceiptIntegrity(data);
    expect(score).toBe(100);
  });

  test("Tax Rate Integrity Check (Failure)", () => {
    const data: ReceiptData = {
      merchantName: "Tax Failure",
      date: "2024-03-20",
      total: 100.00,
      currency: "USD",
      items: [{ name: "Item", totalPrice: 80, quantity: 1, unitPrice: 80 }],
      taxAmount: 20, 
      taxRate: 0.19,
      discount: 0,
      category: "Other"
    };
    const score = calculateReceiptIntegrity(data);
    expect(score).toBeLessThan(100);
  });

  test("Zero Total Penalty", () => {
    const data: ReceiptData = {
      merchantName: "Bad Store",
      date: "2024-03-20",
      total: 0,
      currency: "USD",
      items: [],
      category: "Other"
    };
    const score = calculateReceiptIntegrity(data);
    expect(score).toBe(60); 
  });

});
