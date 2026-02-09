import { test, expect } from '@playwright/test';

test.describe('Dashboard Page', () => {

    test.beforeEach(async ({ page }) => {
        // Since we are testing the UI which might use real data calls or context,
        // and standard login flows might be complex, we can rely on the fact 
        // that the app might function with existing dev environment or we mock.
        // Given your request for "request made in home should make sense", 
        // implies checking the actual functionality or mocked behavior.
        // For E2E stability, mocking data (as per plan) is safer for logic verification.
        // However, the dashboard currently uses DUMMY_DATA in the code! (See step 102 view_file).
        // So mocking network won't affect the Charts/Stats unless we refactor the page to fetch real data.
        // *Observation*: The dashboard/page.tsx provided uses `DUMMY_DATA` constant.
        // So we can only test that the UI renders that dummy data correctly and interactions work.
        
        await page.goto('/dashboard');
    });

    test('should load dashboard components', async ({ page }) => {
        await expect(page.getByText('Total Spent')).toBeVisible();
        await expect(page.getByText('Recent Activity')).toBeVisible();
        // Check for charts
        await expect(page.locator('.recharts-responsive-container').first()).toBeVisible();
    });

    test('should toggle between weekly and monthly views', async ({ page }) => {
        const weeklyBtn = page.getByRole('button', { name: 'Weekly', exact: true });
        const monthlyBtn = page.getByRole('button', { name: 'Monthly', exact: true });

        // Default should be weekly
        // We can check style or just click interactions
        // Based on logic: viewMode === 'weekly' ? 'bg-background...' : 'text-muted...'
        
        // Click Monthly
        await monthlyBtn.click();
        
        // Determine verification: The stat card subtext should change.
        // "vs Last Week" -> "vs Last Month"
        // Note: The translation keys are used. We expect English default for tests usually.
        // If English: "vs last week" / "vs last month"
        
        await expect(page.getByText('vs last month').first()).toBeVisible();
        
        // Click Weekly
        await weeklyBtn.click();
        await expect(page.getByText('vs last week').first()).toBeVisible();
    });
});
