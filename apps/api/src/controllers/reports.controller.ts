import { Request, Response } from 'express'
import {
  getSalesReport,
  getPurchasesReport,
  getProfitReport,
  getInventoryReport,
  getCustomerStatement,
  getSupplierStatement,
} from '../services/reports.service'

export async function salesReport(req: Request, res: Response) {
  try {
    const { from, to, customerId, status } = req.query
    const data = await getSalesReport({
      from: (from as string) ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
      to: (to as string) ?? new Date().toISOString().slice(0, 10),
      customerId: customerId as string | undefined,
      status: status as string | undefined,
    })
    res.json({ success: true, data })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to generate sales report'
    res.status(500).json({ success: false, error: msg })
  }
}

export async function purchasesReport(req: Request, res: Response) {
  try {
    const { from, to, supplierId } = req.query
    const data = await getPurchasesReport({
      from: (from as string) ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
      to: (to as string) ?? new Date().toISOString().slice(0, 10),
      supplierId: supplierId as string | undefined,
    })
    res.json({ success: true, data })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to generate purchases report'
    res.status(500).json({ success: false, error: msg })
  }
}

export async function profitReport(req: Request, res: Response) {
  try {
    const { from, to } = req.query
    if (!from || !to) {
      return res.status(400).json({ success: false, error: 'يجب تحديد تاريخ البداية والنهاية' })
    }
    const data = await getProfitReport({
      from: from as string,
      to: to as string,
    })
    res.json({ success: true, data })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to generate profit report'
    res.status(500).json({ success: false, error: msg })
  }
}

export async function inventoryReport(_req: Request, res: Response) {
  try {
    const data = await getInventoryReport()
    res.json({ success: true, data })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to generate inventory report'
    res.status(500).json({ success: false, error: msg })
  }
}

export async function customerStatement(req: Request, res: Response) {
  try {
    const { from, to } = req.query
    const data = await getCustomerStatement({
      customerId: req.params.id,
      from: from as string | undefined,
      to: to as string | undefined,
    })
    res.json({ success: true, data })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to generate customer statement'
    if (msg === 'CUSTOMER_NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'العميل غير موجود' })
    }
    res.status(500).json({ success: false, error: msg })
  }
}

export async function supplierStatement(req: Request, res: Response) {
  try {
    const { from, to } = req.query
    const data = await getSupplierStatement({
      supplierId: req.params.id,
      from: from as string | undefined,
      to: to as string | undefined,
    })
    res.json({ success: true, data })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to generate supplier statement'
    if (msg === 'SUPPLIER_NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'المورد غير موجود' })
    }
    res.status(500).json({ success: false, error: msg })
  }
}
