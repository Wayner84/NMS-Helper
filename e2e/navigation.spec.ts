import { test, expect } from '@playwright/test'

test('primary navigation switches sections', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /helper/i })).toBeVisible()

  await page.getByRole('tab', { name: 'Crafting' }).click()
  await expect(page.getByRole('tabpanel')).toContainText('Shopping list')

  await page.getByRole('tab', { name: 'Cooking' }).click()
  await expect(page.getByRole('tabpanel')).toContainText('Dishes')

  await page.getByRole('tab', { name: 'Planner' }).click()
  await expect(page.getByRole('tabpanel')).toContainText('Current score')

  await page.getByRole('tab', { name: 'Portals' }).click()
  await expect(page.getByRole('tabpanel')).toContainText('Add entry')

  await page.getByRole('tab', { name: 'Hints' }).click()
  await expect(page.getByRole('tabpanel')).toContainText('Add hint')

  await page.getByRole('tab', { name: 'Notes' }).click()
  await expect(page.getByRole('tabpanel')).toContainText('Add system')
})
