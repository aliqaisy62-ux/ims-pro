import { Request, Response } from 'express'
import { createStockTransferSchema } from '../validators/stock.validator'
import {
  getStockTransfers,
  createStockTransfer,
  getInventory,
  getLowStockItems,
  getExpiringItems,
} from '../services/stock.service'

export async function listTransfers(req: Request, res: Response) {
  try {
    const { page, limit, itemId, type, reason, from, to } = req.query
    const result = await getStockTransfers({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      itemId: itemId as string | undefined,
      type: type as string | undefined,
      reason: reason as string | undefined,
      from: from as string | undefined,
      to: to as string | undefined,
    })
    res.json({ success: true, data: result })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch stock transfers' })
  }
}

export async function createTransfer(req: Request, res: Response) {
  try {
    const result = createStockTransferSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors,
      })
    }
    const transfer = await createStockTransfer(result.data, req.user!.id)
    res.status(201).json({ success: true, data: transfer })
  } catch (err) {
    if (err instanceof Error && err.message === 'INSUFFICIENT_STOCK') {
      return res.status(400).json({ success: false, error: 'INSUFFICIENT_STOCK' })
    }
    if (err instanceof Error && err.message === 'ITEM_NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'Item not found' })
    }
    res.status(500).json({ success: false, error: 'Failed to create stock transfer' })
  }
}

export async function getInventoryHandler(req: Request, res: Response) {
  try {
    const { search, categoryId, lowStock } = req.query
    const items = await getInventory({
      search: search as string | undefined,
      categoryId: categoryId as string | undefined,
      lowStock: lowStock === 'true',
    })
    res.json({ success: true, data: items })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch inventory' })
  }
}

export async function getLowStockHandler(_req: Request, res: Response) {
  try {
    const items = await getLowStockItems()
    res.json({ success: true, data: items })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch low-stock items' })
  }
}

export async function getExpiringHandler(req: Request, res: Response) {
  try {
    const days = Number(req.query.days) || 30
    const items = await getExpiringItems(days)
    res.json({ success: true, data: items })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch expiring items' })
  }
}
