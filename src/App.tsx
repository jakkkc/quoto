import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import { BusinessProvider, useBusiness } from '@/contexts/BusinessContext'
import AuthPage from '@/pages/AuthPage'
import ClientsPage from '@/pages/ClientsPage'
import DocumentsListPage from '@/pages/DocumentsListPage'
import CreateDocumentPage from '@/pages/CreateDocumentPage'
import DocumentDetailPage from '@/pages/DocumentDetailPage'
import BusinessSettingsPage from '@/pages/BusinessSettingsPage'
import { Button } from '@/components/ui/button'

type View =
  | { name: 'clients' }
  | { name: 'documents' }
  | { name: 'create-document' }
  | { name: 'document-detail'; id: string }
  | { name: 'settings' }

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return <p className="p-6 text-sm text-muted-foreground text-center">Loading...</p>
  }

  if (!user) {
    return <AuthPage />
  }

  return (
    <BusinessProvider>
      <AppShell />
    </BusinessProvider>
  )
}

function AppShell() {
  const { installable, promptInstall } = useInstallPrompt()
  const { businessId, loading: businessLoading } = useBusiness()
  const [view, setView] = useState<View>({ name: 'documents' })

  if (businessLoading || !businessId) {
    return <p className="p-6 text-sm text-muted-foreground text-center">Setting up your workspace...</p>
  }

  return (
    <div>
      <nav className="border-b border-white/10 backdrop-blur-md bg-white/[0.03] p-3 flex items-center justify-between max-w-4xl mx-auto">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Quoto" className="h-7 w-7 rounded-full object-cover" />
          <span className="font-heading text-sm uppercase tracking-widest text-foreground/90">
            Quoto
          </span>
        </div>

        <div className="flex gap-2">
          <Button
            variant={view.name === 'documents' || view.name === 'document-detail' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView({ name: 'documents' })}
          >
            Documents
          </Button>
          <Button
            variant={view.name === 'clients' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView({ name: 'clients' })}
          >
            Clients
          </Button>
          <Button
            variant={view.name === 'settings' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView({ name: 'settings' })}
          >
            Settings
          </Button>
        </div>

        <div className="flex gap-2">
          {installable && (
            <Button variant="outline" size="sm" onClick={promptInstall}>
              Install App
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => supabase.auth.signOut()}>
            Log out
          </Button>
        </div>
      </nav>

      {view.name === 'clients' && <ClientsPage />}

      {view.name === 'documents' && (
        <DocumentsListPage
          onNewDocument={() => setView({ name: 'create-document' })}
          onOpenDocument={(id) => setView({ name: 'document-detail', id })}
        />
      )}

      {view.name === 'create-document' && (
        <CreateDocumentPage onSaved={() => setView({ name: 'documents' })} />
      )}

      {view.name === 'document-detail' && (
        <DocumentDetailPage
          documentId={view.id}
          onBack={() => setView({ name: 'documents' })}
          onConverted={(newId) => setView({ name: 'document-detail', id: newId })}
        />
      )}

      {view.name === 'settings' && <BusinessSettingsPage />}
    </div>
  )
}

export default App
