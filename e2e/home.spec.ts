import { test, expect } from '@playwright/test';

test.describe('Home Screen', () => {
	test('should load the application', async ({ page }) => {
		await page.goto('/');

		await expect(page).toHaveTitle(/aria/i);
	});

	test('should display the main navigation tabs', async ({ page }) => {
		await page.goto('/');

		const tabBar = page.getByRole('tablist');
		await expect(tabBar).toBeVisible();
	});

	test('should navigate between tabs', async ({ page }) => {
		await page.goto('/');

		const exploreTab = page.getByRole('tab', { name: /explore/i });
		if (await exploreTab.isVisible()) {
			await exploreTab.click();
			await expect(page).toHaveURL(/explore/);
		}
	});
});
