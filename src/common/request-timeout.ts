// Native IPC can remain pending even after abort; race it so the UI always settles.
export async function withRequestTimeout<T>(
    operation: (signal: AbortSignal) => Promise<T>,
    signal: AbortSignal,
    milliseconds: number,
    message: string
): Promise<T> {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    let abort: () => void = () => undefined
    try {
        return await new Promise<T>((resolve, reject) => {
            abort = () => {
                controller.abort()
                reject(new DOMException('Aborted', 'AbortError'))
            }
            if (signal.aborted) {
                abort()
                return
            }
            signal.addEventListener('abort', abort, { once: true })
            timer = setTimeout(() => {
                controller.abort()
                reject(new Error(message))
            }, milliseconds)
            Promise.resolve()
                .then(() => {
                    if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError')
                    return operation(controller.signal)
                })
                .then(resolve, reject)
        })
    } finally {
        clearTimeout(timer)
        signal.removeEventListener('abort', abort)
        controller.abort()
    }
}
