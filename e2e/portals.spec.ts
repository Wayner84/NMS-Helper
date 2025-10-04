import { test, expect } from '@playwright/test'

test('portal directory add entry flow', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Portals' }).click()
  await expect(page.getByText('Community-sourced addresses', { exact: false })).toBeVisible()

  await page.getByRole('button', { name: 'Add entry' }).click()
  await page.getByLabel('Identifier').fill('local-test-portal')
  await page.getByLabel('Galaxy index').fill('3')
  await page.getByLabel('Region').fill('Test lush world')
  await page.getByLabel('Portal address').fill('1234005600AB')
  await page.getByRole('button', { name: 'Save portal' }).click()

  await expect(page.getByText('Test lush world')).toBeVisible()
  await expect(page.getByText('Galaxy #3')).toBeVisible()
})
