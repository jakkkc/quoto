import {
  Document as PDFDocument,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'
import type { Document, DocumentItem, Client } from '@/types'

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#1a1a1a' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  businessName: { fontSize: 16, fontWeight: 700 },
  docTitle: { fontSize: 20, fontWeight: 700, textAlign: 'right' },
  docMeta: { fontSize: 9, color: '#555', textAlign: 'right', marginTop: 4 },
  section: { marginBottom: 20 },
  label: { fontSize: 8, color: '#888', textTransform: 'uppercase', marginBottom: 2 },
  clientName: { fontSize: 11, fontWeight: 700 },
  table: { marginTop: 8 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e5e5e5', paddingVertical: 6 },
  tableHeaderRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1a1a1a', paddingBottom: 6, fontWeight: 700 },
  colDescription: { flex: 4 },
  colQty: { flex: 1, textAlign: 'right' },
  colPrice: { flex: 1.5, textAlign: 'right' },
  colTotal: { flex: 1.5, textAlign: 'right' },
  totalsBlock: { marginTop: 16, alignItems: 'flex-end' },
  totalsRow: { flexDirection: 'row', width: 200, justifyContent: 'space-between', paddingVertical: 2 },
  totalsFinalRow: { flexDirection: 'row', width: 200, justifyContent: 'space-between', paddingTop: 6, marginTop: 4, borderTopWidth: 1, borderTopColor: '#1a1a1a', fontWeight: 700, fontSize: 11 },
  notes: { marginTop: 24, fontSize: 9, color: '#555' },
  statusBadge: { fontSize: 9, textTransform: 'uppercase', marginTop: 4 },
})

export function DocumentPDF({
  doc,
  items,
  client,
  businessName,
  paymentDetails,
}: {
  doc: Document
  items: DocumentItem[]
  client: Client | null
  businessName: string
  paymentDetails?: string | null
}) {
  const isReceipt = doc.type === 'invoice' && doc.status === 'paid'
  const title = isReceipt ? 'Receipt' : doc.type === 'quote' ? 'Quote' : 'Invoice'

  return (
    <PDFDocument>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.businessName}>{businessName}</Text>
          </View>
          <View>
            <Text style={styles.docTitle}>{title}</Text>
            <Text style={styles.docMeta}>{doc.doc_number}</Text>
            <Text style={styles.docMeta}>Issued {doc.issue_date}</Text>
            {doc.due_date && <Text style={styles.docMeta}>Due {doc.due_date}</Text>}
            <Text style={styles.statusBadge}>{doc.status}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Bill To</Text>
          <Text style={styles.clientName}>{client?.name ?? '—'}</Text>
          {client?.email && <Text>{client.email}</Text>}
          {client?.phone && <Text>{client.phone}</Text>}
          {client?.address && <Text>{client.address}</Text>}
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.colDescription}>Description</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colPrice}>Unit Price</Text>
            <Text style={styles.colTotal}>Total</Text>
          </View>
          {items.map((item) => (
            <View style={styles.tableRow} key={item.id}>
              <Text style={styles.colDescription}>{item.description}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colPrice}>{item.unit_price.toFixed(2)}</Text>
              <Text style={styles.colTotal}>{item.line_total.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text>Subtotal</Text>
            <Text>{doc.subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text>Tax</Text>
            <Text>{doc.tax_amount.toFixed(2)}</Text>
          </View>
          <View style={styles.totalsFinalRow}>
            <Text>Total</Text>
            <Text>{doc.total.toFixed(2)}</Text>
          </View>
        </View>

        {doc.notes && (
          <View style={styles.notes}>
            <Text style={styles.label}>Notes</Text>
            <Text>{doc.notes}</Text>
          </View>
        )}
        {doc.type === 'invoice' && paymentDetails && (
          <View style={styles.notes}>
            <Text style={styles.label}>Payment Details</Text>
            <Text>{paymentDetails}</Text>
          </View>
        )}
      </Page>
    </PDFDocument>
  )
}
