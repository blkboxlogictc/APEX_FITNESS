import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/signup', '/onboarding', '/forgot-password', '/auth']

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow static assets and public paths through immediately
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/splash') ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js' ||
    pathname === '/offline.html' ||
    pathname === '/favicon.ico'
  ) {
    return addSecurityHeaders(NextResponse.next())
  }

  let response = NextResponse.next({ request: { headers: req.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
          response = NextResponse.next({ request: { headers: req.headers } })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  // Root redirect
  if (pathname === '/') {
    return NextResponse.redirect(new URL(session ? '/home' : '/login', req.url))
  }

  // Logged-in users don't need auth pages
  if (session && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/home', req.url))
  }

  // Protected routes require auth
  if (!session) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return addSecurityHeaders(response)
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()')
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|.*\\.png$|.*\\.svg$).*)'],
}
