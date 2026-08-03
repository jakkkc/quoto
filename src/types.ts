export interface Client {
  id: string
  business_id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  created_at: string
  updated_at: string
}

export type ClientInput = Pick<Client, 'name' | 'email' | 'phone' | 'address'>
