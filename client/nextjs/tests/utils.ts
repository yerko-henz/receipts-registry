import { Page } from '@playwright/test';

// Export mockSupabaseAuth
export const mockSupabaseAuth = async (page: Page, userOverride: any = {}) => {
  if (process.env.USE_REAL_DATA === 'true') {
    if (userOverride.email === null) {
      // Explicitly want to be logged out
      await page.context().clearCookies();
      await page.addInitScript(() => window.localStorage.clear());
    }
    // Session is otherwise assumed to be handled by storageState in the test file/block
    return;
  }
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
  const session = user.email ? {
    access_token: 'fake-access-token',
    expires_in: 3600,
    refresh_token: 'fake-refresh-token',
    token_type: 'bearer',
    user: user,
  } : null;

  // Set local storage to simulate persisted session if the app uses it
  // Supabase js client uses local storage key `sb-<project-id>-auth-token` usually.
  // We can try to set a generic one or just rely on network interception if the app fetches on mount.
  
  await page.route('**/auth/v1/user', async (route) => {
    if (session) {
      await route.fulfill({ json: user }); // Supabase returns the user object directly on GET /user? No, it returns { id: ..., email: ... }
    } else {
      await route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
    }
  });

  await page.route('**/auth/v1/session', async (route) => {
      if (session) {
          await route.fulfill({ json: session });
      } else {
          // Return valid JSON with null session to prevent client-side errors/retries
          await route.fulfill({ status: 200, json: { session: null } });
      }
  });
  
  // Debug: Log all browser console messages
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  
  // Set E2E_TEST_MODE flag and USER in localStorage to bypass client-side redirect and provide mock data
  if (session) {
      await page.addInitScript((userData) => {
        window.localStorage.setItem('E2E_TEST_MODE', 'true');
        window.localStorage.setItem('E2E_TEST_USER', JSON.stringify(userData));
        console.log('Test: Enabled E2E_TEST_MODE with user:', userData.email);
      }, user);
  } else {
      // If no session (user is null/empty for anonymous?), still set mode but maybe no user?
      // But mockSupabaseAuth usually provides a user.
      await page.addInitScript(() => {
        window.localStorage.setItem('E2E_TEST_MODE', 'true');
        window.localStorage.removeItem('E2E_TEST_USER');
      });
  }
  
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
  const domain = new URL(baseUrl).hostname;
  
  const cookies = [{
      name: 'E2E_TEST_MODE',
      value: 'true',
      domain,
      path: '/',
  }, {
      name: 'NEXT_LOCALE',
      value: 'en',
      domain,
      path: '/',
  }];

  if (session) {
      cookies.push({
          name: 'E2E_TEST_USER',
          value: encodeURIComponent(JSON.stringify(user)),
          domain,
          path: '/',
      });
  }

  await page.context().addCookies(cookies);

  // Debug: Log all requests

};

export const mockReceiptsResponse = async (page: Page, receipts: any[], totalCount?: number) => {
  if (process.env.USE_REAL_DATA === 'true') {
    console.log('USE_REAL_DATA is true, skipping Receipts Response mocking.');
    return;
  }
  await page.route('**/rest/v1/receipts?*', async (route) => {
    // We can filter based on route.request().url() query params if we want strictly mocked filtering
    // or just return the data we expect for the test case.
    // For simplicity in this suite, we'll return what's passed.
    
    const count = totalCount !== undefined ? totalCount : receipts.length;

    // Check if it's a count query (HEAD) or data query (GET)
    const method = route.request().method();
    
    if (method === 'HEAD') {
        await route.fulfill({
            headers: {
                'content-range': `0-${receipts.length - 1}/${count}`
            },
            status: 200
        });
        return;
    }

    await route.fulfill({
      json: receipts,
        headers: {
            'content-range': `0-${receipts.length - 1}/${count}`,
            'access-control-expose-headers': 'content-range'
        }
    });
  });
};

export const realLoginSupabase = async (page: Page) => {
    const email = process.env.SUPABASE_TEST_USER_EMAIL;
    const password = process.env.SUPABASE_TEST_USER_PASSWORD;

    if (!email || !password) {
        throw new Error('SUPABASE_TEST_USER_EMAIL and SUPABASE_TEST_USER_PASSWORD are required for real login.');
    }

    // Ensure we are in English to avoid locator mismatches
    const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
    const domain = new URL(baseUrl).hostname;
    
    await page.context().addCookies([{
        name: 'NEXT_LOCALE',
        value: 'en',
        domain,
        path: '/',
    }]);

    console.log(`Navigating to ${baseUrl}/auth/login ...`);
    await page.goto('/auth/login');
    
    // Wait for the form to be potentially interactive
    await page.waitForLoadState('networkidle');
    
    // Resilient locators
    const emailInput = page.locator('input[data-testid="email-input"], input[name="email"], input[type="email"]').first();
    const passwordInput = page.locator('input[data-testid="password-input"], input[name="password"], input[type="password"]').first();
    const submitBtn = page.locator('button[data-testid="login-submit"], button[type="submit"]').first();

    console.log('Waiting for email input...');
    await emailInput.waitFor({ state: 'visible', timeout: 15000 });
    
    await emailInput.fill(email);
    await passwordInput.fill(password);
    await submitBtn.click();
    
    console.log('Login submitted, waiting for redirect...');
    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 20000 });
};
