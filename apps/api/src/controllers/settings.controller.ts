import { Request, Response } from 'express'
import {
  updateSettingsSchema,
  updateExchangeRateSchema,
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
} from '../validators/settings.validator'
import {
  getAllSettings,
  updateSettings,
  updateExchangeRate,
  getExchangeRateHistory,
  getUsers,
  createUser,
  updateUser,
  resetPassword,
} from '../services/settings.service'

// ─── Settings handlers ────────────────────────────────────────────────────────

export async function getSettings(req: Request, res: Response) {
  try {
    const settings = await getAllSettings()
    res.json({ success: true, data: settings })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch settings' })
  }
}

export async function updateSettingsHandler(req: Request, res: Response) {
  try {
    const result = updateSettingsSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors,
      })
    }

    // Convert validated object to Record<string, string>
    const data: Record<string, string> = {}
    for (const [key, value] of Object.entries(result.data)) {
      if (value !== undefined) {
        data[key] = String(value)
      }
    }

    const settings = await updateSettings(data)
    res.json({ success: true, data: settings })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to update settings' })
  }
}

export async function updateExchangeRateHandler(req: Request, res: Response) {
  try {
    const result = updateExchangeRateSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors,
      })
    }

    await updateExchangeRate(result.data.rate, req.user!.id)
    res.json({ success: true, message: 'Exchange rate updated successfully' })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to update exchange rate' })
  }
}

export async function getExchangeRateHistoryHandler(req: Request, res: Response) {
  try {
    const history = await getExchangeRateHistory()
    res.json({ success: true, data: history })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch exchange rate history' })
  }
}

// ─── User management handlers ─────────────────────────────────────────────────

export async function listUsers(req: Request, res: Response) {
  try {
    const users = await getUsers()
    res.json({ success: true, data: users })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch users' })
  }
}

export async function createUserHandler(req: Request, res: Response) {
  try {
    const result = createUserSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors,
      })
    }

    const user = await createUser(result.data)
    res.status(201).json({ success: true, data: user })
  } catch (err) {
    if (err instanceof Error && err.message === 'USERNAME_TAKEN') {
      return res.status(409).json({ success: false, error: 'اسم المستخدم مستخدم بالفعل' })
    }
    res.status(500).json({ success: false, error: 'Failed to create user' })
  }
}

export async function updateUserHandler(req: Request, res: Response) {
  try {
    const result = updateUserSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors,
      })
    }

    const user = await updateUser(req.params.id, result.data)
    res.json({ success: true, data: user })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to update user' })
  }
}

export async function resetPasswordHandler(req: Request, res: Response) {
  try {
    const result = resetPasswordSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors,
      })
    }

    await resetPassword(req.params.id, result.data.newPassword)
    res.json({ success: true, message: 'Password reset successfully' })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to reset password' })
  }
}
