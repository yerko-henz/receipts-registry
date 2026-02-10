import {createServerClient} from '@supabase/ssr'
import {cookies} from 'next/headers'
import {ClientType, SassClient} from "@/lib/supabase/unified";
import {Database} from "@/lib/types";

export async function createSSRClient() {
    const cookieStore = await cookies()
    
    // Check for E2E test mode
    if (cookieStore.get('E2E_TEST_MODE')?.value === 'true') {
        const storedUser = cookieStore.get('E2E_TEST_USER')?.value;
        let mockUser = null;

        if (storedUser) {
            try {
                const parsed = JSON.parse(decodeURIComponent(storedUser));
                mockUser = {
                    id: 'test-user-id',
                    aud: 'authenticated',
                    role: 'authenticated',
                    email: 'test@example.com',
                    email_confirmed_at: new Date().toISOString(),
                    phone: '',
                    confirmation_sent_at: new Date().toISOString(),
                    confirmed_at: new Date().toISOString(),
                    last_sign_in_at: new Date().toISOString(),
                    app_metadata: { provider: 'email', providers: ['email'] },
                    user_metadata: { full_name: 'Test User' },
                    identities: [],
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    ...parsed
                };
            } catch (e) {
                console.error('Failed to parse E2E_TEST_USER cookie', e);
            }
        }

        const queryMock = () => ({
            select: queryMock,
            eq: queryMock,
            order: queryMock,
            limit: queryMock,
            single: async () => ({ data: null, error: null }),
            maybeSingle: async () => ({ data: null, error: null }),
            then: (onfulfilled: any) => Promise.resolve({ data: [], error: null }).then(onfulfilled)
        });

        return {
            auth: {
                getUser: async () => ({ data: { user: mockUser as any }, error: null }),
                getSession: async () => ({ 
                    data: { 
                        session: mockUser ? { 
                            user: mockUser,
                            access_token: 'mock-token',
                            refresh_token: 'mock-refresh-token',
                            expires_in: 3600,
                            token_type: 'bearer'
                        } : null
                    }, 
                    error: null 
                }),
                onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
            },
            from: queryMock,
        } as unknown as ReturnType<typeof createServerClient<Database, "public", Database["public"]>>;
    }

    return createServerClient<Database, "public", Database["public"]>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            }
        }
    )
}



export async function createSSRSassClient() {
    const client = await createSSRClient();
    // This must be some bug that SupabaseClient is not properly recognized, so must be ignored
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new SassClient(client as any, ClientType.SERVER);
}