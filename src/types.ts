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

export type DocumentType = 'quote' | 'invoice'
export type DocumentStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'paid'

export interface Document {
  id: string
  business_id: string
  client_id: string
  type: DocumentType
  status: DocumentStatus
  converted_from_id: string | null
  doc_number: string
  issue_date: string
  due_date: string | null
  subtotal: number
  tax_amount: number
  total: number
  notes: string | null
  client_notes: string | null
  share_token: string
  created_at: string
  updated_at: string
}

export interface DocumentItem {
  id: string
  document_id: string
  description: string
  quantity: number
  unit_price: number
  line_total: number
  sort_order: number
}

// Joined shape used in list views
export interface DocumentWithClient extends Document {
  clients: { name: string } | null
}
