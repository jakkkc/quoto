import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import PublicDocumentView from '@/pages/PublicDocumentView'

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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
