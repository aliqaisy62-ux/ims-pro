import { Request, Response } from 'express'
import {
  getCustomers, getCustomerById, createCustomer, updateCustomer,
  softDeleteCustomer, getCustomerStatement,
} from '../services/customer.service'

export async function listCustomers(req: Request, res: Response) {
  try {
    const { search, type, page, pageSize } = req.query
    const result = await getCustomers({
      search: search as string,
      type: type as string,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
    })
    res.json({ success: true, data: result })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch customers' })
  }
}

export async function getCustomer(req: Request, res: Response) {
  try {
    const customer = await getCustomerById(req.params.id)
    if (!customer) return res.status(404).json({ success: false, error: 'Customer not found' })
    res.json({ success: true, data: customer })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch customer' })
  }
}

export async function addCustomer(req: Request, res: Response) {
  try {
    const customer = await createCustomer(req.body)
    res.status(201).json({ success: true, data: customer })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to create customer' })
  }
}

export async function editCustomer(req: Request, res: Response) {
  try {
    const customer = await updateCustomer(req.params.id, req.body)
    res.json({ success: true, data: customer })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to update customer' })
  }
}

export async function deleteCustomer(req: Request, res: Response) {
  try {
    await softDeleteCustomer(req.params.id)
    res.json({ success: true })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to delete customer' })
  }
}

export async function customerStatement(req: Request, res: Response) {
  try {
    const { from, to } = req.query
    const data = await getCustomerStatement(req.params.id, from as string, to as string)
    res.json({ success: true, data })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to get customer statement' })
  }
}
