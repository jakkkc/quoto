import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import AuthPage from '@/pages/AuthPage'
import ClientsPage from '@/pages/ClientsPage'
import DocumentsListPage from '@/pages/DocumentsListPage'
import CreateDocumentPage from '@/pages/CreateDocumentPage'
import DocumentDetailPage from '@/pages/DocumentDetailPage'
import { Button } from '@/components/ui/button'

type View =
  | { name: 'clients' }
  | { name: 'documents' }
  | { name: 'create-document' }
  | { name: 'document-detail'; id: string }

function App() {
  const { user, loading } = useAuth()
  const [view, setView] = useState<View>({ name: 'documents' })

  if (loading) {
    return <p className="p-6 text-sm text-muted-foreground text-center">Loading...</p>
  }

  if (!user) {
    return <AuthPage />
  }

  return (
    <div>
      <nav className="border-b p-3 flex gap-2 justify-between max-w-4xl mx-auto">
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
        </div>
        <Button variant="outline" size="sm" onClick={() => supabase.auth.signOut()}>
          Log out
        </Button>
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
    </div>
  )
}

export default App
