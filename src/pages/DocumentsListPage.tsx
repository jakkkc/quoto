import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CURRENT_BUSINESS_ID } from '@/lib/constants'
import type { DocumentWithClient } from '@/types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { statusClassName } from '@/lib/statusColors'

export default function DocumentsListPage({
  onNewDocument,
  onOpenDocument,
}: {
  onNewDocument: () => void
  onOpenDocument: (id: string) => void
}) {
  const [documents, setDocuments] = useState<DocumentWithClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchDocuments() {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('documents')
      .select('*, clients(name)')
      .eq('business_id', CURRENT_BUSINESS_ID)
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setDocuments(data as DocumentWithClient[])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchDocuments()
  }, [])

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl sm:text-2xl">Documents</h1>
        <Button onClick={onNewDocument}>New Quote / Invoice</Button>
      </div>

      {error && <p className="text-sm text-rose-400 mb-4">{error}</p>}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading documents...</p>
      ) : documents.length === 0 ? (
        <div className="border border-white/10 rounded-2xl p-8 text-center text-muted-foreground bg-white/[0.03]">
          <p>No quotes or invoices yet — create your first one.</p>
        </div>
      ) : (
        <>
          {/* Desktop / wide screens: table */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead></TableHead>
                  <TableHead>Number</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow
                    key={doc.id}
                    className="cursor-pointer"
                    onClick={() => onOpenDocument(doc.id)}
                  >
                    <TableCell>
                      {doc.owner_unread && (
                        <span className="inline-block w-2 h-2 rounded-full bg-brand-blue" title="New activity" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{doc.doc_number}</TableCell>
                    <TableCell className="capitalize">{doc.type}</TableCell>
                    <TableCell>{doc.clients?.name ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`capitalize ${statusClassName(doc.status)}`}>
                        {doc.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{doc.issue_date}</TableCell>
                    <TableCell className="text-right">{doc.total.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenDocument(doc.id)
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: cards */}
          <div className="sm:hidden space-y-3">
            {documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => onOpenDocument(doc.id)}
                className="w-full text-left rounded-2xl border border-white/10 bg-white/[0.05] backdrop-blur-xl p-4 active:scale-[0.98] transition-transform"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {doc.owner_unread && (
                      <span className="inline-block w-2 h-2 rounded-full bg-brand-blue shrink-0" />
                    )}
                    <span className="font-medium">{doc.doc_number}</span>
                  </div>
                  <Badge variant="outline" className={`capitalize ${statusClassName(doc.status)}`}>
                    {doc.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span className="capitalize">{doc.type} · {doc.clients?.name ?? '—'}</span>
                  <span>{doc.issue_date}</span>
                </div>
                <div className="mt-2 text-right font-semibold">
                  {doc.total.toFixed(2)}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
