import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

interface BusinessContextValue {
  businessId: string | null
  businessName: string | null
  loading: boolean
  refresh: () => Promise<void>
}

const BusinessContext = createContext<BusinessContextValue>({
  businessId: null,
  businessName: null,
  loading: true,
  refresh: async () => {},
})

export function BusinessProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [businessName, setBusinessName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchBusiness() {
    if (!user) {
      setBusinessId(null)
      setBusinessName(null)
      setLoading(false)
      return
    }
    setLoading(true)

    const { data, error } = await supabase
      .from('businesses')
      .select('id, name')
      .eq('user_id', user.id)
      .single()

    if (error || !data) {
      // Fallback safety net: normally the signup flow creates this row
      // directly, but guard against edge cases (e.g. an auth user that
      // predates this flow) by creating one on the fly.
      const { data: created, error: createError } = await supabase
        .from('businesses')
        .insert({ user_id: user.id, name: 'My Business' })
        .select('id, name')
        .single()

      if (!createError && created) {
        setBusinessId(created.id)
        setBusinessName(created.name)
      }
    } else {
      setBusinessId(data.id)
      setBusinessName(data.name)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchBusiness()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  return (
    <BusinessContext.Provider value={{ businessId, businessName, loading, refresh: fetchBusiness }}>
      {children}
    </BusinessContext.Provider>
  )
}

export function useBusiness() {
  return useContext(BusinessContext)
}
