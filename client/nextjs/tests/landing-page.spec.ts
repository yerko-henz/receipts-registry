import { test, expect } from '@playwright/test';
import { mockSupabaseAuth } from './utils';
import path from 'path';

const authFile = path.resolve(__dirname, '../playwright/.auth/user.json');

test.describe('Landing Page Guest', () => {
    // Explicitly no storage state for guest tests
    test.use({ storageState: { cookies: [], origins: [] } });

    test('should show login/signup buttons when not authenticated', async ({ page }) => {
        await page.goto('/');

        // Check nav buttons
        await expect(page.getByTestId('nav-get-started-link')).toBeVisible();
        await expect(page.getByTestId('nav-dashboard-link')).not.toBeVisible();

        // Check hero buttons
        await expect(page.getByTestId('hero-create-account-link')).toBeVisible();
        await expect(page.getByTestId('hero-dashboard-link')).not.toBeVisible();
    });

    test('should visually navigate to register page', async ({ page }) => {
        await page.goto('/', { waitUntil: 'commit', timeout: 30000 });
        await page.waitForLoadState('load', { timeout: 30000 }); 
        
        await Promise.all([
            page.waitForURL(/.*\/auth\/register/, { timeout: 30000 }),
            page.getByTestId('nav-get-started-link').click()
        ]);
    });
});

test.describe('Landing Page Auth', () => {
    // Opt-in to shared auth state
    test.use({ storageState: process.env.USE_REAL_DATA === 'true' ? authFile : undefined });

    test('should show dashboard link when authenticated', async ({ page }) => {
        // Mock authentication (if mocks are used)
        await mockSupabaseAuth(page);
        
        await page.goto('/');

        // Check nav buttons
        await expect(page.getByTestId('nav-dashboard-link')).toBeVisible();
        await expect(page.getByTestId('nav-get-started-link')).not.toBeVisible();

        // Check hero buttons
        await expect(page.getByTestId('hero-dashboard-link')).toBeVisible();
        await expect(page.getByTestId('hero-create-account-link')).not.toBeVisible();
    });

    test('should navigate to dashboard', async ({ page }) => {
        await page.goto('/', { waitUntil: 'commit', timeout: 30000 }); 
        await page.waitForLoadState('load', { timeout: 30000 });
        
        await Promise.all([
            page.waitForURL(/.*\/dashboard/, { timeout: 30000 }),
            page.getByTestId('nav-dashboard-link').click()
        ]);
    });
});

test.describe('Styling & Theming', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('should toggle theme', async ({ page }) => {
        await page.goto('/');
        
        const html = page.locator('html');
        const toggleBtn = page.getByTestId('theme-toggle');
        
        await toggleBtn.click();
        await page.waitForTimeout(100);
        
        const isDark = await html.getAttribute('class').then(c => c?.includes('dark'));
        
        await toggleBtn.click();
        await page.waitForTimeout(100);
        
        const isDarkAfter = await html.getAttribute('class').then(c => c?.includes('dark'));
        
        expect(isDark).not.toBe(isDarkAfter);
    });
});
