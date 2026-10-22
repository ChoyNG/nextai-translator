import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { translate, TranslateQuery } from './translate'
import { getEngine } from './engines'
import { getSettings } from './utils'

vi.mock('./engines', () => ({ getEngine: vi.fn() }))
vi.mock('./utils', () => ({ getSettings: vi.fn() }))
const sendMessage = vi.fn()
const query = (): Exclude<TranslateQuery, { mode: 'big-bang' }> => ({
    text: 'mammoths',
    detectFrom: 'en',
    detectTo: 'zh-Hans',
    action: { id: 1, idx: 0, mode: 'translate', name: 'Translate', createdAt: '', updatedAt: '' },
    signal: new AbortController().signal,
    onMessage: vi.fn(),
    onError: vi.fn(),
    onFinish: vi.fn(),
})
beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(getSettings).mockResolvedValue({ provider: 'MyMemory' } as never)
    vi.mocked(getEngine).mockReturnValue({ sendMessage } as never)
    sendMessage.mockImplementation(() => new Promise(() => undefined))
})
afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
})
it('stops waiting for a hung translation and ignores late results', async () => {
    const req = query()
    const result = translate(req)
    const assertion = expect(result).rejects.toThrow('超时')
    await vi.advanceTimersByTimeAsync(60000)
    await assertion
    const sent = sendMessage.mock.calls[0][0]
    expect(sent.signal.aborted).toBe(true)
    await sent.onMessage({ content: 'late', role: 'assistant' })
    sent.onFinished('stop')
    expect(req.onMessage).not.toHaveBeenCalled()
    expect(req.onFinish).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
})
it('cancels a hung native request when a new selection supersedes it', async () => {
    const controller = new AbortController()
    const result = translate({ ...query(), signal: controller.signal })
    const assertion = expect(result).rejects.toHaveProperty('name', 'AbortError')
    await vi.advanceTimersByTimeAsync(0)
    controller.abort()
    await assertion
    expect(vi.getTimerCount()).toBe(0)
})
it('uses the selected default provider while preserving explicit custom actions', async () => {
    sendMessage.mockResolvedValue(undefined)
    await translate(query())
    expect(getEngine).toHaveBeenLastCalledWith('MyMemory')
    const req = query()
    req.action = { ...req.action, provider: 'OpenAI', apiModel: 'gpt-6-luna' }
    await translate(req)
    expect(getEngine).toHaveBeenLastCalledWith('OpenAI')
    expect(sendMessage.mock.calls.at(-1)?.[0].modelOverride).toBe('gpt-6-luna')
})
