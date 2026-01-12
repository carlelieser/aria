import { Page, expect } from '@playwright/test';

export async function waitForAppReady(page: Page): Promise<void> {
	await page.waitForLoadState('domcontentloaded');
	await page.waitForLoadState('networkidle');
}

export async function navigateToTab(page: Page, tabName: string): Promise<void> {
	const tab = page.getByRole('tab', { name: new RegExp(tabName, 'i') });
	await expect(tab).toBeVisible();
	await tab.click();
}

export async function expectToastMessage(page: Page, message: string): Promise<void> {
	const toast = page.getByText(message);
	await expect(toast).toBeVisible();
}
