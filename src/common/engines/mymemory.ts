import { AbstractEngine } from './abstract-engine'
import { IMessageRequest } from './interfaces'
import { getUniversalFetch } from '../universal-fetch'

const language = (code: string) => (code === 'zh-Hans' ? 'zh-CN' : code === 'zh-Hant' ? 'zh-TW' : code)

export class MyMemory extends AbstractEngine {
    async getModel() {
        return 'free-translation'
    }

    async listModels() {
        return [{ id: 'free-translation', name: 'MyMemory · 免费机翻 / Free translation' }]
    }

    async sendMessage(req: IMessageRequest): Promise<void> {
        const query = req.translation
        if (!query || query.mode !== 'translate') {
            throw new Error(
                'MyMemory only translates. Choose an AI provider for polishing, summaries or custom actions.'
            )
        }
        if (!query.text.trim() || new TextEncoder().encode(query.text).length > 500) {
            throw new Error('免费机翻每次最多 500 UTF-8 字节，请选短一些的文本，或切换 AI 翻译。')
        }
        if (query.source === query.target) {
            throw new Error('请选择不同的原文和目标语言。机翻不支持同语言润色。')
        }
        const params = new URLSearchParams({
            q: query.text,
            langpair: `${language(query.source)}|${language(query.target)}`,
        })
        const response = await getUniversalFetch()(`https://api.mymemory.translated.net/get?${params}`, {
            signal: req.signal,
        })
        req.onStatusCode?.(response.status)
        if (!response.ok) throw new Error(`MyMemory HTTP ${response.status}. Please try again later.`)
        const body = await response.json()
        if (Number(body.responseStatus) !== 200 || body.quotaFinished) {
            throw new Error('MyMemory 免费额度已用完或服务拒绝请求。请稍后重试，或切换 AI 翻译。')
        }
        const translated = body.responseData?.translatedText
        if (typeof translated !== 'string' || !translated.trim()) throw new Error('MyMemory returned no translation.')
        // Parse only to decode entities; returned markup is never inserted into the live document.
        const parsed = new DOMParser().parseFromString(translated, 'text/html')
        await req.onMessage({ content: parsed.body.textContent ?? translated, role: 'assistant', isFullText: true })
        req.onFinished('stop')
    }
}
