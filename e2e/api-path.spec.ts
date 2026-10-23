import { expect, test } from './fixtures'
import { getOptionsPageUrl } from './common'

test('API protocol is a selection and cannot be filled as a management URL', async ({ page, context, extensionId }) => {
    await context.serviceWorkers()[0].evaluate(async () => {
        await chrome.storage.sync.set({ provider: 'MyMemory', apiURLPath: '/v1/responses', i18n: 'en' })
    })
    await page.goto(getOptionsPageUrl(extensionId))
    await expect(page.getByText('Responses · /v1/responses', { exact: true })).toBeVisible()
    await expect(page.locator('input[name="apiURLPath"]')).toHaveCount(0)
    await page.getByText('Responses · /v1/responses', { exact: true }).click()
    await expect(page.getByText('Chat Completions · /v1/chat/completions', { exact: true })).toBeVisible()
})
