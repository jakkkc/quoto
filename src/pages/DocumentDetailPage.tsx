import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Document, DocumentItem, DocumentStatus, Client, DocumentMessage } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PDFDownloadLink } from '@react-pdf/renderer'
import { DocumentPDF } from '@/components/DocumentPDF'
import { statusClassName } from '@/lib/statusColors'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// Quote transitions stay simple status flips. Invoice payment is no longer
// a simple transition — see handleRecordPayment, which computes the new
// status (partially_paid vs paid) from the amount entered.
function nextStatuses(type: Document['type'], status: DocumentStatus): DocumentStatus[] {
  if (status === 'draft') return ['sent']
  if (status === 'sent' && type === 'quote') return ['accepted', 'rejected']
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
  const [messages, setMessages] = useState<DocumentMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const [hasExistingConversion, setHasExistingConversion] = useState(false)

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

    const [
      { data: clientData },
      { data: itemsData, error: itemsError },
      { data: businessData },
      { data: messagesData },
      { data: conversionData },
    ] = await Promise.all([
      supabase.from('clients').select('*').eq('id', docData.client_id).single(),
      supabase.from('document_items').select('*').eq('document_id', documentId).order('sort_order'),
      supabase.from('businesses').select('name').eq('id', docData.business_id).single(),
      supabase.from('document_messages').select('*').eq('document_id', documentId).order('created_at'),
      supabase.from('documents').select('id').eq('converted_from_id', documentId).limit(1),
    ])

    setClient((clientData as Client) ?? null)
    setBusinessName(businessData?.name ?? '')
    if (itemsError) setError(itemsError.message)
    else setItems((itemsData as DocumentItem[]) ?? [])
    setMessages((messagesData as DocumentMessage[]) ?? [])
    setHasExistingConversion((conversionData?.length ?? 0) > 0)

    if (docData.owner_unread) {
      await supabase.from('documents').update({ owner_unread: false }).eq('id', documentId)
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId])

  async function handleStatusChange(newStatus: DocumentStatus) {
    if (!doc) return
    const confirmed = window.confirm(`Change status from "${doc.status}" to "${newStatus}"?`)
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

  async function handleRecordPayment() {
    if (!doc) return
    const input = window.prompt(
      `Enter total amount paid so far (invoice total: ${doc.total.toFixed(2)}, currently recorded: ${doc.amount_paid.toFixed(2)}):`,
      doc.amount_paid.toFixed(2)
    )
    if (input === null) return

    const amount = parseFloat(input)
    if (isNaN(amount) || amount < 0) {
      setError('Enter a valid, non-negative amount.')
      return
    }

    const newStatus: DocumentStatus =
      amount >= doc.total ? 'paid' : amount > 0 ? 'partially_paid' : 'sent'

    const confirmed = window.confirm(
      `Record ${amount.toFixed(2)} as paid? Status will become "${newStatus.replace('_', ' ')}".`
    )
    if (!confirmed) return

    setUpdating(true)
    setError(null)

    const { error } = await supabase
      .from('documents')
      .update({ amount_paid: amount, status: newStatus, updated_at: new Date().toISOString() })
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
        vat_enabled: doc.vat_enabled,
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

  async function handleSendMessage() {
    if (!doc || !newMessage.trim()) return
    setSendingMessage(true)
    setError(null)

    const { error } = await supabase.from('document_messages').insert({
      document_id: doc.id,
      sender: 'owner',
      message: newMessage.trim(),
    })

    setSendingMessage(false)
    if (error) {
      setError(error.message)
      return
    }
    setNewMessage('')
    fetchAll()
  }

  if (loading) {
    return <p className="p-6 text-sm text-muted-foreground">Loading...</p>
  }
  if (error && !doc) {
    return <p className="p-6 text-sm text-rose-400">{error}</p>
  }
  if (!doc) return null

  const isReceipt = doc.type === 'invoice' && doc.status === 'paid'
  const heading = isReceipt ? 'Receipt' : doc.type === 'quote' ? 'Quote' : 'Invoice'
  const transitions = nextStatuses(doc.type, doc.status)
  const balance = doc.total - doc.amount_paid

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={onBack}>
          ← Back to Documents
        </Button>
        <Badge variant="outline" className={`capitalize ${statusClassName(doc.status)}`}>
          {doc.status.replace('_', ' ')}
        </Badge>
      </div>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      <div>
        <h1 className="text-xl sm:text-2xl">
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
            <div className="w-56 space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{doc.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>VAT (16%){!doc.vat_enabled && ' — off'}</span>
                <span>{doc.tax_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{doc.total.toFixed(2)}</span>
              </div>
              {doc.type === 'invoice' && doc.amount_paid > 0 && (
                <>
                  <div className="flex justify-between text-emerald-400">
                    <span>Amount Paid</span>
                    <span>{doc.amount_paid.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Balance Due</span>
                    <span>{balance.toFixed(2)}</span>
                  </div>
                </>
              )}
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conversation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No messages yet.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`text-sm p-2 rounded-md max-w-[80%] ${
                    msg.sender === 'owner' ? 'bg-primary/10 ml-auto text-right' : 'bg-white/5'
                  }`}
                >
                  <p className="text-xs text-muted-foreground mb-0.5 capitalize">
                    {msg.sender} · {new Date(msg.created_at).toLocaleString()}
                  </p>
                  <p>{msg.message}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Write a message to the client..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage()
              }}
            />
            <Button onClick={handleSendMessage} disabled={sendingMessage || !newMessage.trim()}>
              Send
            </Button>
          </div>
        </CardContent>
      </Card>

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
            alert('Share link copied to clipboard:\n' + url)
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

        {doc.type === 'invoice' &&
          (doc.status === 'sent' || doc.status === 'partially_paid') && (
            <Button disabled={updating} onClick={handleRecordPayment}>
              Record Payment
            </Button>
          )}

        {doc.type === 'quote' && doc.status === 'accepted' && !hasExistingConversion && (
          <Button disabled={updating} onClick={handleConvertToInvoice}>
            Convert to Invoice
          </Button>
        )}
      </div>
    </div>
  )
}
