import type { DocumentStatus } from '@/types'

export const STATUS_STYLES: Record<DocumentStatus, string> = {
  draft: 'bg-white/10 text-foreground/70 border-white/20',
  sent: 'bg-brand-blue/15 text-blue-300 border-blue-400/30',
  accepted: 'bg-brand-pink/15 text-pink-300 border-pink-400/30',
  rejected: 'bg-rose-500/15 text-rose-300 border-rose-400/30',
  partially_paid: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
  paid: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
}

export function statusClassName(status: string): string {
  return STATUS_STYLES[status as DocumentStatus] ?? STATUS_STYLES.draft
}
