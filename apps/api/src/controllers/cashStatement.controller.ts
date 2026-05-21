import { Request, Response } from 'express'
import {
  getTodayStatement,
  getStatementByDate,
  closeStatement,
  getStatementRange,
} from '../services/cashStatement.service'

export async function getToday(req: Request, res: Response) {
  try {
    const data = await getTodayStatement()
    res.json({ success: true, data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch today statement'
    res.status(500).json({ success: false, error: message })
  }
}

export async function getByDate(req: Request, res: Response) {
  const date = req.query.date as string | undefined
  if (!date) {
    return res.status(400).json({ success: false, error: 'Missing required query param: date (YYYY-MM-DD)' })
  }
  try {
    const data = await getStatementByDate(date)
    res.json({ success: true, data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch statement'
    res.status(500).json({ success: false, error: message })
  }
}

export async function closeToday(req: Request, res: Response) {
  try {
    const notes = req.body?.notes as string | undefined
    const data = await closeStatement(req.user!.id, notes)
    res.json({ success: true, data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to close statement'
    res.status(500).json({ success: false, error: message })
  }
}

export async function getRange(req: Request, res: Response) {
  const from = req.query.from as string | undefined
  const to = req.query.to as string | undefined
  if (!from || !to) {
    return res.status(400).json({ success: false, error: 'Missing required query params: from and to (YYYY-MM-DD)' })
  }
  try {
    const data = await getStatementRange(from, to)
    res.json({ success: true, data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch statement range'
    res.status(500).json({ success: false, error: message })
  }
}
