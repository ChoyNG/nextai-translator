import fs from 'node:fs/promises'
import { expect, test } from './fixtures'
import { getPopupPageUrl } from './common'

test('free phrase translation, contextual AI chat, collection and Anki export', async ({
    context,
    page,
    extensionId,
}) => {
    const background = context.serviceWorkers()[0]
    await background.evaluate(() => {
        const original = globalThis.fetch.bind(globalThis)
        const calls: unknown[] = []
        Object.assign(globalThis, { studyCalls: calls })
        globalThis.fetch = async (input, options) => {
            const url = String(input)
            if (url.startsWith('https://api.mymemory.translated.net/get')) {
                if (new URL(url).searchParams.get('q') !== 'take ownership') throw new Error('Wrong selection')
                return new Response(
                    JSON.stringify({ responseStatus: 200, responseData: { translatedText: '主动承担责任' } }),
                    { headers: { 'Content-Type': 'application/json' } }
                )
            }
            if (url.startsWith('https://study-provider.example/')) {
                calls.push(JSON.parse(String(options?.body)))
                return new Response(
                    'data: {"choices":[{"delta":{"content":"For example: I take ownership of this release."},"finish_reason":null}]}\n\ndata: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n',
                    { headers: { 'Content-Type': 'text/event-stream' } }
                )
            }
            return original(input, options)
        }
    })
    await page.goto(getPopupPageUrl(extensionId))
    await page.evaluate(() =>
        chrome.storage.sync.set({
            provider: 'MyMemory',
            languageDetectionEngine: 'local',
            autoTranslate: false,
            i18n: 'en',
            apiKeys: 'synthetic-test-key',
            apiURL: 'https://study-provider.example',
            apiURLPath: '/v1/chat/completions',
            apiModel: 'test-model',
        })
    )
    await page.reload()
    await page.setViewportSize({ width: 700, height: 960 })
    const editor = page.locator('textarea').first()
    await editor.fill('take ownership')
    await editor.press('Enter')
    await expect(page.getByText('主动承担责任', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Save word or phrase' }).click()
    await expect(page.getByRole('button', { name: 'Save word or phrase' })).toContainText('已收藏')
    expect(
        await background.evaluate(() => (globalThis as unknown as { studyCalls: unknown[] }).studyCalls.length)
    ).toBe(0)
    await page.getByRole('button', { name: '✦ AI 再译', exact: true }).click()
    await expect(page.getByText('主动承担责任', { exact: true })).toBeVisible()
    await expect(page.getByText('For example: I take ownership of this release.', { exact: true })).toBeVisible()
    expect((await page.evaluate(() => chrome.storage.sync.get('provider'))).provider).toBe('MyMemory')
    const question = page.getByRole('textbox', { name: 'AI follow-up question' })
    await question.fill('Explain this phrase')
    await page.getByRole('button', { name: '发送', exact: true }).click()
    await expect(page.getByText('For example: I take ownership of this release.', { exact: true })).toHaveCount(2)
    await question.fill('Give another workplace example')
    await page.getByRole('button', { name: '发送', exact: true }).click()
    await expect(page.getByRole('button', { name: '保存收藏（含已勾选内容）' })).toBeEnabled()
    const calls = await background.evaluate(
        () => (globalThis as unknown as { studyCalls: { messages: { role: string; content: string }[] }[] }).studyCalls
    )
    expect(calls).toHaveLength(3)
    expect(calls[0].messages[2].content).toContain('重新翻译')
    expect(calls[2].messages.map((message) => message.role)).toEqual([
        'system',
        'user',
        'user',
        'assistant',
        'user',
        'assistant',
        'user',
    ])
    expect(calls[2].messages[1].content).toContain('take ownership')
    expect(calls[2].messages[6].content).toBe('Give another workplace example')
    await page.locator('[data-testid=ai-follow-up] input[type=checkbox]').last().check()
    await page.getByRole('button', { name: '保存收藏（含已勾选内容）' }).click()
    await expect(page.getByRole('button', { name: '✓ 已保存到生词本' })).toBeVisible()
    await page.getByRole('button', { name: 'Open vocabulary actions' }).click()
    const downloadEvent = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Anki 导出' }).click()
    const download = await downloadEvent
    const content = await fs.readFile((await download.path())!, 'utf8')
    expect(content).toContain('#separator:Tab')
    expect(content).toContain('take ownership\tFor example: I take ownership of this release.')
    expect(content).toContain('For example: I take ownership of this release.')
    await expect(page.getByText('Anki 导入文件已下载', { exact: true })).not.toBeVisible({ timeout: 6000 })
    const csvEvent = page.waitForEvent('download')
    await page.getByRole('button', { name: 'CSV 导出', exact: true }).click()
    const csvDownload = await csvEvent
    const csv = await fs.readFile((await csvDownload.path())!, 'utf8')
    expect(csv).toContain('"machineTranslation"')
    expect(csv).toContain('"aiTranslation"')
    expect(csv).toContain('主动承担责任')
    await page.screenshot({ path: '../nextai-study-preview.png', fullPage: true })
})
