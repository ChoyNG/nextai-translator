import { afterEach, expect, it, vi } from 'vitest'
import { fetchSSE } from './utils'
import { listen } from '@tauri-apps/api/event'
import { commands } from '@/tauri/bindings'
vi.mock('./universal-fetch', () => ({ getUniversalFetch: () => vi.fn() }))
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn(), emit: vi.fn() }))
vi.mock('@/tauri/bindings', () => ({ commands: { fetchStream: vi.fn() } }))
afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
})
it('registers listeners before a fast native response emits its first and final event', async () => {
    vi.stubGlobal('__TAURI__', {})
    const handlers = new Map<string, (event: never) => void>()
    const ready: Array<() => void> = []
    const cleanup = vi.fn()
    vi.mocked(listen).mockImplementation(
        (name, callback) =>
            new Promise((resolve) => {
                ready.push(() => {
                    handlers.set(name, callback)
                    resolve(cleanup)
                })
            })
    )
    vi.mocked(commands.fetchStream).mockImplementation(async (id) => {
        handlers.get('fetch-stream-chunk')?.({
            payload: { id, data: 'data: first\n\ndata: [DONE]\n\n', done: false, status: 200 },
        } as never)
        return { status: 'ok' as const, data: '' }
    })
    const onMessage = vi.fn()
    const result = fetchSSE('http://localhost/test', { onMessage, onError: vi.fn() })
    expect(commands.fetchStream).not.toHaveBeenCalled()
    ready.forEach((resolve) => resolve())
    await result
    expect(onMessage.mock.calls.map((call) => call[0])).toEqual(['first', '[DONE]'])
    expect(cleanup).toHaveBeenCalledTimes(2)
})

it('surfaces native connection failures instead of silently returning an empty stream', async () => {
    vi.stubGlobal('__TAURI__', {})
    vi.mocked(listen).mockResolvedValue(vi.fn())
    vi.mocked(commands.fetchStream).mockResolvedValue({ status: 'error', error: 'Connection refused' })
    await expect(fetchSSE('http://localhost/test', { onMessage: vi.fn(), onError: vi.fn() })).rejects.toThrow(
        'Connection refused'
    )
})
