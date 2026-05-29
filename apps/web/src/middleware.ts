import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login']

// Routes that CASHIER role cannot visit — they'll be redirected to /pos
const CASHIER_BLOCKED: string[] = [
  '/dashboard',
  '/inventory',
  '/settings',
  '/reports',
  '/purchases',
  '/suppliers',
  '/expenses',
  '/vouchers',
  '/cash-statement',
  '/stock',
  '/staff',
]

function isCashierBlocked(pathname: string): boolean {
  return CASHIER_BLOCKED.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/')
  )
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasSession = request.cookies.has('__refresh_token')
  // Role cookie is non-HttpOnly so middleware can read it without a JWT secret.
  // Actual authorization is still enforced by requireRole on every API call.
  const role = request.cookies.get('__user_role')?.value

  // ── Public paths ──────────────────────────────────────────────────────────
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    if (hasSession) {
      const dest = role === 'CASHIER' ? '/pos' : '/dashboard'
      return NextResponse.redirect(new URL(dest, request.url))
    }
    return NextResponse.next()
  }

  // ── Require authentication ─────────────────────────────────────────────────
  if (!hasSession) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // ── CASHIER role restrictions ──────────────────────────────────────────────
  // Only enforced when role cookie is present (after first login/refresh with new code).
  // Existing sessions without the cookie fall through to client-side RBAC in layout.tsx.
  if (role === 'CASHIER' && isCashierBlocked(pathname)) {
    return NextResponse.redirect(new URL('/pos', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
