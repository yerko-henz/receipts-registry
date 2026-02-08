import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
    // Only handle Supabase session management
    return await updateSession(request)
}

export const config = {
    matcher: [
        // Match all pathnames except for
        // - API routes
        // - _next (static files)
        // - static files (svg, png, etc.)
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}