/**
 * Financial Business Rules — Unit Test Suite
 *
 * Coverage:
 *   T1  Validator: sales invoice discount clamped 0–100
 *   T2  Validator: purchase invoice discount clamped 0–100
 *   T3  Validator: line-item discount clamped 0–100
 *   T4  Validator: line quantity must be positive
 *   T5  Validator: exchange rate must be positive
 *   T6  Calculation: line subtotal with discount
 *   T7  Calculation: invoice total after invoice-level discount
 *   T8  Calculation: total never negative (max discount = 100%)
 *   T9  Partial return: first return within sold qty — allowed
 *   T10 Partial return: second return — cumulative check
 *   T11 Partial return: cumulative over-return — rejected
 *   T12 Partial return: full return detection
 *   T13 Purchase cancel: stock sufficient — allowed
 *   T14 Purchase cancel: stock insufficient — rejected
 *   T15 amountPaid: NaN rejected at controller level
 *   T16 amountPaid: Infinity rejected
 *   T17 amountPaid: negative rejected
 *   T18 amountPaid: valid finite non-negative — accepted
 */

import { createSalesInvoiceSchema, salesLineSchema } from '../validators/sales.validator'
import { createPurchaseInvoiceSchema, purchaseLineSchema } from '../validators/purchase.validator'

// ── Pure calculation helpers (mirrors service logic) ──────────────────────────

function calcLineSubtotal(qty: number, price: number, discountPct: number): number {
  return qty * price * (1 - discountPct / 100)
}

function calcInvoiceTotal(subtotal: number, invoiceDiscountPct: number): number {
  return subtotal * (1 - invoiceDiscountPct / 100)
}

function calcRemainingReturnable(soldQty: number, returnedQty: number): number {
  return soldQty - returnedQty
}

function canReturn(soldQty: number, alreadyReturned: number, requesting: number): boolean {
  return requesting > 0 && requesting <= soldQty - alreadyReturned
}

function purchaseCancelAllowed(currentStock: number, reversedQty: number): boolean {
  return currentStock >= reversedQty
}

function isValidAmountPaid(value: unknown): boolean {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0
}

// ── T1–T5: Validator boundary tests ──────────────────────────────────────────

describe('T1 — Sales invoice: invoice-level discount schema validation', () => {
  const base = {
    priceType: 'RETAIL' as const,
    paymentType: 'CASH' as const,
    currency: 'IQD' as const,
    exchangeRate: 1480,
    items: [{ itemId: 'cltest000000000000000001', quantity: 1, unitPrice: 1000, discount: 0 }],
  }

  it('accepts 0%', () => {
    expect(createSalesInvoiceSchema.safeParse({ ...base, discount: 0 }).success).toBe(true)
  })
  it('accepts 50%', () => {
    expect(createSalesInvoiceSchema.safeParse({ ...base, discount: 50 }).success).toBe(true)
  })
  it('accepts 100%', () => {
    expect(createSalesInvoiceSchema.safeParse({ ...base, discount: 100 }).success).toBe(true)
  })
  it('rejects 101%', () => {
    expect(createSalesInvoiceSchema.safeParse({ ...base, discount: 101 }).success).toBe(false)
  })
  it('rejects -1%', () => {
    expect(createSalesInvoiceSchema.safeParse({ ...base, discount: -1 }).success).toBe(false)
  })
  it('rejects NaN', () => {
    expect(createSalesInvoiceSchema.safeParse({ ...base, discount: NaN }).success).toBe(false)
  })
})

describe('T2 — Purchase invoice: invoice-level discount schema validation', () => {
  const base = {
    supplierId: 'cltest000000000000000001',
    currency: 'IQD' as const,
    exchangeRate: 1480,
    items: [{ itemId: 'cltest000000000000000002', quantity: 1, unitCost: 500, discount: 0 }],
  }

  it('accepts 0%', () => {
    expect(createPurchaseInvoiceSchema.safeParse({ ...base, discount: 0 }).success).toBe(true)
  })
  it('accepts 100%', () => {
    expect(createPurchaseInvoiceSchema.safeParse({ ...base, discount: 100 }).success).toBe(true)
  })
  it('rejects 101%', () => {
    expect(createPurchaseInvoiceSchema.safeParse({ ...base, discount: 101 }).success).toBe(false)
  })
  it('rejects negative', () => {
    expect(createPurchaseInvoiceSchema.safeParse({ ...base, discount: -5 }).success).toBe(false)
  })
})

