import { afterEach, expect, it, vi } from 'vitest'
import { exportTextFile, exportToCsv } from './utils'
import { save } from '@tauri-apps/plugin-dialog'
import { writeFile } from '@tauri-apps/plugin-fs'
vi.mock('@tauri-apps/plugin-dialog', () => ({ save: vi.fn() }))
vi.mock('@tauri-apps/plugin-fs', () => ({ writeFile: vi.fn() }))
afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
})
it('saves desktop exports to the location chosen by the user', async () => {
    vi.stubGlobal('__TAURI__', {})
    vi.mocked(save).mockResolvedValue('C:/Exports/study.csv')
    const path = await exportTextFile('study.csv', '中文', 'text/csv')
    expect(path).toBe('C:/Exports/study.csv')
    expect(writeFile).toHaveBeenCalledWith(path, new TextEncoder().encode('中文'))
})
it('cancels without writing a file or reporting success', async () => {
    vi.stubGlobal('__TAURI__', {})
    vi.mocked(save).mockResolvedValue(null)
    expect(await exportTextFile('study.apkg', new Uint8Array([1, 2]), 'application/octet-stream')).toBeNull()
    expect(writeFile).not.toHaveBeenCalled()
})
it('rejects an empty collection and propagates write errors', async () => {
    vi.stubGlobal('__TAURI__', {})
    await expect(exportToCsv('study', [])).rejects.toThrow('生词本为空')
    vi.mocked(save).mockResolvedValue('C:/Exports/study.csv')
    vi.mocked(writeFile).mockRejectedValue(new Error('Disk full'))
    await expect(exportTextFile('study.csv', 'word', 'text/csv')).rejects.toThrow('Disk full')
})
