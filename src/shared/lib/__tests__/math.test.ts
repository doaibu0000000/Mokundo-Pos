import { describe, it, expect } from 'vitest';
import { calculateTotals, calculateChange } from '../math';

describe('Cashier Math Calculations', () => {
  
  it('should calculate correct subtotal without tax or discount', () => {
    const items = [
      { price: 10000, qty: 2 },
      { price: 15000, qty: 1 }
    ];
    // 10000*2 + 15000*1 = 35000
    const result = calculateTotals(items, 0, 0, 0);
    
    expect(result.subtotal).toBe(35000);
    expect(result.discount).toBe(0);
    expect(result.tax).toBe(0);
    expect(result.serviceCharge).toBe(0);
    expect(result.total).toBe(35000);
  });

  it('should apply discount and respect cap limits', () => {
    const items = [{ price: 50000, qty: 1 }];
    
    // Normal discount
    let result = calculateTotals(items, 10000, 0, 0);
    expect(result.discount).toBe(10000);
    expect(result.total).toBe(40000);

    // Discount exceeds subtotal (capped at subtotal)
    result = calculateTotals(items, 60000, 0, 0);
    expect(result.discount).toBe(50000);
    expect(result.total).toBe(0);

    // Negative discount value checks
    result = calculateTotals(items, -5000, 0, 0);
    expect(result.discount).toBe(0);
    expect(result.total).toBe(50000);
  });

  it('should compute tax (PPN) correctly with rounding', () => {
    const items = [{ price: 25000, qty: 1 }];
    
    // 25000 * 11% = 2750
    const result = calculateTotals(items, 0, 11, 0);
    expect(result.tax).toBe(2750);
    expect(result.total).toBe(27750);
  });

  it('should compute tax and service charge simultaneously', () => {
    const items = [{ price: 100000, qty: 1 }];
    
    // Subtotal: 100000
    // Discount: 10000 -> net: 90000
    // Tax (10% of 90000): 9000
    // Service (5% of 90000): 4500
    // Total = 90000 + 9000 + 4500 = 103500
    const result = calculateTotals(items, 10000, 10, 5);
    
    expect(result.subtotal).toBe(100000);
    expect(result.discount).toBe(10000);
    expect(result.tax).toBe(9000);
    expect(result.serviceCharge).toBe(4500);
    expect(result.total).toBe(103500);
  });

  it('should calculate correct cash return change values', () => {
    // Normal change return
    expect(calculateChange(100000, 85000)).toBe(15000);

    // Exact cash paid
    expect(calculateChange(50000, 50000)).toBe(0);

    // Underpaid cash paid (change capped at 0, cashier validation prevents actual checkout)
    expect(calculateChange(40000, 50000)).toBe(0);
  });

});
