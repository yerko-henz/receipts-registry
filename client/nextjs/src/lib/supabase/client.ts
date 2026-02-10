import { createBrowserClient } from "@supabase/ssr";
import { ClientType, SassClient } from "@/lib/supabase/unified";
import { Database } from "@/lib/types";

export function createSPAClient() {
  const client = createBrowserClient<Database, "public", Database["public"]>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Monkey-patch for E2E tests
  if (typeof window !== 'undefined' && window.localStorage.getItem('E2E_TEST_MODE') === 'true') {
      const storedUser = window.localStorage.getItem('E2E_TEST_USER');
      
      if (!storedUser) {
          // Mock unauthenticated
          client.auth.getUser = async () => ({ data: { user: null as any }, error: null });
          client.auth.getSession = async () => ({ data: { session: null }, error: null });
          client.auth.onAuthStateChange = (callback) => {
              callback('SIGNED_OUT', null as any);
              return { data: { subscription: { unsubscribe: () => {}, id: '', callback: () => {} } as any } };
          };
      } else {
          // Mock authenticated
          let mockUser;
          try {
              const parsed = JSON.parse(storedUser);
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
              console.error('Failed to parse E2E_TEST_USER', e);
              // Fallback to default mock user if parsing fails
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
              };
          }

          const mockSession = {
              user: mockUser,
              access_token: 'mock-token',
              refresh_token: 'mock-refresh-token',
              expires_in: 3600,
              token_type: 'bearer'
          };

          // Override auth methods
          client.auth.getUser = async () => ({ data: { user: mockUser as any }, error: null });
          client.auth.getSession = async () => ({ data: { session: mockSession as any }, error: null });
          
          // Override onAuthStateChange to fire event in a timeout to avoid synchronous state updates during render/effect initialization
      client.auth.onAuthStateChange = (callback) => {
          const timeout = setTimeout(() => {
              callback(storedUser ? 'SIGNED_IN' : 'SIGNED_OUT', (mockSession as any) || null);
          }, 0);
          return { data: { subscription: { unsubscribe: () => clearTimeout(timeout), id: 'mock-id', callback } as any } };
      };
      }
  }

  return client;
}

export async function createSPASassClient() {
  const client = createSPAClient();
  // This must be some bug that SupabaseClient is not properly recognized, so must be ignored
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new SassClient(client as any, ClientType.SPA);
}

export async function createSPASassClientAuthenticated() {
  const client = createSPAClient();
  const user = await client.auth.getSession();
  console.log("Authenticated SPA Supabase Client - User Session:", user);
  
  // Bypass redirect for E2E testing if flag is set
  const isTestMode = typeof window !== 'undefined' && window.localStorage.getItem('E2E_TEST_MODE') === 'true';
  
  if (isTestMode) {
      if (!user.data || !user.data.session) {
          let mockUser;
          const storedUser = window.localStorage.getItem('E2E_TEST_USER');
          
          if (storedUser) {
              try {
                  const parsed = JSON.parse(storedUser);
                  // Ensure basic fields if stripped
                  mockUser = {
                    aud: 'authenticated',
                    role: 'authenticated',
                    created_at: new Date().toISOString(),
                    ...parsed
                  };
              } catch (e) {
                  console.error('Failed to parse E2E_TEST_USER', e);
              }
          }

          if (!mockUser) {
             mockUser = {
              id: 'test-user-id',
              email: 'test@example.com',
              user_metadata: { slug: 'test-user' },
              app_metadata: {},
              aud: 'authenticated',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              phone: '',
              confirmed_at: new Date().toISOString(),
              email_confirmed_at: new Date().toISOString(),
              role: 'authenticated',
              last_sign_in_at: new Date().toISOString()
            };
          }

          const mockSession = {
              access_token: 'fake-token',
              refresh_token: 'fake-refresh',
              expires_in: 3600,
              token_type: 'bearer',
              user: mockUser
          };
          
          // Monkey-patch auth methods
          client.auth.getUser = async () => ({ data: { user: mockUser as any }, error: null });
          client.auth.getSession = async () => ({ data: { session: mockSession as any }, error: null });
      }
  }

  if ((!user.data || !user.data.session) && !isTestMode) {
    window.location.href = "/auth/login";
  }
  // This must be some bug that SupabaseClient is not properly recognized, so must be ignored
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new SassClient(client as any, ClientType.SPA);
}
