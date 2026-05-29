import { Request, Response } from 'express'
import {
  getPurchaseInvoices,
  getPurchaseInvoiceById,
  createPurchaseInvoice,
  confirmInvoice,
  cancelInvoice,
} from '../services/purchase.service'
import { createPurchaseInvoiceSchema } from '../validators/purchase.validator'

export async function listInvoices(req: Request, res: Response) {
  try {
    const { page, limit, status, supplierId, from, to, search } = req.query
    const result = await getPurchaseInvoices({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      status: status as string | undefined,
      supplierId: supplierId as string | undefined,
      from: from as string | undefined,
      to: to as string | undefined,
      search: search as string | undefined,
    })
    res.json({ success: true, data: result })
  } catch {
    res.status(500).json({ success: false, message: 'فشل في جلب فواتير الشراء' })
  }
}

export async function getInvoice(req: Request, res: Response) {
  try {
    const invoice = await getPurchaseInvoiceById(req.params.id)
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'الفاتورة غير موجودة' })
    }
    res.json({ success: true, data: invoice })
  } catch {
    res.status(500).json({ success: false, message: 'فشل في جلب الفاتورة' })
  }
}

export async function createInvoice(req: Request, res: Response) {
  try {
    const parsed = createPurchaseInvoiceSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'بيانات غير صالحة',
        details: parsed.error.flatten().fieldErrors,
      })
    }
    const invoice = await createPurchaseInvoice(parsed.data, req.user!.id)
    res.status(201).json({ success: true, data: invoice })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'فشل في إنشاء الفاتورة'
    res.status(500).json({ success: false, message: msg })
  }
}

export async function confirmInvoiceHandler(req: Request, res: Response) {
  try {
    const invoice = await confirmInvoice(req.params.id, req.user!.id)
    res.json({ success: true, data: invoice })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : ''
    if (msg === 'INVOICE_NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'الفاتورة غير موجودة' })
    }
    if (msg === 'INVALID_STATUS') {
      return res.status(400).json({ success: false, message: 'لا يمكن تأكيد هذه الفاتورة — الحالة غير صالحة' })
    }
    res.status(500).json({ success: false, message: 'فشل في تأكيد الفاتورة' })
  }
}

export async function cancelInvoiceHandler(req: Request, res: Response) {
  try {
    const invoice = await cancelInvoice(req.params.id, req.user!.id)
    res.json({ success: true, data: invoice })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : ''
    if (msg === 'INVOICE_NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'الفاتورة غير موجودة' })
    }
    if (msg === 'ALREADY_CANCELLED') {
      return res.status(400).json({ success: false, message: 'الفاتورة ملغاة مسبقاً' })
    }
    if (msg.startsWith('INSUFFICIENT_STOCK_TO_REVERSE:')) {
      return res.status(409).json({ success: false, message: 'لا يمكن إلغاء الفاتورة — الكمية المشتراة تم بيعها أو تحويلها بالفعل' })
    }
    res.status(500).json({ success: false, message: 'فشل في إلغاء الفاتورة' })
  }
}
