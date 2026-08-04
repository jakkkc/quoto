import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useBusiness } from '@/contexts/BusinessContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function BusinessSettingsPage() {
  const { businessId, refresh: refreshBusiness } = useBusiness()
  const [name, setName] = useState('')
  const [paymentDetails, setPaymentDetails] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function fetchBusiness() {
      setLoading(true)
      const { data, error } = await supabase
        .from('businesses')
        .select('name, payment_details')
        .eq('id', businessId)
        .single()

      if (error) {
        setError(error.message)
      } else {
        setName(data.name ?? '')
        setPaymentDetails(data.payment_details ?? '')
      }
      setLoading(false)
    }
    fetchBusiness()
  }, [])

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)

    const { error } = await supabase
      .from('businesses')
      .update({ name: name.trim(), payment_details: paymentDetails.trim() || null })
      .eq('id', businessId)

    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    await refreshBusiness()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) {
    return <p className="p-6 text-sm text-muted-foreground">Loading...</p>
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl sm:text-2xl">Business Settings</h1>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Business Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Business Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="payment">Payment Details</Label>
            <textarea
              id="payment"
              value={paymentDetails}
              onChange={(e) => setPaymentDetails(e.target.value)}
              placeholder={'e.g.\nM-Pesa Paybill: 123456, Account: Jac-s Hub\nBank: Equity Bank, Acc Name: Jac-s Hub, Acc No: 0123456789'}
              rows={5}
              className="w-full rounded-md border border-input bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground mt-1">
              This appears on invoices so clients know how to pay you. Free text — paste M-Pesa, bank, or any other details.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
            {saved && <span className="text-sm text-emerald-400">Saved.</span>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
