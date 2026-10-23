import { describe, expect, it } from 'vitest'
import { collectionAnki, collectionCsv } from './collection-export'

describe('collection exports', () => {
    it('keeps newly added fields when older entries come first', () => {
        expect(
            collectionCsv([
                { word: 'old', description: '旧' },
                { word: 'new', description: '新', aiTranslation: '新的' },
            ])
        ).toContain('"aiTranslation"')
    })
    it('escapes CSV quotes, multiline translations and formula-like words', () => {
        const csv = collectionCsv([{ word: '=formula', description: '中文, "quote"\nnext' }])
        expect(csv).toBe('\uFEFF"word","description"\r\n"\'=formula","中文, ""quote""\nnext"')
    })
    it('neutralizes leading whitespace before spreadsheet formulas', () => {
        expect(collectionCsv([{ word: '  @formula' }])).toContain('"\'  @formula"')
    })
    it('makes two Anki fields with escaped HTML, tabs and line breaks', () => {
        const anki = collectionAnki([{ word: '<word>\t&', description: '中文\r\nnext' }])
        expect(anki).toBe(
            '#separator:Tab\n#html:true\n#columns:Front\tBack\n&lt;word&gt;&#9;&amp;\t中文<br>next\n中文<br>next\t&lt;word&gt;&#9;&amp;'
        )
    })
})
