import { supabase } from './supabase'
import type { DocumentType } from '@/types'

const PREFIX: Record<DocumentType, string> = {
  quote: 'Q',
  invoice: 'INV',
}

// v1 simplification: derives the next number by scanning existing
// doc_numbers for this business+type and taking the max + 1, rather than
// a DB sequence. Fine for low-concurrency single-user usage; the
// unique(business_id, doc_number) constraint guards against silent
// duplicates if two saves ever race.
export async function generateDocNumber(
  businessId: string,
  type: DocumentType
): Promise<string> {
  const prefix = PREFIX[type]

  const { data, error } = await supabase
    .from('documents')
    .select('doc_number')
    .eq('business_id', businessId)
    .eq('type', type)
    .like('doc_number', `${prefix}-%`)

  if (error) throw error

  let max = 0
  for (const row of data ?? []) {
    const match = row.doc_number.match(/-(\d+)$/)
    if (match) {
      const n = parseInt(match[1], 10)
      if (n > max) max = n
    }
  }

  const next = max + 1
  return `${prefix}-${String(next).padStart(4, '0')}`
}
