import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot, Root } from 'react-dom/client'
import { act, Simulate } from 'react-dom/test-utils'
import { IMessageRequest } from '../engines/interfaces'
import { FollowUp } from './FollowUp'

const mocks = vi.hoisted(() => ({ send: vi.fn(), settings: vi.fn() }))
vi.mock('../engines/openai', () => ({
    OpenAI: class {
        sendMessage = mocks.send
    },
}))
vi.mock('../utils', () => ({ getSettings: mocks.settings }))
vi.mock('./Markdown', () => ({ Markdown: ({ children }: { children: string }) => <div>{children}</div> }))
vi.mock('baseui-sd/button', () => ({
    Button: ({
        children,
        onClick,
        type,
        disabled,
    }: {
        children: React.ReactNode
        onClick?: () => void
        type?: 'submit' | 'button'
        disabled?: boolean
    }) => (
        <button onClick={onClick} type={type} disabled={disabled}>
            {children}
        </button>
    ),
}))
vi.mock('../hooks/useTheme', () => ({ useTheme: () => ({ theme: { colors: {} } }) }))

describe('AI follow-up conversation', () => {
    let root: Root
    let container: HTMLDivElement
    const save = vi.fn().mockResolvedValue(true)
    beforeEach(() => {
        Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
        vi.clearAllMocks()
        mocks.settings.mockResolvedValue({ apiURL: 'https://provider.example', apiKeys: 'test-key' })
        mocks.send.mockImplementation(async (req: IMessageRequest) => {
            await req.onMessage({ content: 'Example answer', role: 'assistant' })
            req.onFinished('stop')
        })
        container = document.createElement('div')
        document.body.append(container)
        root = createRoot(container)
        act(() => root.render(<FollowUp text='take ownership' translation='承担责任' target='zh-Hans' onSave={save} />))
    })
    afterEach(() => {
        act(() => root.unmount())
        container.remove()
    })
    const ask = async (question: string) => {
        const input = container.querySelector('input')!
        act(() => {
            input.value = question
            Simulate.change(input)
        })
        await act(async () => Simulate.submit(container.querySelector('form')!))
    }
    it('keeps the selected phrase, translation, previous answers and follow-up question', async () => {
        await ask('Explain this phrase')
        await ask('Give a workplace example')
        const request = mocks.send.mock.calls[1][0] as IMessageRequest
        expect(request.messages?.map((message) => message.role)).toEqual([
            'system',
            'user',
            'user',
            'assistant',
            'user',
        ])
        expect(request.messages?.[1].content).toContain('take ownership')
        expect(request.messages?.[1].content).toContain('承担责任')
        expect(request.messages?.[3].content).toBe('Example answer')
        expect(request.messages?.[4].content).toBe('Give a workplace example')
        const button = Array.from(container.querySelectorAll('button')).find(
            (item) => item.textContent?.includes('收藏翻译')
        )!
        await act(async () => button.click())
        expect(save).toHaveBeenCalledWith(expect.stringContaining('承担责任\n\nYou: Explain this phrase'))
    })
    it('shows setup guidance without making an AI request when no key is configured', async () => {
        mocks.settings.mockResolvedValue({ apiURL: 'https://provider.example', apiKeys: '' })
        await ask('Explain')
        expect(mocks.send).not.toHaveBeenCalled()
        expect(container.querySelector('[role=alert]')?.textContent).toContain('API Key')
    })
    it('keeps failed requests out of subsequent conversation history', async () => {
        mocks.send.mockImplementationOnce(async (req: IMessageRequest) => req.onError('Provider quota exceeded'))
        await ask('First request')
        await ask('Retry question')
        const request = mocks.send.mock.calls[1][0] as IMessageRequest
        expect(request.messages).toHaveLength(3)
        expect(request.messages?.[2].content).toBe('Retry question')
    })
    it('only calls AI when retranslate is clicked and continues the same conversation', async () => {
        expect(mocks.send).not.toHaveBeenCalled()
        const button = Array.from(container.querySelectorAll('button')).find((item) => item.textContent === '✦ AI 再译')
        expect(button).toBeDefined()
        await act(async () => button!.click())
        expect(container.querySelector('details')?.open).toBe(true)
        expect(mocks.send.mock.calls[0][0].commandPrompt).toContain('重新翻译')
        await ask('Why this wording?')
        const request = mocks.send.mock.calls[1][0] as IMessageRequest
        expect(request.messages?.[1].content).toContain('承担责任')
        expect(request.messages?.[3].content).toBe('Example answer')
        expect(request.messages?.[4].content).toBe('Why this wording?')
    })
})
