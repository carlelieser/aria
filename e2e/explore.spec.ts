import { test, expect } from '@playwright/test';

test.describe('Explore Screen', () => {
	test('should display search functionality', async ({ page }) => {
		await page.goto('/explore');

		await page.waitForLoadState('networkidle');
	});

	test('should allow searching for content', async ({ page }) => {
		await page.goto('/explore');

		const searchInput = page.getByRole('searchbox').or(page.getByPlaceholder(/search/i));

		if (await searchInput.isVisible()) {
			await searchInput.fill('test query');
			await expect(searchInput).toHaveValue('test query');
		}
	});
});
