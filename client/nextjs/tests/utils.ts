import { Page } from '@playwright/test';

export const mockSupabaseAuth = async (page: Page, userOverride: any = {}) => {
  const defaultUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    user_metadata: {
      slug: 'test-user',
    },
    app_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  };

  const user = { ...defaultUser, ...userOverride };

  // Determine whether to return a session based on if email is present (simulating logged in)
  // or if we want to simulate specific auth states.
  // For now, if we pass user with email, we assume authenticated.
  const session = user.email ? {
    access_token: 'fake-access-token',
    expires_in: 3600,
    refresh_token: 'fake-refresh-token',
    token_type: 'bearer',
    user: user,
  } : null;

  // Mock getUser
  await page.route('**/auth/v1/user', async (route) => {
    if (session) {
      await route.fulfill({ json: user });
    } else {
      await route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
    }
  });

  // Mock session/token endpoint if needed, often Next.js middleware or client checks this
  // But since we are using supabase-js client side, it might call different endpoints.
  // The most common one for `supabase.auth.getUser()` is `auth/v1/user`.
};

export const mockReceiptsResponse = async (page: Page, receipts: any[]) => {
  await page.route('**/rest/v1/receipts?*', async (route) => {
    // We can filter based on route.request().url() query params if we want strictly mocked filtering
    // or just return the data we expect for the test case.
    // For simplicity in this suite, we'll return what's passed.
    
    // Check if it's a count query (HEAD) or data query (GET)
    const method = route.request().method();
    
    if (method === 'HEAD') {
        await route.fulfill({
            headers: {
                'content-range': `0-${receipts.length - 1}/${receipts.length}`
            },
            status: 200
        });
        return;
    }

    await route.fulfill({
      json: receipts,
        headers: {
            'content-range': `0-${receipts.length - 1}/${receipts.length}`
        }
    });
  });
};
