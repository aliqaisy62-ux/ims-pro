import { Request, Response } from 'express'
import { createSalesInvoiceSchema } from '../validators/sales.validator'
import {
  getSalesInvoices,
  getSalesInvoiceById,
  createSalesInvoice,
  confirmInvoice,
  cancelInvoice,
  returnInvoice,
  partialReturnInvoice,
} from '../services/sales.service'
import { logAudit } from '../services/audit.service'

export async function listInvoices(req: Request, res: Response) {
  try {
    const { page, limit, status, customerId, from, to, search } = req.query
    const result = await getSalesInvoices({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      status: status as string | undefined,
      customerId: customerId as string | undefined,
      from: from as string | undefined,
      to: to as string | undefined,
      search: search as string | undefined,
    })
    res.json({ success: true, data: result })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch invoices' })
  }
}

export async function getInvoice(req: Request, res: Response) {
  try {
    const invoice = await getSalesInvoiceById(req.params.id)
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' })
    res.json({ success: true, data: invoice })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch invoice' })
  }
}

export async function createInvoice(req: Request, res: Response) {
  try {
    const parsed = createSalesInvoiceSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      })
    }
    const invoice = await createSalesInvoice(parsed.data, req.user!.id)
    logAudit(req.user!.id, 'CREATE', 'SalesInvoice', invoice.id, undefined, req.ip)
    res.status(201).json({ success: true, data: invoice })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to create invoice'
    if (msg === 'CREDIT_REQUIRES_CUSTOMER') {
      return res.status(400).json({ success: false, error: 'الفاتورة الآجلة تتطلب تحديد عميل' })
    }
    res.status(500).json({ success: false, error: msg })
  }
}

export async function confirmInvoiceHandler(req: Request, res: Response) {
  try {
    const amountPaid = req.body?.amountPaid != null ? Number(req.body.amountPaid) : undefined
    const invoice = await confirmInvoice(req.params.id, req.user!.id, amountPaid)
    res.json({ success: true, data: invoice })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to confirm invoice'
    if (msg === 'INVOICE_NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'الفاتورة غير موجودة' })
    }
    if (msg === 'INVOICE_NOT_DRAFT') {
      return res.status(400).json({ success: false, error: 'لا يمكن تأكيد فاتورة ليست في حالة مسودة' })
    }
    if (msg.startsWith('INSUFFICIENT_STOCK:')) {
      const parts = msg.split(':')
      const itemName = parts[1] || 'المنتج'
      return res.status(400).json({ success: false, error: `الكمية غير كافية للمنتج: ${itemName}` })
    }
    res.status(500).json({ success: false, error: 'Failed to confirm invoice' })
  }
}

export async function cancelInvoiceHandler(req: Request, res: Response) {
  try {
    const invoice = await cancelInvoice(req.params.id, req.user!.id)
    res.json({ success: true, data: invoice })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to cancel invoice'
    if (msg === 'INVOICE_NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'الفاتورة غير موجودة' })
    }
    if (msg === 'ALREADY_CANCELLED') {
      return res.status(400).json({ success: false, error: 'الفاتورة ملغاة بالفعل' })
    }
    res.status(500).json({ success: false, error: 'Failed to cancel invoice' })
  }
}

export async function returnInvoiceHandler(req: Request, res: Response) {
  try {
    const invoice = await returnInvoice(req.params.id, req.user!.id)
    res.json({ success: true, data: invoice })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to return invoice'
    if (msg === 'INVOICE_NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'الفاتورة غير موجودة' })
    }
    if (msg === 'ONLY_CONFIRMED_CAN_BE_RETURNED') {
      return res.status(400).json({ success: false, error: 'يمكن إرجاع الفواتير المؤكدة فقط' })
    }
    res.status(500).json({ success: false, error: 'Failed to return invoice' })
  }
}

export async function partialReturnHandler(req: Request, res: Response) {
  try {
    const { items } = req.body as { items?: { itemId: string; quantity: number }[] }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'يجب تحديد أصناف للإرجاع' })
    }
    const invoice = await partialReturnInvoice(req.params.id, items, req.user!.id)
    res.json({ success: true, data: invoice })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to process return'
    if (msg === 'INVOICE_NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'الفاتورة غير موجودة' })
    }
    if (msg === 'ONLY_CONFIRMED_CAN_BE_RETURNED') {
      return res.status(400).json({ success: false, error: 'يمكن إرجاع الفواتير المؤكدة فقط' })
    }
    if (msg.startsWith('ITEM_NOT_IN_INVOICE:')) {
      return res.status(400).json({ success: false, error: 'صنف غير موجود في الفاتورة' })
    }
    if (msg.startsWith('RETURN_QTY_EXCEEDS_SOLD:')) {
      return res.status(400).json({ success: false, error: 'كمية الإرجاع تتجاوز الكمية المباعة' })
    }
    res.status(500).json({ success: false, error: 'Failed to process return' })
  }
}
