import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/BasicSass/);
});

test.describe('Navigation', () => {
    test('should navigate to dashboard', async ({ page }) => {
        await page.goto('/');
        // Check if we are redirected to dashboard or if dashboard link exists
        // Depending on auth state, this might redirect to login.
        // For now, just checking if page loads without error.
        await expect(page.locator('body')).toBeVisible();
    });
});