describe('T3 — Line-item discount clamped 0–100', () => {
  const validLine = { itemId: 'cltest000000000000000001', quantity: 2, unitPrice: 1000 }

  it('accepts 0', () => {
    expect(salesLineSchema.safeParse({ ...validLine, discount: 0 }).success).toBe(true)
  })
  it('accepts 100', () => {
    expect(salesLineSchema.safeParse({ ...validLine, discount: 100 }).success).toBe(true)
  })
  it('rejects 100.01', () => {
    expect(salesLineSchema.safeParse({ ...validLine, discount: 100.01 }).success).toBe(false)
  })
  it('rejects -0.01', () => {
    expect(salesLineSchema.safeParse({ ...validLine, discount: -0.01 }).success).toBe(false)
  })
})

describe('T4 — Line quantity must be positive', () => {
  it('rejects 0 quantity', () => {
    const r = salesLineSchema.safeParse({ itemId: 'cltest000000000000000001', quantity: 0, unitPrice: 100 })
    expect(r.success).toBe(false)
  })
  it('rejects negative quantity', () => {
    const r = salesLineSchema.safeParse({ itemId: 'cltest000000000000000001', quantity: -1, unitPrice: 100 })
    expect(r.success).toBe(false)
  })
  it('accepts fractional positive quantity', () => {
    const r = salesLineSchema.safeParse({ itemId: 'cltest000000000000000001', quantity: 0.5, unitPrice: 100 })
    expect(r.success).toBe(true)
  })
})

describe('T5 — Exchange rate must be positive', () => {
  const base = {
    priceType: 'RETAIL' as const,
    paymentType: 'CASH' as const,
    currency: 'IQD' as const,
    discount: 0,
    items: [{ itemId: 'cltest000000000000000001', quantity: 1, unitPrice: 1000 }],
  }

  it('rejects 0 exchange rate', () => {
    expect(createSalesInvoiceSchema.safeParse({ ...base, exchangeRate: 0 }).success).toBe(false)
  })
  it('rejects negative exchange rate', () => {
    expect(createSalesInvoiceSchema.safeParse({ ...base, exchangeRate: -1 }).success).toBe(false)
  })
  it('accepts positive exchange rate', () => {
    expect(createSalesInvoiceSchema.safeParse({ ...base, exchangeRate: 1480 }).success).toBe(true)
  })
})

// ── T6–T8: Calculation correctness ───────────────────────────────────────────

describe('T6 — Line subtotal with line-level discount', () => {
  it('qty=10, price=1000, discount=0% → 10000', () => {
    expect(calcLineSubtotal(10, 1000, 0)).toBe(10000)
  })
  it('qty=10, price=1000, discount=10% → 9000', () => {
    expect(calcLineSubtotal(10, 1000, 10)).toBeCloseTo(9000)
  })
  it('qty=10, price=1000, discount=100% → 0', () => {
    expect(calcLineSubtotal(10, 1000, 100)).toBe(0)
  })
})

describe('T7 — Invoice total after invoice-level discount', () => {
  it('subtotal=10000, discount=0% → 10000', () => {
    expect(calcInvoiceTotal(10000, 0)).toBe(10000)
  })
  it('subtotal=10000, discount=20% → 8000', () => {
    expect(calcInvoiceTotal(10000, 20)).toBeCloseTo(8000)
  })
  it('subtotal=10000, discount=100% → 0', () => {
    expect(calcInvoiceTotal(10000, 100)).toBe(0)
  })
})

describe('T8 — Total is never negative with valid discounts (0–100%)', () => {
  const cases = [0, 25, 50, 75, 99.99, 100]
  for (const lineDisc of cases) {
    for (const invDisc of cases) {
      it(`line ${lineDisc}% + invoice ${invDisc}%`, () => {
        const lineTotal = calcLineSubtotal(10, 1000, lineDisc)
        const total = calcInvoiceTotal(lineTotal, invDisc)
        expect(total).toBeGreaterThanOrEqual(0)
      })
    }
  }
})

// ── T9–T12: Cumulative partial return logic ───────────────────────────────────

describe('T9 — Partial return: first return within sold qty', () => {
  it('sold=10, returned=0, requesting=5 → allowed', () => {
    expect(canReturn(10, 0, 5)).toBe(true)
  })
  it('sold=10, returned=0, requesting=10 → allowed (full)', () => {
    expect(canReturn(10, 0, 10)).toBe(true)
  })
})

describe('T10 — Partial return: cumulative second return', () => {
  it('sold=10, alreadyReturned=5, requesting=5 → allowed (completes return)', () => {
    expect(canReturn(10, 5, 5)).toBe(true)
  })
  it('sold=10, alreadyReturned=5, requesting=4 → allowed (partial second)', () => {
    expect(canReturn(10, 5, 4)).toBe(true)
  })
  it('sold=10, alreadyReturned=5, requesting=3 → remaining=5, allowed', () => {
    expect(calcRemainingReturnable(10, 5)).toBe(5)
    expect(canReturn(10, 5, 3)).toBe(true)
  })
})

