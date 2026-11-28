import { NextResponse } from 'next/server'
import { Document, Page, Text, View, StyleSheet, Image, renderToBuffer } from '@react-pdf/renderer'
import QRCode from 'qrcode'
import { TicketsRepository } from '@/lib/data/tickets.repo'
import { getTicket } from '@/lib/mock-tickets'
import type { TicketDoc } from '@/lib/schemas/ticket.schema'
import type { Ticket as MockTicket } from '@/lib/mock-tickets'

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 32,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#B87000',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
  },
  brandTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    letterSpacing: 1.5,
  },
  brandSubtitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#6B7280',
    letterSpacing: 1.2,
    marginTop: 3,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusBadgeCancelled: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#059669',
    letterSpacing: 1.2,
  },
  statusTextCancelled: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#DC2626',
    letterSpacing: 1.2,
  },
  ticketNumberLabel: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    color: '#6B7280',
    letterSpacing: 1.2,
    marginTop: 5,
    textAlign: 'right',
  },
  ticketNumberValue: {
    fontSize: 15,
    fontFamily: 'Helvetica-Bold',
    color: '#B87000',
    letterSpacing: 1.5,
    marginTop: 1,
    textAlign: 'right',
  },
  heroCard: {
    backgroundColor: '#11151F',
    borderRadius: 10,
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 18,
    marginTop: 14,
  },
  heroTag: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#F8B018',
    letterSpacing: 1.5,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  routeCity: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#FFFFFF',
  },
  routeArrow: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#F8B018',
  },
  heroTripInfo: {
    fontSize: 8.5,
    color: '#9CA3AF',
    marginTop: 4,
  },
  heroDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#232B3E',
    marginVertical: 12,
  },
  heroBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroMetaGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroMetaLabel: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#6B7280',
    letterSpacing: 1,
  },
  heroMetaValue: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#FFFFFF',
  },
  heroMetaBookedValue: {
    fontSize: 8.5,
    color: '#D1D5DB',
  },
  card: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    paddingHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#FFFFFF',
  },
  cardTitle: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#4B5563',
    letterSpacing: 1.2,
  },
  planGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  planColLeft: {
    alignItems: 'flex-start',
  },
  planColRight: {
    alignItems: 'flex-end',
  },
  planPointLabel: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#B87000',
    letterSpacing: 1,
  },
  planPointName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    marginTop: 3,
  },
  planPointTime: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    marginTop: 3,
  },
  planPointSubtext: {
    fontSize: 7.5,
    color: '#6B7280',
    marginTop: 3,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tableHeaderColSeat: {
    width: '18%',
  },
  tableHeaderColPassenger: {
    width: '46%',
  },
  tableHeaderColAge: {
    width: '18%',
    textAlign: 'right',
  },
  tableHeaderColGender: {
    width: '18%',
    textAlign: 'right',
  },
  tableHeaderText: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#6B7280',
    letterSpacing: 0.8,
  },
  passengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  seatBadge: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seatBadgeText: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#92400E',
  },
  passengerName: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
  },
  passengerSubtitle: {
    fontSize: 7.5,
    color: '#6B7280',
    marginTop: 2,
  },
  passengerAge: {
    fontSize: 9.5,
    color: '#374151',
    textAlign: 'right',
  },
  passengerGender: {
    fontSize: 9.5,
    color: '#374151',
    textAlign: 'right',
    textTransform: 'capitalize',
  },
  fareItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  fareItemLabel: {
    fontSize: 8.5,
    color: '#4B5563',
  },
  fareItemValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
  },
  fareTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  fareTotalLabel: {
    fontSize: 10.5,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
  },
  fareTotalValue: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#B87000',
  },
  bottomSplit: {
    flexDirection: 'row',
    marginTop: 12,
    alignItems: 'stretch',
  },
  qrCard: {
    width: 105,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  qrImage: {
    width: 85,
    height: 85,
  },
  qrLabel: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    color: '#6B7280',
    letterSpacing: 1,
    marginTop: 6,
    textAlign: 'center',
  },
  policyCard: {
    flex: 1,
    marginLeft: 10,
    backgroundColor: '#FEF9C3',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    padding: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  policyTitle: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#92400E',
    letterSpacing: 1,
    marginBottom: 4,
  },
  policyBody: {
    fontSize: 7.5,
    lineHeight: 1.35,
    color: '#78350F',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 7.5,
    color: '#6B7280',
  },
  footerPhone: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#B87000',
  },
})

