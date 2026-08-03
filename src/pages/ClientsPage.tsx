import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CURRENT_BUSINESS_ID } from '@/lib/constants'
import type { Client, ClientInput } from '@/types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const emptyForm: ClientInput = { name: '', email: '', phone: '', address: '' }

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ClientInput>(emptyForm)
  const [saving, setSaving] = useState(false)

  async function fetchClients() {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('business_id', CURRENT_BUSINESS_ID)
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setClients(data as Client[])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchClients()
  }, [])

  function openAddDialog() {
    setEditingId(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEditDialog(client: Client) {
    setEditingId(client.id)
    setForm({
      name: client.name,
      email: client.email ?? '',
      phone: client.phone ?? '',
      address: client.address ?? '',
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError('Name is required')
      return
    }
    setSaving(true)
    setError(null)

    const payload = {
      business_id: CURRENT_BUSINESS_ID,
      name: form.name.trim(),
      email: form.email?.trim() || null,
      phone: form.phone?.trim() || null,
      address: form.address?.trim() || null,
    }

    const { error } = editingId
      ? await supabase.from('clients').update(payload).eq('id', editingId)
      : await supabase.from('clients').insert(payload)

    setSaving(false)

    if (error) {
      setError(error.message)
      return
    }

    setDialogOpen(false)
    setForm(emptyForm)
    setEditingId(null)
    fetchClients()
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm('Delete this client? This cannot be undone.')
    if (!confirmed) return

    const { error } = await supabase.from('clients').delete().eq('id', id)
    if (error) {
      setError(error.message)
      return
    }
    fetchClients()
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl sm:text-2xl">Clients</h1>
        <Button onClick={openAddDialog}>Add Client</Button>
      </div>

      {error && <p className="text-sm text-rose-400 mb-4">{error}</p>}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading clients...</p>
      ) : clients.length === 0 ? (
        <div className="border border-white/10 rounded-2xl p-8 text-center text-muted-foreground bg-white/[0.03]">
          <p>No clients yet — add your first client to get started.</p>
        </div>
      ) : (
        <>
          {/* Desktop: table */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>{client.email || '—'}</TableCell>
                    <TableCell>{client.phone || '—'}</TableCell>
                    <TableCell>{client.address || '—'}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(client)}>
                        Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(client.id)}>
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: cards */}
          <div className="sm:hidden space-y-3">
            {clients.map((client) => (
              <div
                key={client.id}
                className="rounded-2xl border border-white/10 bg-white/[0.05] backdrop-blur-xl p-4"
              >
                <p className="font-medium mb-1">{client.name}</p>
                <div className="text-sm text-muted-foreground space-y-0.5">
                  {client.email && <p>{client.email}</p>}
                  {client.phone && <p>{client.phone}</p>}
                  {client.address && <p>{client.address}</p>}
                </div>
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditDialog(client)}>
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" className="flex-1" onClick={() => handleDelete(client.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Client' : 'Add Client'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email ?? ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone ?? ''}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={form.address ?? ''}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
