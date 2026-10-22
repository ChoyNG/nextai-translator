import useSWR from 'swr'

import { ISettings } from '../types'
import { getSettings, isTauri } from '../utils'
import { useCallback, useEffect } from 'react'

export function useSettings(): {
    settings: ISettings
    isSettingsLoading: boolean
    setSettings: (settings: ISettings) => void
} {
    const { data: settings, isLoading, mutate } = useSWR<ISettings>('settings', getSettings, { suspense: true })

    useEffect(() => {
        if (!isTauri()) return
        let disposed = false
        let unlisten: (() => void) | undefined
        import('@tauri-apps/api/event')
            .then(({ listen }) =>
                listen('config-updated-event', () => {
                    void mutate()
                })
            )
            .then((cleanup) => {
                if (disposed) cleanup()
                else unlisten = cleanup
            })
            .catch(console.error)
        return () => {
            disposed = true
            unlisten?.()
        }
    }, [mutate])

    const setSettings = useCallback(
        (newSettings: ISettings) => {
            mutate(newSettings, {
                optimisticData: newSettings,
                revalidate: false,
            })
        },
        [mutate]
    )

    return {
        settings: settings!,
        isSettingsLoading: isLoading,
        setSettings,
    }
}