function formatTime(timeStr?: string): string {
  if (!timeStr) return ''
  const trimmed = timeStr.trim()
  if (/am|pm/i.test(trimmed)) return trimmed.toUpperCase()
  const [hStr, mStr] = trimmed.split(':')
  const h = parseInt(hStr || '0', 10)
  const m = parseInt(mStr || '0', 10)
  const period = h >= 12 ? 'PM' : 'AM'
  const displayH = h % 12 === 0 ? 12 : h % 12
  return `${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`
}

function formatTravelDate(dateStr?: string): string {
  if (!dateStr) return ''
  try {
    const d = new Date(`${dateStr.slice(0, 10)}T00:00:00`)
    return d.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function formatBookedAt(dateStr?: string): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    const day = d.getDate()
    const month = d.toLocaleDateString('en-GB', { month: 'short' })
    const year = d.getFullYear()
    let hours = d.getHours()
    const minutes = String(d.getMinutes()).padStart(2, '0')
    const ampm = hours >= 12 ? 'pm' : 'am'
    hours = hours % 12 || 12
    const hoursStr = String(hours).padStart(2, '0')
    return `${day} ${month} ${year}, ${hoursStr}:${minutes} ${ampm}`
  } catch {
    return dateStr
  }
}

interface NormalizedTicket {
  ticketNo: string
  status: string
  route: { from: string; to: string }
  travelDate: string
  busName: string
  busNumber: string
  seatLayout: string
  pickup: { name: string; time: string }
  drop: { name: string; time: string }
  passengers: Array<{
    seat: string
    title?: string
    name: string
    age: number
    gender: string
  }>
  fare: {
    perSeat: number
    seats: number
    total: number
  }
  bookedAt: string
  qrToken: string
}

function normalizeTicketData(ticketDoc: TicketDoc | MockTicket | any): NormalizedTicket {
  const perSeatRupees =
    ticketDoc.fare?.perSeatPaise !== undefined
      ? ticketDoc.fare.perSeatPaise / 100
      : ticketDoc.fare?.perSeat || 200

  const totalRupees =
    ticketDoc.fare?.totalPaise !== undefined
      ? ticketDoc.fare.totalPaise / 100
      : ticketDoc.fare?.total || perSeatRupees * (ticketDoc.passengers?.length || 1)

  const s = String(ticketDoc.status || '').trim().toUpperCase()
  const isCancelled = s === 'CANCELLED' || s === 'CANCELED' || Boolean(ticketDoc.cancelledAt)

  return {
    ticketNo: ticketDoc.ticketNo,
    status: isCancelled ? 'CANCELLED' : ticketDoc.status || 'CONFIRMED',
    route: {
      from: ticketDoc.route?.from || 'Ahilyanagar',
      to: ticketDoc.route?.to || 'Pune',
    },
    travelDate: ticketDoc.travelDate || '2026-03-22',
    busName: ticketDoc.busName && !ticketDoc.busName.includes('Uday Express') ? ticketDoc.busName : 'Uday Bus',
    busNumber: ticketDoc.busNumber || 'MH 16 DP 4951',
    seatLayout: ticketDoc.seatLayout || '3+2 Seater',
    pickup: {
      name: ticketDoc.pickup?.name || 'Nepti Naka Chowk',
      time: ticketDoc.pickup?.time || '06:50',
    },
    drop: {
      name: ticketDoc.drop?.name || 'Wakadewadi',
      time: ticketDoc.drop?.time || '09:15',
    },
    passengers:
      ticketDoc.passengers && ticketDoc.passengers.length > 0
        ? ticketDoc.passengers.map((p: any) => ({
            seat: p.seat,
            title: p.title || '',
            name: p.name,
            age: p.age || 21,
            gender: p.gender || 'male',
          }))
        : [
            {
              seat: 'A3',
              title: 'Mr.',
              name: 'Chaitanya Ram Sonawane',
              age: 21,
              gender: 'male',
            },
          ],
    fare: {
      perSeat: perSeatRupees,
      seats: ticketDoc.fare?.seats || ticketDoc.passengers?.length || 1,
      total: totalRupees,
    },
    bookedAt: ticketDoc.bookedAt || ticketDoc.payment?.paidAt || '2026-03-21T15:42:00',
    qrToken: ticketDoc.qrToken || ticketDoc.ticketNo,
  }
}

