import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import PublicDocumentView from '@/pages/PublicDocumentView'
import { ensureDevSession } from './lib/devAuth'

function Root() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/share/:token" element={<PublicDocumentView />} />
        <Route path="/*" element={<App />} />
      </Routes>
    </BrowserRouter>
  )
}

ensureDevSession()
  .catch((err) => console.error('Dev sign-in failed:', err))
  .finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <Root />
      </StrictMode>,
    )
  })
