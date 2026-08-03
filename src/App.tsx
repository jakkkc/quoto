import { useState } from 'react'
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
  const [view, setView] = useState<View>({ name: 'documents' })

  return (
    <div>
      <nav className="border-b p-3 flex gap-2 max-w-4xl mx-auto">
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