export async function GET(
  _: Request,
  context: { params: Promise<{ ticketNo: string }> }
) {
  const { ticketNo } = await context.params
  if (!ticketNo) {
    return NextResponse.json({ error: 'Ticket number is required' }, { status: 400 })
  }

  let rawTicket: any = null
  try {
    rawTicket = await TicketsRepository.getTicket(ticketNo)
  } catch (err) {
    console.warn(`[Ticket PDF] TicketsRepository lookup failed for ${ticketNo}:`, err)
  }

  if (!rawTicket) {
    rawTicket = getTicket(ticketNo)
  }

  if (!rawTicket) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
  }

  const ticket = normalizeTicketData(rawTicket)

  // Generate QR code data URL
  const qrDataUrl = await QRCode.toDataURL(ticket.qrToken, {
    margin: 1,
    width: 250,
    color: {
      dark: '#111827',
      light: '#FFFFFF',
    },
  })

  const pdf = await renderToBuffer(
    <Document title={`Uday Travels - ${ticket.ticketNo}`}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.logoBox}>
              <Text style={styles.logoText}>UT</Text>
            </View>
            <View>
              <Text style={styles.brandTitle}>UDAY TRAVELS</Text>
              <Text style={styles.brandSubtitle}>YOUR JOURNEY, MADE BETTER</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <View style={ticket.status === 'CANCELLED' ? styles.statusBadgeCancelled : styles.statusBadge}>
              <Text style={ticket.status === 'CANCELLED' ? styles.statusTextCancelled : styles.statusText}>
                {ticket.status}
              </Text>
            </View>
            <Text style={styles.ticketNumberLabel}>TICKET NUMBER</Text>
            <Text style={styles.ticketNumberValue}>{ticket.ticketNo}</Text>
          </View>
        </View>

        {/* Dark Hero Card */}
        <View style={styles.heroCard}>
          <Text style={styles.heroTag}>E-TICKET  /  {ticket.seatLayout.toUpperCase()}</Text>
          <View style={styles.routeRow}>
            <Text style={styles.routeCity}>{ticket.route.from} </Text>
            <Text style={styles.routeArrow}>&gt; </Text>
            <Text style={styles.routeCity}>{ticket.route.to}</Text>
          </View>
          <Text style={styles.heroTripInfo}>
            {formatTravelDate(ticket.travelDate)}  ·  {ticket.busName}
          </Text>
          <View style={styles.heroDivider} />
          <View style={styles.heroBottomRow}>
            <View style={styles.heroMetaGroup}>
              <Text style={styles.heroMetaLabel}>BUS NUMBER  </Text>
              <Text style={styles.heroMetaValue}>{ticket.busNumber}</Text>
            </View>
            <View style={styles.heroMetaGroup}>
              <Text style={styles.heroMetaLabel}>BOOKED  </Text>
              <Text style={styles.heroMetaBookedValue}>{formatBookedAt(ticket.bookedAt)}</Text>
            </View>
          </View>
        </View>

        {/* Boarding Plan Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>YOUR BOARDING PLAN</Text>
          <View style={styles.planGrid}>
            <View style={styles.planColLeft}>
              <Text style={styles.planPointLabel}>PICKUP POINT</Text>
              <Text style={styles.planPointName}>{ticket.pickup.name}</Text>
              <Text style={styles.planPointTime}>{formatTime(ticket.pickup.time)}</Text>
              <Text style={styles.planPointSubtext}>Please arrive 15 minutes early</Text>
            </View>
            <View style={styles.planColRight}>
              <Text style={styles.planPointLabel}>DROP POINT</Text>
              <Text style={styles.planPointName}>{ticket.drop.name}</Text>
              <Text style={styles.planPointTime}>{formatTime(ticket.drop.time)}</Text>
              <Text style={styles.planPointSubtext}>Estimated arrival time</Text>
            </View>
          </View>
        </View>

        {/* Passengers Card (with Big Font Highlighted Seat Number) */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>PASSENGERS  ·  {ticket.passengers.length}</Text>
          <View style={styles.tableHeader}>
            <View style={styles.tableHeaderColSeat}>
              <Text style={styles.tableHeaderText}>SEAT</Text>
            </View>
            <View style={styles.tableHeaderColPassenger}>
              <Text style={styles.tableHeaderText}>PASSENGER</Text>
            </View>
            <View style={styles.tableHeaderColAge}>
              <Text style={styles.tableHeaderText}>AGE</Text>
            </View>
            <View style={styles.tableHeaderColGender}>
              <Text style={styles.tableHeaderText}>GENDER</Text>
            </View>
          </View>
          {ticket.passengers.map((p, idx) => (
            <View style={styles.passengerRow} key={p.seat || idx}>
              <View style={styles.tableHeaderColSeat}>
                <View style={styles.seatBadge}>
                  <Text style={styles.seatBadgeText}>{p.seat}</Text>
                </View>
              </View>
              <View style={[styles.tableHeaderColPassenger, { paddingLeft: 6 }]}>
                <Text style={styles.passengerName}>
                  {p.title ? `${p.title} ` : ''}
                  {p.name}
                </Text>
                <Text style={styles.passengerSubtitle}>
                  {idx === 0 ? 'Ticket holder' : 'Co-passenger'}
                </Text>
              </View>
              <View style={styles.tableHeaderColAge}>
                <Text style={styles.passengerAge}>{p.age} yrs</Text>
              </View>
              <View style={styles.tableHeaderColGender}>
                <Text style={styles.passengerGender}>{p.gender}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Fare Summary Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>FARE SUMMARY</Text>
          <View style={styles.fareItemRow}>
            <Text style={styles.fareItemLabel}>
              Seat fare  ·  {ticket.fare.seats} × Rs {ticket.fare.perSeat}
            </Text>
            <Text style={styles.fareItemValue}>
              Rs {ticket.fare.perSeat * ticket.fare.seats}
            </Text>
          </View>
          <View style={styles.fareTotalRow}>
            <Text style={styles.fareTotalLabel}>Total fare</Text>
            <Text style={styles.fareTotalValue}>Rs  {ticket.fare.total}</Text>
          </View>
        </View>

        {/* Bottom Split: QR Code & Cancellation Policy */}
        <View style={styles.bottomSplit}>
          <View style={styles.qrCard}>
            <Image src={qrDataUrl} style={styles.qrImage} />
            <Text style={styles.qrLabel}>SCAN AT BOARDING</Text>
          </View>
          <View style={styles.policyCard}>
            <Text style={styles.policyTitle}>CANCELLATION POLICY</Text>
            <Text style={styles.policyBody}>
              Ahilyanagar to Pune trips cannot be cancelled after 8:00 PM on the day before travel. Pune to Ahilyanagar trips cannot be cancelled on the travel day. Contact support if you need help with your booking.
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <Text style={styles.footerText}>Need help? </Text>
            <Text style={styles.footerPhone}>+91 98900 66580</Text>
            <Text style={styles.footerText}>  ·  care@udaytravel.in</Text>
          </View>
          <Text style={styles.footerText}>Uday Travels  ·  Travel with confidence</Text>
        </View>
      </Page>
    </Document>
  )

  return new NextResponse(pdf as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=UdayTravels-${ticket.ticketNo}.pdf`,
      'Cache-Control': 'private, no-store',
    },
  })
}
