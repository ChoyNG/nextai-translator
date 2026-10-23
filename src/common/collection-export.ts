export interface CollectionContent {
    machineTranslation: string
    aiTranslation: string
    examples: string
    conversation: string
}

export function collectionCsv(rows: Record<string, string | number>[]): string {
    if (!rows.length) return ''
    const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))))
    const field = (value: string | number) => {
        let text = String(value ?? '')
        if (/^[\s]*[=+\-@]|^[\t\r\n]/.test(text)) text = "'" + text
        return '"' + text.replace(/"/g, '""') + '"'
    }
    return (
        '\uFEFF' +
        [columns.map(field).join(','), ...rows.map((row) => columns.map((key) => field(row[key])).join(','))].join(
            '\r\n'
        )
    )
}

export function collectionAnki(rows: ({ word: string; description: string } & Partial<CollectionContent>)[]): string {
    const html = (text: string) =>
        text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\r\n?|\n/g, '<br>')
            .replace(/\t/g, '&#9;')
    return (
        '#separator:Tab\n#html:true\n#columns:Front\tBack\n' +
        rows
            .flatMap((row) => {
                const chinese = row.aiTranslation || row.machineTranslation || row.description
                const notes = [chinese, row.examples, row.conversation].filter(Boolean).join('\n\n')
                return [
                    html(row.word) + '\t' + html(notes),
                    html(chinese) +
                        '\t' +
                        html([row.word, row.examples, row.conversation].filter(Boolean).join('\n\n')),
                ]
            })
            .join('\n')
    )
}
