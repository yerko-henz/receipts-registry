import { test, expect } from '@playwright/test';
import { mockSupabaseAuth } from './utils';

test.describe('Landing Page Auth', () => {

    test('should show login/signup buttons when not authenticated', async ({ page }) => {
        await page.goto('/');

        // Check nav buttons
        await expect(page.getByTestId('nav-get-started-link')).toBeVisible();
        await expect(page.getByTestId('nav-dashboard-link')).not.toBeVisible();

        // Check hero buttons
        await expect(page.getByTestId('hero-create-account-link')).toBeVisible();
        await expect(page.getByTestId('hero-dashboard-link')).not.toBeVisible();
    });

    test('should show dashboard link when authenticated', async ({ page }) => {
        // Mock authentication
        await mockSupabaseAuth(page);
        
        await page.goto('/');

        // Check nav buttons
        await expect(page.getByTestId('nav-dashboard-link')).toBeVisible();
        await expect(page.getByTestId('nav-get-started-link')).not.toBeVisible();

        // Check hero buttons
        await expect(page.getByTestId('hero-dashboard-link')).toBeVisible();
        await expect(page.getByTestId('hero-create-account-link')).not.toBeVisible();
    });

    test('should visually navigate to correct pages', async ({ page }) => {
        // 1. Unauthenticated: Click "Get Started"
        // Explicitly mock unauthenticated state to avoid 401s
        await mockSupabaseAuth(page, { email: null });
        
        await page.goto('/');
        await page.waitForLoadState('networkidle'); 
        
        await page.getByTestId('nav-get-started-link').click({ force: true });
        await expect(page).toHaveURL(/.*\/auth\/register/, { timeout: 10000 });

        // Go back
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.getByTestId('hero-create-account-link').click({ force: true });
        await expect(page).toHaveURL(/.*\/auth\/register/, { timeout: 10000 });

        // 2. Authenticated: Click "Dashboard"
        // Now mock authenticated state
        await mockSupabaseAuth(page); // Default user has email
        await page.goto('/'); 
        await page.waitForLoadState('networkidle');
        
        await page.getByTestId('nav-dashboard-link').click({ force: true });
        await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 10000 });
        
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.getByTestId('hero-dashboard-link').click({ force: true });
        await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 10000 });
    });
});

test.describe('Styling & Theming', () => {
        test('should toggle theme', async ({ page }) => {
            await page.goto('/');
            
            const html = page.locator('html');
            const toggleBtn = page.getByTestId('theme-toggle');
            
            // Initial state (default might depend on system/local storage, usually light or system->light in tests)
            // We'll just check that clicking it toggles the class
            
            await toggleBtn.click();
            // Wait for potential transition
            await page.waitForTimeout(100);
            
            const isDark = await html.getAttribute('class').then(c => c?.includes('dark'));
            
            await toggleBtn.click();
            await page.waitForTimeout(100);
            
            const isDarkAfter = await html.getAttribute('class').then(c => c?.includes('dark'));
            
            expect(isDark).not.toBe(isDarkAfter);
        });
    });

