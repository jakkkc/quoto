import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CURRENT_BUSINESS_ID } from '@/lib/constants'
import { generateDocNumber } from '@/lib/docNumber'
import type { Client, DocumentType } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface LineItem {
  key: string // local-only, for React list keys
  description: string
  quantity: number
  unit_price: number
}

function emptyLineItem(): LineItem {
  return {
    key: crypto.randomUUID(),
    description: '',
    quantity: 1,
    unit_price: 0,
  }
}

export default function CreateDocumentPage({
  onSaved,
}: {
  onSaved: () => void
}) {
  const [clients, setClients] = useState<Client[]>([])
  const [loadingClients, setLoadingClients] = useState(true)
  const [clientId, setClientId] = useState<string>('')
  const [type, setType] = useState<DocumentType>('quote')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<LineItem[]>([emptyLineItem()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchClients() {
      setLoadingClients(true)
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('business_id', CURRENT_BUSINESS_ID)
        .order('name')

      if (error) {
        setError(error.message)
      } else {
        setClients(data as Client[])
        if (data && data.length > 0) setClientId(data[0].id)
      }
      setLoadingClients(false)
    }
    fetchClients()
  }, [])

  function updateItem(key: string, patch: Partial<LineItem>) {
    setItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, ...patch } : item))
    )
  }

  function addItem() {
    setItems((prev) => [...prev, emptyLineItem()])
  }

  function removeItem(key: string) {
    setItems((prev) =>
      prev.length === 1 ? prev : prev.filter((item) => item.key !== key)
    )
  }

  function lineTotal(item: LineItem) {
    return item.quantity * item.unit_price
  }

  const subtotal = items.reduce((sum, item) => sum + lineTotal(item), 0)
  const taxAmount = 0 // v1: no tax handling yet
  const total = subtotal + taxAmount

  async function handleSave() {
    setError(null)

    if (!clientId) {
      setError('Please select a client.')
      return
    }
    const validItems = items.filter((i) => i.description.trim())
    if (validItems.length === 0) {
      setError('Add at least one line item with a description.')
      return
    }

    setSaving(true)

    // Retry loop: if doc_number collides with the unique constraint,
    // regenerate and try again (rare, but possible under concurrent saves).
    const MAX_ATTEMPTS = 5
    let lastError: string | null = null

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const docNumber = await generateDocNumber(CURRENT_BUSINESS_ID, type)

      const { data: doc, error: docError } = await supabase
        .from('documents')
        .insert({
          business_id: CURRENT_BUSINESS_ID,
          client_id: clientId,
          type,
          status: 'draft',
          doc_number: docNumber,
          subtotal,
          tax_amount: taxAmount,
          total,
          notes: notes.trim() || null,
        })
        .select()
        .single()

      if (docError) {
        // Postgres unique_violation error code
        if (docError.code === '23505') {
          lastError = docError.message
          continue // retry with a freshly generated number
        }
        setError(docError.message)
        setSaving(false)
        return
      }

      const { error: itemsError } = await supabase.from('document_items').insert(
        validItems.map((item, index) => ({
          document_id: doc.id,
          description: item.description.trim(),
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_total: lineTotal(item),
          sort_order: index,
        }))
      )

      if (itemsError) {
        setError(itemsError.message)
        setSaving(false)
        return
      }

      setSaving(false)
      onSaved()
      return
    }

    setError(lastError ?? 'Could not generate a unique document number, please try again.')
    setSaving(false)
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">New {type === 'quote' ? 'Quote' : 'Invoice'}</h1>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={type === 'quote' ? 'default' : 'outline'}
              onClick={() => setType('quote')}
            >
              Quote
            </Button>
            <Button
              type="button"
              variant={type === 'invoice' ? 'default' : 'outline'}
              onClick={() => setType('invoice')}
            >
              Invoice
            </Button>
          </div>

          <div>
            <Label>Client</Label>
            {loadingClients ? (
              <p className="text-sm text-muted-foreground">Loading clients...</p>
            ) : clients.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No clients yet — add a client first before creating a document.
              </p>
            ) : (
              <Select value={clientId} onValueChange={(value) => setClientId(value ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Line Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((item) => (
            <div key={item.key} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-6">
                <Label>Description</Label>
                <Input
                  value={item.description}
                  onChange={(e) => updateItem(item.key, { description: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label>Qty</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.quantity}
                  onChange={(e) =>
                    updateItem(item.key, { quantity: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="col-span-2">
                <Label>Unit Price</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unit_price}
                  onChange={(e) =>
                    updateItem(item.key, { unit_price: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="col-span-1 text-sm pb-2">
                {lineTotal(item).toFixed(2)}
              </div>
              <div className="col-span-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeItem(item.key)}
                  disabled={items.length === 1}
                >
                  ✕
                </Button>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            + Add line
          </Button>

          <div className="border-t pt-3 flex justify-end">
            <div className="w-48 space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>{taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button onClick={handleSave} disabled={saving || clients.length === 0}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  )
}
