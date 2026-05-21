import { Request, Response } from 'express'
import {
  getItems,
  getItemById,
  getItemByBarcode,
  createItem,
  updateItem,
  softDeleteItem,
  getCategories,
} from '../services/item.service'

export async function listItems(req: Request, res: Response) {
  try {
    const { search, categoryId, lowStock, page, pageSize } = req.query
    const result = await getItems({
      search: search as string,
      categoryId: categoryId as string,
      lowStock: lowStock === 'true',
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
    })
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch items' })
  }
}

export async function getItem(req: Request, res: Response) {
  try {
    const item = await getItemById(req.params.id)
    if (!item) return res.status(404).json({ success: false, error: 'Item not found' })
    res.json({ success: true, data: item })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch item' })
  }
}

export async function lookupByBarcode(req: Request, res: Response) {
  try {
    const item = await getItemByBarcode(req.params.barcode)
    if (!item) return res.status(404).json({ success: false, error: 'Item not found' })
    res.json({ success: true, data: item })
  } catch {
    res.status(500).json({ success: false, error: 'Barcode lookup failed' })
  }
}

export async function addItem(req: Request, res: Response) {
  try {
    const item = await createItem(req.body)
    res.status(201).json({ success: true, data: item })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to create item'
    if (msg.includes('Unique constraint') && msg.includes('barcode')) {
      return res.status(409).json({ success: false, error: 'Barcode already exists' })
    }
    res.status(500).json({ success: false, error: msg })
  }
}

export async function editItem(req: Request, res: Response) {
  try {
    const item = await updateItem(req.params.id, req.body)
    res.json({ success: true, data: item })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to update item' })
  }
}

export async function deleteItem(req: Request, res: Response) {
  try {
    await softDeleteItem(req.params.id)
    res.json({ success: true })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to delete item' })
  }
}

export async function listCategories(_req: Request, res: Response) {
  try {
    const categories = await getCategories()
    res.json({ success: true, data: categories })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch categories' })
  }
}
