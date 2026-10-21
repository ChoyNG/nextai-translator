import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MyMemory } from './mymemory'
import { getUniversalFetch } from '../universal-fetch'
import { IMessageRequest } from './interfaces'

vi.mock('../universal-fetch', () => ({ getUniversalFetch: vi.fn() }))
const fetcher = vi.fn()
const request = (text = 'take ownership'): IMessageRequest => ({
    rolePrompt: '',
    commandPrompt: '',
    translation: { text, source: 'en', target: 'zh-Hans', mode: 'translate' },
    onMessage: vi.fn().mockResolvedValue(undefined),
    onFinished: vi.fn(),
    onError: vi.fn(),
    signal: new AbortController().signal,
})
describe('MyMemory', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(getUniversalFetch).mockReturnValue(fetcher)
    })
    it('translates the exact selection without a key or an AI prompt', async () => {
        fetcher.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ responseStatus: 200, responseData: { translatedText: '承担责任 &amp; ownership' } }),
        })
        const req = request()
        await new MyMemory().sendMessage(req)
        const [url, options] = fetcher.mock.calls[0]
        expect(new URL(url).searchParams.get('q')).toBe('take ownership')
        expect(new URL(url).searchParams.get('langpair')).toBe('en|zh-CN')
        expect(options).toEqual({ signal: req.signal })
        expect(req.onMessage).toHaveBeenCalledWith({
            content: '承担责任 & ownership',
            role: 'assistant',
            isFullText: true,
        })
        expect(req.onFinished).toHaveBeenCalledWith('stop')
    })
    it('rejects requests exceeding the UTF-8 byte limit without making a request', async () => {
        await expect(new MyMemory().sendMessage(request('中'.repeat(167)))).rejects.toThrow('500')
        expect(fetcher).not.toHaveBeenCalled()
    })
    it('rejects AI-only actions', async () => {
        const req = request()
        req.translation!.mode = 'summarize'
        await expect(new MyMemory().sendMessage(req)).rejects.toThrow('only translates')
        expect(fetcher).not.toHaveBeenCalled()
    })
    it.each([
        { responseStatus: 403, responseData: { translatedText: 'quota exceeded' } },
        { responseStatus: 200, quotaFinished: true, responseData: { translatedText: 'quota exceeded' } },
    ])('does not save quota messages as translations', async (body) => {
        fetcher.mockResolvedValue({ ok: true, status: 200, json: async () => body })
        const req = request()
        await expect(new MyMemory().sendMessage(req)).rejects.toThrow('额度')
        expect(req.onMessage).not.toHaveBeenCalled()
    })
    it('reports HTTP errors', async () => {
        fetcher.mockResolvedValue({ ok: false, status: 429 })
        await expect(new MyMemory().sendMessage(request())).rejects.toThrow('429')
    })
    it('does not turn cancellation into a translation', async () => {
        fetcher.mockRejectedValue(new DOMException('Aborted', 'AbortError'))
        const req = request()
        await expect(new MyMemory().sendMessage(req)).rejects.toHaveProperty('name', 'AbortError')
        expect(req.onFinished).not.toHaveBeenCalled()
    })
})
