// Attaches/removes the web app manifest link based on the current route,
// so only the owner-facing app is installable — never the public share
// page a client might open.
export function setManifestForPath(pathname: string) {
  const existing = document.querySelector('link[rel="manifest"]')
  const isSharePage = pathname.startsWith('/share/')

  if (isSharePage) {
    existing?.remove()
  } else if (!existing) {
    const link = document.createElement('link')
    link.rel = 'manifest'
    link.href = '/manifest.json'
    document.head.appendChild(link)
  }
}
