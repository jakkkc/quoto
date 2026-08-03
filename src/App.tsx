import { useState } from 'react'
import ClientsPage from '@/pages/ClientsPage'
import DocumentsListPage from '@/pages/DocumentsListPage'
import CreateDocumentPage from '@/pages/CreateDocumentPage'
import { Button } from '@/components/ui/button'

type View = 'clients' | 'documents' | 'create-document'

function App() {
  const [view, setView] = useState<View>('documents')

  return (
    <div>
      <nav className="border-b p-3 flex gap-2 max-w-4xl mx-auto">
        <Button
          variant={view === 'documents' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('documents')}
        >
          Documents
        </Button>
        <Button
          variant={view === 'clients' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('clients')}
        >
          Clients
        </Button>
      </nav>

      {view === 'clients' && <ClientsPage />}
      {view === 'documents' && (
        <DocumentsListPage onNewDocument={() => setView('create-document')} />
      )}
      {view === 'create-document' && (
        <CreateDocumentPage onSaved={() => setView('documents')} />
      )}
    </div>
  )
}

export default App