describe('T11 — Partial return: cumulative over-return rejected', () => {
  it('sold=10, returned=5, requesting=6 → rejected (5+6=11 > 10)', () => {
    expect(canReturn(10, 5, 6)).toBe(false)
  })
  it('sold=10, returned=10, requesting=1 → rejected (already fully returned)', () => {
    expect(canReturn(10, 10, 1)).toBe(false)
  })
  it('sold=1, returned=0, requesting=2 → rejected', () => {
    expect(canReturn(1, 0, 2)).toBe(false)
  })
})

describe('T12 — Partial return: full return detection', () => {
  function isFullReturn(
    invoiceLines: { soldQty: number; returnedQty: number }[],
    batch: { lineIdx: number; qty: number }[]
  ): boolean {
    return invoiceLines.every((line, idx) => {
      const req = batch.find((b) => b.lineIdx === idx)
      const afterBatch = line.returnedQty + (req ? req.qty : 0)
      return afterBatch >= line.soldQty
    })
  }

  it('single line, returning all remaining → full', () => {
    const lines = [{ soldQty: 10, returnedQty: 0 }]
    expect(isFullReturn(lines, [{ lineIdx: 0, qty: 10 }])).toBe(true)
  })
  it('single line, partial return → not full', () => {
    const lines = [{ soldQty: 10, returnedQty: 0 }]
    expect(isFullReturn(lines, [{ lineIdx: 0, qty: 5 }])).toBe(false)
  })
  it('two lines, only returning one → not full', () => {
    const lines = [{ soldQty: 5, returnedQty: 0 }, { soldQty: 3, returnedQty: 0 }]
    expect(isFullReturn(lines, [{ lineIdx: 0, qty: 5 }])).toBe(false)
  })
  it('two lines, second already fully returned, returning remaining of first → full', () => {
    const lines = [{ soldQty: 5, returnedQty: 2 }, { soldQty: 3, returnedQty: 3 }]
    expect(isFullReturn(lines, [{ lineIdx: 0, qty: 3 }])).toBe(true)
  })
})

// ── T13–T14: Purchase cancellation stock guard ────────────────────────────────

describe('T13-T14 — Purchase cancel: stock guard (no clamping)', () => {
  it('T13: currentStock=100, purchased=50 → cancel allowed (50 returned → 50 left)', () => {
    expect(purchaseCancelAllowed(100, 50)).toBe(true)
  })
  it('T13: currentStock=50, purchased=50 → cancel allowed (exactly clears stock)', () => {
    expect(purchaseCancelAllowed(50, 50)).toBe(true)
  })
  it('T14: currentStock=30, purchased=50 → rejected (20 units already sold/moved)', () => {
    expect(purchaseCancelAllowed(30, 50)).toBe(false)
  })
  it('T14: currentStock=0, purchased=10 → rejected (all units gone)', () => {
    expect(purchaseCancelAllowed(0, 10)).toBe(false)
  })
  it('T14: currentStock=49, purchased=50 → rejected (1 unit short)', () => {
    expect(purchaseCancelAllowed(49, 50)).toBe(false)
  })
})

// ── T15–T18: amountPaid validation ───────────────────────────────────────────

describe('T15-T18 — amountPaid validation at controller boundary', () => {
  it('T15: NaN is invalid', () => {
    expect(isValidAmountPaid(NaN)).toBe(false)
  })
  it('T15: string "abc" converts to NaN — invalid', () => {
    expect(isValidAmountPaid('abc')).toBe(false)
  })
  it('T16: Infinity is invalid', () => {
    expect(isValidAmountPaid(Infinity)).toBe(false)
  })
  it('T16: -Infinity is invalid', () => {
    expect(isValidAmountPaid(-Infinity)).toBe(false)
  })
  it('T17: -1 is invalid (negative)', () => {
    expect(isValidAmountPaid(-1)).toBe(false)
  })
  it('T17: -0.001 is invalid', () => {
    expect(isValidAmountPaid(-0.001)).toBe(false)
  })
  it('T18: 0 is valid (free / already paid)', () => {
    expect(isValidAmountPaid(0)).toBe(true)
  })
  it('T18: 1000 is valid', () => {
    expect(isValidAmountPaid(1000)).toBe(true)
  })
  it('T18: 0.5 is valid', () => {
    expect(isValidAmountPaid(0.5)).toBe(true)
  })
  it('T18: string "1000" coerces to 1000 — valid', () => {
    expect(isValidAmountPaid('1000')).toBe(true)
  })
})
