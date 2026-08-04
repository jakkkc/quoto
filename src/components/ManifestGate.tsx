import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { setManifestForPath } from '@/lib/pwaManifest'

export function ManifestGate() {
  const location = useLocation()
  useEffect(() => {
    setManifestForPath(location.pathname)
  }, [location.pathname])
  return null
}
