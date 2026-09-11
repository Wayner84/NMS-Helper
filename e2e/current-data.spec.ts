import { expect, test } from '@playwright/test'

test('Cosmos refiner recipes and current cooking dishes are searchable', async ({ page }) => {
  await page.goto('/')

  const refinerCases = [
    ['Comet Dust', 'Silver'],
    ['Corrupted Ichor', 'Nanite Cluster'],
    ['Contaminated Metal', 'Magnetised Ferrite'],
    ['Gelatinous Fibres', 'Faecium']
  ] as const

  for (const [input, output] of refinerCases) {
    await page.getByRole('searchbox').fill(input)
    const refinerRow = page.getByRole('row').filter({ hasText: input })
    await expect(refinerRow).toContainText(output)
    await expect(refinerRow).toContainText('Qty 5')
  }

  await page.getByRole('tab', { name: 'Cooking' }).click()
  await page.getByPlaceholder('Search by dish or ingredient').fill('Bone Milk')
  await expect(page.getByRole('heading', { name: 'Bone Milk' }).first()).toBeVisible()
})
