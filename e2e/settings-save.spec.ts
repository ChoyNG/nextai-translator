import { expect, test } from './fixtures'
import { getOptionsPageUrl } from './common'

test('Save confirms and persists settings without relying on blur autosave', async ({ page, extensionId }) => {
    await page.goto(getOptionsPageUrl(extensionId))
    await page.evaluate(() => chrome.storage.sync.set({ provider: 'MyMemory', apiKeys: '', i18n: 'en' }))
    await page.reload()
    const url = page.locator('input[value="https://api.openai.com"]')
    await expect(url).toBeVisible()
    await url.fill('http://127.0.0.1:18080')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByText('Saved', { exact: true })).toBeVisible()
    expect((await page.evaluate(() => chrome.storage.sync.get('apiURL'))).apiURL).toBe('http://127.0.0.1:18080')
})
