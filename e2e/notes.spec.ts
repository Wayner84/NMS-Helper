import { test, expect } from '@playwright/test'

test('notes CRUD and resource tagging', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Notes' }).click()

  await page.getByRole('button', { name: 'Add system' }).click()
  await page.getByLabel('Name').fill('Euclid Testing Station')
  await page.getByLabel('Type').selectOption('system')
  await page.getByLabel('Galaxy index').fill('1')
  await page.getByRole('button', { name: 'oxygen' }).first().click()
  await page.getByPlaceholder('Add resource').fill('activated_indium')
  await page.getByRole('button', { name: 'Add' }).click()
  await page.getByRole('button', { name: 'Save note' }).click()

  await expect(page.getByText('Euclid Testing Station')).toBeVisible()
  await expect(page.getByText('oxygen')).toBeVisible()
  await expect(page.getByText('activated_indium')).toBeVisible()
})
