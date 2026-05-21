import { AuthUser } from '@ims-pro/types'

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}
