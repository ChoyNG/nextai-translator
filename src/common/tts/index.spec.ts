import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { defaultTTSProvider, doSpeak } from './index'
import { speak as localSpeak } from './local-tts'
vi.mock('../utils', () => ({ isTauri: () => true }))
vi.mock('./local-tts', () => ({ isLocalTTSLanguage: () => true, speak: vi.fn() }))
let utterance: SpeechSynthesisUtterance
const speak = vi.fn((value) => {
    utterance = value
})
const cancel = vi.fn()
beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('SpeechSynthesisUtterance', class extends EventTarget {})
    vi.stubGlobal('speechSynthesis', { getVoices: () => [], speak, cancel })
})
afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    vi.unstubAllGlobals()
})
const options = () => ({
    provider: defaultTTSProvider,
    text: 'mammoths',
    lang: 'en' as const,
    signal: new AbortController().signal,
    onFinish: vi.fn(),
    onStartSpeaking: vi.fn(),
})
it('uses system voices without downloading a model and finishes on end', async () => {
    const req = options()
    const result = doSpeak(req)
    expect(localSpeak).not.toHaveBeenCalled()
    expect(req.onStartSpeaking).not.toHaveBeenCalled()
    utterance.dispatchEvent(new Event('start'))
    expect(req.onStartSpeaking).toHaveBeenCalledOnce()
    utterance.dispatchEvent(new Event('end'))
    await result
    expect(req.onFinish).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
})
it('reports a stuck system voice and releases its loading state', async () => {
    const req = options()
    const assertion = expect(doSpeak(req)).rejects.toThrow('启动超时')
    await vi.advanceTimersByTimeAsync(10000)
    await assertion
    expect(req.onFinish).toHaveBeenCalledOnce()
    expect(cancel).toHaveBeenCalledOnce()
})
it('releases playback on a system speech error', async () => {
    const req = options()
    const assertion = expect(doSpeak(req)).rejects.toThrow('audio-busy')
    utterance.dispatchEvent(Object.assign(new Event('error'), { error: 'audio-busy' }))
    await assertion
    expect(req.onFinish).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
})
it('cleans up when the user stops playback', async () => {
    const controller = new AbortController()
    const req = { ...options(), signal: controller.signal }
    const result = doSpeak(req)
    controller.abort()
    await result
    expect(req.onFinish).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
})
