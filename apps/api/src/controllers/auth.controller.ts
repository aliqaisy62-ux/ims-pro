import { Request, Response } from 'express'
import { validateCredentials, generateAccessToken, generateRefreshToken, verifyRefreshToken, getUserById } from '../services/auth.service'

const COOKIE_NAME = '__refresh_token'
// HTTPS_ENABLED must be explicitly set to "true" — NODE_ENV alone is not enough
// because LAN deployments run production mode over plain HTTP.
const isHttps = process.env.HTTPS_ENABLED === 'true'
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: isHttps ? ('none' as const) : ('lax' as const),
  secure: isHttps,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
}

export async function login(req: Request, res: Response) {
  const { username, password } = req.body
  const user = await validateCredentials(username, password)
  if (!user) {
    return res.status(401).json({ success: false, error: 'Invalid username or password' })
  }
  const accessToken = generateAccessToken(user)
  const refreshToken = generateRefreshToken(user.id)
  res.cookie(COOKIE_NAME, refreshToken, COOKIE_OPTIONS)
  return res.json({ success: true, data: { accessToken, user } })
}

export async function refresh(req: Request, res: Response) {
  const token = req.cookies?.[COOKIE_NAME]
  if (!token) {
    return res.status(401).json({ success: false, error: 'No refresh token' })
  }
  const payload = verifyRefreshToken(token)
  if (!payload) {
    res.clearCookie(COOKIE_NAME)
    return res.status(401).json({ success: false, error: 'Invalid refresh token' })
  }
  const user = await getUserById(payload.sub)
  if (!user) {
    res.clearCookie(COOKIE_NAME)
    return res.status(401).json({ success: false, error: 'User not found or deactivated' })
  }
  const newRefreshToken = generateRefreshToken(user.id)
  res.cookie(COOKIE_NAME, newRefreshToken, COOKIE_OPTIONS)
  return res.json({ success: true, data: { accessToken: generateAccessToken(user), user } })
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie(COOKIE_NAME)
  return res.json({ success: true })
}

export async function me(req: Request, res: Response) {
  return res.json({ success: true, data: { user: req.user } })
}
