import { Request, Response } from 'express'
import { posCheckoutSchema } from '../validators/pos.validator'
import { posCheckout } from '../services/pos.service'

export async function checkoutHandler(req: Request, res: Response) {
  const parsed = posCheckoutSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: parsed.error.flatten().fieldErrors,
    })
  }

  try {
    const invoice = await posCheckout(parsed.data, req.user!.id)
    return res.status(201).json({ success: true, data: invoice })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Checkout failed'

    if (msg === 'CREDIT_REQUIRES_CUSTOMER') {
      return res.status(400).json({ success: false, error: 'الدفع الآجل يتطلب تحديد عميل' })
    }
    if (msg === 'ITEM_NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'منتج غير موجود في قاعدة البيانات' })
    }
    if (msg.startsWith('INSUFFICIENT_STOCK:')) {
      const name = msg.split(':')[1] || 'المنتج'
      return res.status(409).json({ success: false, error: `الكمية غير كافية: ${name}` })
    }

    return res.status(500).json({ success: false, error: 'فشل في إتمام عملية البيع' })
  }
}
