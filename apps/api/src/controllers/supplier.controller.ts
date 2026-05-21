import { Request, Response } from 'express'
import {
  getSuppliers, getSupplierById, createSupplier, updateSupplier,
  softDeleteSupplier, getSupplierStatement,
} from '../services/supplier.service'

export async function listSuppliers(req: Request, res: Response) {
  try {
    const { search, page, pageSize } = req.query
    const result = await getSuppliers({
      search: search as string,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
    })
    res.json({ success: true, data: result })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch suppliers' })
  }
}

export async function getSupplier(req: Request, res: Response) {
  try {
    const supplier = await getSupplierById(req.params.id)
    if (!supplier) return res.status(404).json({ success: false, error: 'Supplier not found' })
    res.json({ success: true, data: supplier })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch supplier' })
  }
}

export async function addSupplier(req: Request, res: Response) {
  try {
    const supplier = await createSupplier(req.body)
    res.status(201).json({ success: true, data: supplier })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to create supplier' })
  }
}

export async function editSupplier(req: Request, res: Response) {
  try {
    const supplier = await updateSupplier(req.params.id, req.body)
    res.json({ success: true, data: supplier })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to update supplier' })
  }
}

export async function deleteSupplier(req: Request, res: Response) {
  try {
    await softDeleteSupplier(req.params.id)
    res.json({ success: true })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to delete supplier' })
  }
}

export async function supplierStatement(req: Request, res: Response) {
  try {
    const { from, to } = req.query
    const data = await getSupplierStatement(req.params.id, from as string, to as string)
    res.json({ success: true, data })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to get supplier statement' })
  }
}
