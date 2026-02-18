import { test, expect } from '@playwright/test';
import { mockSupabaseAuth, mockReceiptsResponse } from './utils';
import path from 'path';

const authFile = path.resolve(__dirname, '../playwright/.auth/user.json');

test.describe('Dashboard Page', () => {
    test.use({ storageState: process.env.USE_REAL_DATA === 'true' ? authFile : undefined });


    test.beforeEach(async ({ page }) => {
        await mockSupabaseAuth(page);
        await page.goto('/dashboard');
    });

    test('should load dashboard components', async ({ page }) => {
        await expect(page.getByTestId('stat-total-spent')).toBeVisible();
        await expect(page.getByTestId('stat-recent-activity')).toBeVisible();
        await expect(page.getByTestId('receipt-activity-chart')).toBeVisible();
    });

    test('should toggle between weekly and monthly views', async ({ page }) => {
        // Toggle is inside ReceiptActivityChart, which is a client component.
        // We need to find the toggle buttons. 
        // Assuming they are accessible by text "Weekly" / "Monthly" or we should add testid to them in component.
        // For now, let's try to locate them safely.
        
        await expect(page.getByTestId('receipt-activity-chart')).toBeVisible();
        
        // Note: The specific toggle implementation might need data-testid if texts change.
        // But let's assume "Weekly" and "Monthly" are standard for now or use the ones from translation if possible?
        // Actually, best to add test-id to the toggle in ReceiptActivityChart.tsx if we haven't.
        // But I will use text for now as it matches the previous test logic which was working (except for auth).
        
        const weeklyBtn = page.getByTestId('toggle-weekly');
        const monthlyBtn = page.getByTestId('toggle-monthly');
        
        await expect(weeklyBtn).toBeVisible();
        await expect(monthlyBtn).toBeVisible();

        // Initial state should be weekly ? or we just click to be sure.
        // Let's click monthly.
        await monthlyBtn.click();
        
        // Check if stats changed. The previous test checked for text "vs last month" in subtext.
        // Now we verify using the dynamic ID which confirms the state change and content.
        await expect(page.getByTestId('stat-total-spent-subtext-monthly')).toBeVisible();
        await expect(page.getByTestId('stat-total-spent-subtext-monthly')).toHaveText(/last month/i);
        
        await expect(page.getByTestId('stat-items-processed-subtext-monthly')).toBeVisible();
        await expect(page.getByTestId('stat-items-processed-subtext-monthly')).toHaveText(/last month/i);
        
        // Verify breakdown card updated
        await expect(page.getByTestId('category-breakdown-chart-monthly')).toBeVisible();

        // Click weekly
        await weeklyBtn.click();
        await expect(page.getByTestId('stat-total-spent-subtext-weekly')).toBeVisible();
        await expect(page.getByTestId('stat-total-spent-subtext-weekly')).toHaveText(/last week/i);

        await expect(page.getByTestId('stat-items-processed-subtext-weekly')).toBeVisible();
        await expect(page.getByTestId('stat-items-processed-subtext-weekly')).toHaveText(/last week/i);

        // Verify breakdown card updated
        await expect(page.getByTestId('category-breakdown-chart-weekly')).toBeVisible();
    });

    test('should show correct empty state messages', async ({ page }) => {
        // Mock empty receipts
        await mockReceiptsResponse(page, []);
        
        // Reload page to apply empty data
        await page.reload();
        
        // Check weekly empty state
        const weeklyBreakdown = page.getByTestId('category-breakdown-chart-weekly');
        await expect(weeklyBreakdown).toBeVisible();
        await expect(weeklyBreakdown).toHaveText(/No data for this week/i);
        
        // Toggle to monthly
        const monthlyBtn = page.getByTestId('toggle-monthly');
        await monthlyBtn.click();
        
        // Check monthly empty state
        const monthlyBreakdown = page.getByTestId('category-breakdown-chart-monthly');
        await expect(monthlyBreakdown).toBeVisible();
        await expect(monthlyBreakdown).toHaveText(/No data for this month/i);
    });
});
