import { useEffect, useState } from 'react'

// Module-level so the captured event survives across component
// remounts/navigations within the SPA.
let deferredPrompt: any = null
let listenerAttached = false

function attachListener() {
  if (listenerAttached) return
  listenerAttached = true
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
  })
}

export function useInstallPrompt() {
  const [installable, setInstallable] = useState(false)

  useEffect(() => {
    attachListener()
    const interval = setInterval(() => setInstallable(!!deferredPrompt), 500)
    return () => clearInterval(interval)
  }, [])

  async function promptInstall() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    deferredPrompt = null
    setInstallable(false)
  }

  return { installable, promptInstall }
}
