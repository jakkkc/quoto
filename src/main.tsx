import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import PublicDocumentView from '@/pages/PublicDocumentView'
import { ManifestGate } from '@/components/ManifestGate'

function Root() {
  return (
    <BrowserRouter>
      <ManifestGate />
      <Routes>
        <Route path="/share/:token" element={<PublicDocumentView />} />
        <Route path="/*" element={<App />} />
      </Routes>
    </BrowserRouter>
  )
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('Service worker registration failed:', err)
    })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
