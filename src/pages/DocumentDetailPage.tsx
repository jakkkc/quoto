import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Document, DocumentItem, DocumentStatus, Client } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PDFDownloadLink } from '@react-pdf/renderer'
import { DocumentPDF } from '@/components/DocumentPDF'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// Valid next statuses per current status + document type.
// Keeps the transition rules in one place rather than scattered through JSX.
function nextStatuses(type: Document['type'], status: DocumentStatus): DocumentStatus[] {
  if (status === 'draft') return ['sent']
  if (status === 'sent' && type === 'quote') return ['accepted', 'rejected']
  if (status === 'sent' && type === 'invoice') return ['paid']
  return []
}

export default function DocumentDetailPage({
  documentId,
  onBack,
  onConverted,
}: {
  documentId: string
  onBack: () => void
  onConverted: (newDocumentId: string) => void
}) {
  const [doc, setDoc] = useState<Document | null>(null)
  const [businessName, setBusinessName] = useState<string>('')
  const [client, setClient] = useState<Client | null>(null)
  const [items, setItems] = useState<DocumentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  async function fetchAll() {
    setLoading(true)
    setError(null)

    const { data: docData, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError) {
      setError(docError.message)
      setLoading(false)
      return
    }
    setDoc(docData as Document)

    const [{ data: clientData }, { data: itemsData, error: itemsError }, { data: businessData }] =
      await Promise.all([
        supabase.from('clients').select('*').eq('id', docData.client_id).single(),
        supabase
          .from('document_items')
          .select('*')
          .eq('document_id', documentId)
          .order('sort_order'),
        supabase.from('businesses').select('name').eq('id', docData.business_id).single(),
      ])

    setClient((clientData as Client) ?? null)
    setBusinessName(businessData?.name ?? '')
    if (itemsError) setError(itemsError.message)
    else setItems((itemsData as DocumentItem[]) ?? [])

    setLoading(false)
  }

  useEffect(() => {
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId])

  async function handleStatusChange(newStatus: DocumentStatus) {
    if (!doc) return
    const confirmed = window.confirm(
      `Change status from "${doc.status}" to "${newStatus}"?`
    )
    if (!confirmed) return

    setUpdating(true)
    setError(null)

    const { error } = await supabase
      .from('documents')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', doc.id)

    setUpdating(false)

    if (error) {
      setError(error.message)
      return
    }
    fetchAll()
  }

  async function handleConvertToInvoice() {
    if (!doc) return
    const confirmed = window.confirm(
      `Convert quote ${doc.doc_number} to a new draft invoice? This will copy all line items.`
    )
    if (!confirmed) return

    setUpdating(true)
    setError(null)

    const { generateDocNumber } = await import('@/lib/docNumber')
    const docNumber = await generateDocNumber(doc.business_id, 'invoice')

    const { data: newDoc, error: docError } = await supabase
      .from('documents')
      .insert({
        business_id: doc.business_id,
        client_id: doc.client_id,
        type: 'invoice',
        status: 'draft',
        converted_from_id: doc.id,
        doc_number: docNumber,
        subtotal: doc.subtotal,
        tax_amount: doc.tax_amount,
        total: doc.total,
        notes: doc.notes,
      })
      .select()
      .single()

    if (docError) {
      setError(docError.message)
      setUpdating(false)
      return
    }

    if (items.length > 0) {
      const { error: itemsError } = await supabase.from('document_items').insert(
        items.map((item) => ({
          document_id: newDoc.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_total: item.line_total,
          sort_order: item.sort_order,
        }))
      )
      if (itemsError) {
        setError(itemsError.message)
        setUpdating(false)
        return
      }
    }

    setUpdating(false)
    onConverted(newDoc.id)
  }

  if (loading) {
    return <p className="p-6 text-sm text-muted-foreground">Loading...</p>
  }

  if (error && !doc) {
    return <p className="p-6 text-sm text-red-600">{error}</p>
  }

  if (!doc) return null

  const isReceipt = doc.type === 'invoice' && doc.status === 'paid'
  const heading = isReceipt ? 'Receipt' : doc.type === 'quote' ? 'Quote' : 'Invoice'
  const transitions = nextStatuses(doc.type, doc.status)

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={onBack}>
          ← Back to Documents
        </Button>
        <Badge variant="outline" className="capitalize">{doc.status}</Badge>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div>
        <h1 className="text-2xl font-semibold">
          {heading} {doc.doc_number}
        </h1>
        <p className="text-sm text-muted-foreground">
          Issued {doc.issue_date}
          {doc.due_date ? ` · Due ${doc.due_date}` : ''}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Client</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <p className="font-medium">{client?.name ?? '—'}</p>
          {client?.email && <p>{client.email}</p>}
          {client?.phone && <p>{client.phone}</p>}
          {client?.address && <p>{client.address}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">{item.unit_price.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{item.line_total.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="border-t mt-3 pt-3 flex justify-end">
            <div className="w-48 space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{doc.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>{doc.tax_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{doc.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {doc.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{doc.notes}</CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2 justify-end items-center">
        <PDFDownloadLink
          document={
            <DocumentPDF doc={doc} items={items} client={client} businessName={businessName} />
          }
          fileName={`${doc.doc_number}.pdf`}
        >
          {({ loading: pdfLoading }) => (
            <Button variant="outline" disabled={pdfLoading}>
              {pdfLoading ? 'Preparing PDF...' : 'Download PDF'}
            </Button>
          )}
        </PDFDownloadLink>

        <Button
          variant="outline"
          onClick={() => {
            const url = `${window.location.origin}/share/${doc.share_token}`
            navigator.clipboard.writeText(url)
            alert("Share link copied to clipboard:\n" + url)
          }}
        >
          Copy Share Link
        </Button>

        {transitions.map((status) => (
          <Button
            key={status}
            variant="outline"
            disabled={updating}
            onClick={() => handleStatusChange(status)}
            className="capitalize"
          >
            Mark as {status}
          </Button>
        ))}

        {doc.type === 'quote' && doc.status === 'accepted' && (
          <Button disabled={updating} onClick={handleConvertToInvoice}>
            Convert to Invoice
          </Button>
        )}
      </div>
    </div>
  )
}
