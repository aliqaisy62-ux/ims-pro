import { Request, Response } from 'express'
import { createVoucherSchema } from '../validators/voucher.validator'
import { getVouchers, getVoucherById, createVoucher } from '../services/voucher.service'

export async function listVouchers(req: Request, res: Response) {
  try {
    const { page, limit, type, entityType, entityId, from, to } = req.query
    const result = await getVouchers({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      type: type as string | undefined,
      entityType: entityType as string | undefined,
      entityId: entityId as string | undefined,
      from: from as string | undefined,
      to: to as string | undefined,
    })
    res.json({ success: true, data: result })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch vouchers' })
  }
}

export async function getVoucher(req: Request, res: Response) {
  try {
    const voucher = await getVoucherById(req.params.id)
    if (!voucher) {
      return res.status(404).json({ success: false, error: 'Voucher not found' })
    }
    res.json({ success: true, data: voucher })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch voucher' })
  }
}

export async function createVoucherHandler(req: Request, res: Response) {
  try {
    const result = createVoucherSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors,
      })
    }
    const voucher = await createVoucher(result.data, req.user!.id)
    res.status(201).json({ success: true, data: voucher })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create voucher'
    res.status(500).json({ success: false, error: message })
  }
}
