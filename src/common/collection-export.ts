export function collectionCsv(rows: Record<string, string | number>[]): string {
    if (!rows.length) return ''
    const columns = Object.keys(rows[0])
    const field = (value: string | number) => {
        let text = String(value ?? '')
        if (/^[\s]*[=+\-@]|^[\t\r\n]/.test(text)) text = `'${text}`
        return `"${text.replace(/"/g, '""')}"`
    }
    return (
        '\uFEFF' +
        [columns.map(field).join(','), ...rows.map((row) => columns.map((key) => field(row[key])).join(','))].join(
            '\r\n'
        )
    )
}

export function collectionAnki(rows: { word: string; description: string }[]): string {
    const html = (text: string) =>
        text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\r\n?|\n/g, '<br>')
            .replace(/\t/g, '&#9;')
    return (
        '#separator:Tab\n#html:true\n#columns:Front\tBack\n' +
        rows.map((row) => `${html(row.word)}\t${html(row.description)}`).join('\n')
    )
}
