import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
    const isPrefetch = request.headers.get('x-nextjs-prefetch') === '1'
    const isPublicRoute = !request.nextUrl.pathname.startsWith('/dashboard')
    
    // Optimization: Skip session update for prefetches to improve responsiveness
    if (isPrefetch) {
        return NextResponse.next({ request })
    }

    return await updateSession(request, undefined, isPublicRoute)
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