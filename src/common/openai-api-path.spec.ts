import { describe, expect, it } from 'vitest'
import {
    validateOpenAIAPIPath,
    getRecommendedOpenAIAPIPath,
    isResponsesCapableOpenAIModel,
    OPENAI_CHAT_COMPLETIONS_API_PATH,
    OPENAI_RESPONSES_API_PATH,
} from './openai-api-path'

describe('openai-api-path', () => {
    it('detects responses-capable models', () => {
        expect(isResponsesCapableOpenAIModel('gpt-5-nano')).toBe(true)
        expect(isResponsesCapableOpenAIModel('gpt-4o')).toBe(true)
        expect(isResponsesCapableOpenAIModel('o3-mini')).toBe(true)
        expect(isResponsesCapableOpenAIModel('gpt-4')).toBe(false)
    })

    it('returns recommended api path by model', () => {
        expect(getRecommendedOpenAIAPIPath('gpt-5-nano')).toBe(OPENAI_RESPONSES_API_PATH)
        expect(getRecommendedOpenAIAPIPath('gpt-4')).toBe(OPENAI_CHAT_COMPLETIONS_API_PATH)
        expect(getRecommendedOpenAIAPIPath(undefined)).toBe(OPENAI_CHAT_COMPLETIONS_API_PATH)
    })
})

it('rejects management page URLs only at the AI API boundary', () => {
    expect(validateOpenAIAPIPath('/v1/responses')).toBe('/v1/responses')
    expect(validateOpenAIAPIPath('/v1/chat/completions')).toBe('/v1/chat/completions')
    expect(() => validateOpenAIAPIPath('https://example.com/keys')).toThrow('免费机翻')
    expect(() => validateOpenAIAPIPath('/keys')).toThrow('管理网页')
})
