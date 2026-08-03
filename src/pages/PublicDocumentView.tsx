import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// Shape returned by the get_shared_document RPC (subset of the full
// Document type — no business_id/client_id exposed to anonymous callers).
interface SharedDocument {
  id: string
  type: 'quote' | 'invoice'
  status: string
  doc_number: string
  issue_date: string
  due_date: string | null
  subtotal: number
  tax_amount: number
  total: number
  notes: string | null
}

interface SharedItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  line_total: number
  sort_order: number
}

export default function PublicDocumentView() {
  const { token } = useParams<{ token: string }>()
  const [doc, setDoc] = useState<SharedDocument | null>(null)
  const [items, setItems] = useState<SharedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [note, setNote] = useState('')
  const [responding, setResponding] = useState(false)
  const [responded, setResponded] = useState<'accepted' | 'rejected' | null>(null)

  async function fetchDoc() {
    if (!token) return
    setLoading(true)
    setError(null)

    const [{ data: docData, error: docError }, { data: itemsData, error: itemsError }] =
      await Promise.all([
        supabase.rpc('get_shared_document', { token }).single(),
        supabase.rpc('get_shared_document_items', { token }),
      ])

    if (docError) {
      setError('This link is invalid or the document could not be found.')
      setLoading(false)
      return
    }

    setDoc(docData as SharedDocument)
    if (itemsError) setError(itemsError.message)
    else setItems((itemsData as SharedItem[]) ?? [])

    setLoading(false)
  }

  useEffect(() => {
    fetchDoc()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function handleRespond(newStatus: 'accepted' | 'rejected') {
    if (!token) return
    const confirmed = window.confirm(
      newStatus === 'accepted'
        ? 'Accept this quote?'
        : 'Reject this quote? This cannot be undone.'
    )
    if (!confirmed) return

    setResponding(true)
    setError(null)

    const { error } = await supabase.rpc('respond_to_shared_document', {
      token,
      new_status: newStatus,
      note: note.trim() || null,
    })

    setResponding(false)

    if (error) {
      setError(error.message)
      return
    }

    setResponded(newStatus)
  }

  if (loading) {
    return <p className="p-6 text-sm text-muted-foreground text-center">Loading...</p>
  }

  if (error && !doc) {
    return <p className="p-6 text-sm text-red-600 text-center">{error}</p>
  }

  if (!doc) return null

  const title = doc.type === 'quote' ? 'Quote' : 'Invoice'
  const awaitingResponse = doc.type === 'quote' && doc.status === 'sent' && !responded
  const finalStatus = responded ?? doc.status

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {title} {doc.doc_number}
        </h1>
        <Badge variant="outline" className="capitalize">{finalStatus}</Badge>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <p className="text-sm text-muted-foreground">
        Issued {doc.issue_date}
        {doc.due_date ? ` · Due ${doc.due_date}` : ''}
      </p>

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

      {awaitingResponse && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Response</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="note">Add a note (optional)</Label>
              <Input
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Any comments about this quote..."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                disabled={responding}
                onClick={() => handleRespond('rejected')}
              >
                Reject
              </Button>
              <Button disabled={responding} onClick={() => handleRespond('accepted')}>
                Accept
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {responded && (
        <p className="text-sm text-muted-foreground text-center">
          Thanks — your response has been recorded.
        </p>
      )}
    </div>
  )
}
