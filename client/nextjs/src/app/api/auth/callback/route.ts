import { NextResponse } from 'next/server'
import { createSSRSassClient } from "@/lib/supabase/server";
import { cookies } from 'next/headers';

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    let next = requestUrl.searchParams.get('next')

    // If no next param, check cookie
    if (!next) {
        const cookieStore = await cookies();
        const nextCookie = cookieStore.get('auth-next-redirect');
        if (nextCookie) {
            next = nextCookie.value;
        }
    }

    if (code) {
        const supabase = await createSSRSassClient()
        const client = supabase.getSupabaseClient()

        // Exchange the code for a session
        await supabase.exchangeCodeForSession(code)

        // Check MFA status
        const { data: aal, error: aalError } = await client.auth.mfa.getAuthenticatorAssuranceLevel()

        if (aalError) {
            console.error('Error checking MFA status:', aalError)
            return NextResponse.redirect(new URL('/auth/login', request.url))
        }

        // If user needs to complete MFA verification
        if (aal.nextLevel === 'aal2' && aal.nextLevel !== aal.currentLevel) {
            return NextResponse.redirect(new URL('/auth/2fa', request.url))
        }

        // If MFA is not required or already verified, proceed to app
        if (next) {
             const response = NextResponse.redirect(new URL(next, request.url));
             // Clean up cookie
             response.cookies.delete('auth-next-redirect');
             return response;
        }
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // If no code provided, redirect to login
    return NextResponse.redirect(new URL('/auth/login', request.url))
}