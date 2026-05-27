import { NextResponse } from 'next/server'

// DEV MODE: auth bypassed — all routes are open
export function middleware() {
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
