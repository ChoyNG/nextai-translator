import { Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import { SWRConfig } from 'swr'
import { beforeAll, afterAll, expect, it, vi } from 'vitest'
import { useSettings } from './useSettings'
import { getSettings } from '../utils'
import { listen } from '@tauri-apps/api/event'
beforeAll(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
})
afterAll(() => {
    vi.unstubAllGlobals()
})
vi.mock('../utils', () => ({ isTauri: () => true, getSettings: vi.fn() }))
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn() }))
it('refreshes the translator after a separate settings window saves', async () => {
    let onSaved: () => void = () => undefined
    const unlisten = vi.fn()
    vi.mocked(listen).mockImplementation(async (_event, callback) => {
        onSaved = () => callback({} as never)
        return unlisten
    })
    vi.mocked(getSettings).mockResolvedValue({ provider: 'OpenAI' } as never)
    const container = document.createElement('div')
    const root = createRoot(container)
    function TranslatorSettings() {
        return <span>{useSettings().settings.provider}</span>
    }
    await act(async () =>
        root.render(
            <SWRConfig value={{ provider: () => new Map() }}>
                <Suspense fallback='loading'>
                    <TranslatorSettings />
                </Suspense>
            </SWRConfig>
        )
    )
    expect(container.textContent).toBe('OpenAI')
    vi.mocked(getSettings).mockResolvedValue({ provider: 'MyMemory' } as never)
    await act(async () => onSaved())
    expect(container.textContent).toBe('MyMemory')
    await act(async () => root.unmount())
    expect(unlisten).toHaveBeenCalledOnce()
})
