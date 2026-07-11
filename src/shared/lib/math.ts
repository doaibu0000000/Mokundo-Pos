// src/shared/lib/math.ts

export interface CartMathItem {
  price: number;
  qty: number;
}

export function calculateTotals(
  cartItems: CartMathItem[],
  discountAmount: number,
  taxPercent: number,
  servicePercent: number
) {
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const taxRate = taxPercent / 100;
  const serviceRate = servicePercent / 100;

  // Apply absolute discount value limited by subtotal
  const discount = Math.min(Math.max(0, discountAmount), subtotal);
  const afterDiscount = subtotal - discount;

  const tax = Math.round(afterDiscount * taxRate);
  const serviceCharge = Math.round(afterDiscount * serviceRate);
  const total = afterDiscount + tax + serviceCharge;

  return {
    subtotal,
    discount,
    tax,
    serviceCharge,
    total
  };
}

export function calculateChange(cashPaid: number, total: number): number {
  return Math.max(0, cashPaid - total);
}
