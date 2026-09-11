import { test, expect } from '@playwright/test'

test('notes CRUD and resource tagging', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Notes' }).click()

  await page.getByRole('button', { name: 'Add system' }).click()
  const dialog = page.getByRole('dialog', { name: 'Add note' })
  await dialog.getByLabel('Name').fill('Euclid Testing Station')
  await dialog.getByLabel('Type').selectOption('system')
  await dialog.getByLabel('Galaxy index').fill('1')
  await dialog.getByRole('button', { name: 'oxygen' }).click()
  await dialog.getByPlaceholder('Add resource').fill('activated_indium')
  await dialog.getByRole('button', { name: 'Add', exact: true }).click()
  await dialog.getByRole('button', { name: 'Save note' }).click()

  const note = page.getByRole('article').filter({ hasText: 'Euclid Testing Station' })
  await expect(note).toBeVisible()
  await expect(note.getByText('oxygen')).toBeVisible()
  await expect(note.getByText('activated_indium')).toBeVisible()
})
