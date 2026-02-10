import { test, expect } from '@playwright/test';
import { mockSupabaseAuth, mockReceiptsResponse } from './utils';

test.describe('Settings Page', () => {

    // FIXME: This test fails in E2E environment because the user override is not correctly applied
    // despite attempts to inject it via localStorage. The component logic is correct.
    test('should show verify email section if email not verified', async ({ page }) => {
        await mockSupabaseAuth(page, { email: 'unverified@example.com', email_confirmed_at: null }); 
        await page.goto('/dashboard/user-settings');
        
        // Wait for page load
        await expect(page.getByTestId('settings-title')).toBeVisible();
        await expect(page.getByTestId('verify-email-card')).toBeVisible(); 
    });

    test('should hide verify email section if email is present', async ({ page }) => {
        await mockSupabaseAuth(page, { email: 'test@example.com' });
        await page.goto('/dashboard/user-settings');
        await expect(page.getByTestId('verify-email-card')).not.toBeVisible();
    });

    test('should open change password modal', async ({ page }) => {
        await mockSupabaseAuth(page);
        await page.goto('/dashboard/user-settings');
        
        await page.getByTestId('change-password-button').click();
        
        await expect(page.getByTestId('new-password-input')).toBeVisible();
        await expect(page.getByTestId('confirm-password-input')).toBeVisible();
    });

    test('should change region and formatting', async ({ page }) => {
        // Mock data with a total of 1000 to verify formatting (1,000 vs 1.000)
        const receipts = [{
             id: '1', 
             merchant_name: 'Store', 
             total_amount: 1000, 
             currency: 'USD', 
             created_at: new Date().toISOString() 
        }];
        await mockSupabaseAuth(page);
        await mockReceiptsResponse(page, receipts);
        
        await page.goto('/dashboard/user-settings');
        await expect(page.getByTestId('settings-title')).toBeVisible();

        // 1. Change to Chile (es-CL) -> Expect 1.000
        // The component uses window.location.reload(), so we should wait for that or just expect the new state
        await page.getByTestId('region-select').selectOption('es-CL');
        await page.waitForLoadState('networkidle'); // wait for reload if applicable
        
        // Navigate to Dashboard to check formatting
        await page.goto('/dashboard');
        // Wait for stats to load
        const stat = page.getByTestId('stat-total-spent');
        await expect(stat).toBeVisible();
        await expect(stat).toContainText('1.000'); // Dot separator

        // 2. Change back to US (en-US) -> Expect 1,000
        await page.goto('/dashboard/user-settings');
        await page.getByTestId('region-select').selectOption('en-US');
        await page.waitForLoadState('networkidle');

        await page.goto('/dashboard');
        await expect(stat).toContainText('1,000'); // Comma separator
    });

    test('should change language', async ({ page }) => {
        await mockSupabaseAuth(page);
        await page.goto('/dashboard/user-settings');
        
        // Initial State (English)
        await expect(page.getByTestId('settings-title')).toHaveText('User Settings');

        // Change to Spanish
        await page.getByTestId('language-select').selectOption('es');
        
        // Component reloads page on language change
        await page.waitForLoadState('domcontentloaded');

        // Verify title change
        await expect(page.getByTestId('settings-title')).toHaveText('Configuración de usuario');
    });
});
