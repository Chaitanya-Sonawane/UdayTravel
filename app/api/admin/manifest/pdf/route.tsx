import { NextResponse } from 'next/server'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer'
import { TicketsRepository } from '@/lib/data/tickets.repo'
import { SeatsRepository } from '@/lib/data/seats.repo'
import { getAdminDb } from '@/lib/firebase/admin'
import { firestoreMeter } from '@/lib/firebase/meter'
import { ROUTES, RouteId } from '@/lib/config/routes'

const styles = StyleSheet.create({
  page: {
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 28,
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  // Top Header Banner
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 2,
    borderBottomColor: '#F8B018',
    paddingBottom: 10,
    marginBottom: 10,
  },
  brandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#F8B018',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  logoText: {
    color: '#111827',
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
  },
  brandName: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    letterSpacing: 1.2,
  },
  brandSubtitle: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#92400E',
    letterSpacing: 1,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  tripInfoRight: {
    alignItems: 'flex-end',
  },
  tripDateText: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
  },
  routeText: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#374151',
    marginTop: 2,
  },
  busBadgeText: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#1E40AF',
    backgroundColor: '#DBEAFE',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    marginTop: 3,
  },

  // Key Stats Bar
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 12,
    justifyContent: 'space-between',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginRight: 4,
  },
  statValue: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
  },

  // Table Styles
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#111827',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  thText: {
    color: '#FFFFFF',
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 5,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  tableRowAlt: {
    backgroundColor: '#F9FAFB',
  },
  tdText: {
    fontSize: 7.5,
    color: '#1F2937',
  },
  tdTextBold: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
  },

  // Column Widths (A4 Landscape total ~780pt)
  colSeat: { width: '6%', textAlign: 'center' },
  colName: { width: '22%' },
  colMobile: { width: '15%' },
  colPickup: { width: '21%' },
  colDrop: { width: '16%' },
  colPnr: { width: '10%' },
  colPayment: { width: '6%', textAlign: 'right' },
  colSign: { width: '4%', textAlign: 'center' },

  seatBadge: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seatBadgeText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#78350F',
  },

  boardedBadge: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 3,
    paddingVertical: 1,
    paddingHorizontal: 3,
  },
  boardedText: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: '#065F46',
  },

  checkboxSquare: {
    width: 11,
    height: 11,
    borderWidth: 1,
    borderColor: '#9CA3AF',
    borderRadius: 2,
    marginHorizontal: 'auto',
  },

  emptyNotice: {
    paddingVertical: 24,
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },

  // Sign-Off & Verification Footer
  footerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
    borderRadius: 6,
    padding: 10,
    marginTop: 'auto',
  },
  signBlock: {
    width: '28%',
  },
  signTitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#4B5563',
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  signLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#9CA3AF',
    marginBottom: 4,
  },
  signLabel: {
    fontSize: 6.5,
    color: '#6B7280',
  },
  odometerBlock: {
    width: '38%',
    borderLeftWidth: 1,
    borderLeftColor: '#E5E7EB',
    paddingLeft: 12,
  },
  helplineText: {
    fontSize: 7,
    color: '#4B5563',
    marginTop: 4,
  },
})

interface PassengerEntry {
  seatNo: string
  ticketNo: string
  name: string
  age: number
  gender: string
  mobile: string
  pickupStop: string
  pickupTime: string
  dropStop: string
  paymentMethod: string
  farePaise: number
  boarded: boolean
  boardedAt?: string
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const tripId = searchParams.get('tripId')
  const date = searchParams.get('date') || new Date().toISOString().slice(0, 10)

  if (!tripId) {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'tripId is required' } },
      { status: 400 }
    )
  }

  try {
    const db = getAdminDb()
    const tickets = await TicketsRepository.listTicketsForTrip(tripId, date)
    const confirmedTickets = tickets.filter((t) => t.status === 'CONFIRMED')

    // Read boarding status
    const manifestDocId = `manifest_${tripId}_${date}`
    firestoreMeter.recordRead('trip_manifest', manifestDocId)
    const manifestSnap = await db.collection('trip_manifest').doc(manifestDocId).get()
    const boardingData = manifestSnap.exists ? manifestSnap.data()?.boardedSeats || {} : {}

    // Read live seats
    const busSeats = await SeatsRepository.getBusSeats(tripId, date)

    // Build passenger list
    const passengers: PassengerEntry[] = []
    let boardedCount = 0

    for (const ticket of confirmedTickets) {
      for (const p of ticket.passengers) {
        const isBoarded = !!boardingData[p.seat]?.boarded
        const boardedAt = boardingData[p.seat]?.boardedAt
        if (isBoarded) boardedCount++

        passengers.push({
          seatNo: p.seat,
          ticketNo: ticket.ticketNo,
          name: p.name,
          age: p.age,
          gender: p.gender === 'female' ? 'F' : 'M',
          mobile: ticket.contactMobile,
          pickupStop: ticket.pickup?.name || 'Maliwada Stand',
          pickupTime: ticket.pickup?.pickupTime || ticket.pickup?.time || '06:00 AM',
          dropStop: ticket.drop?.name || 'Wakadewadi, Pune',
          paymentMethod: ticket.payment?.method || 'Cash / Counter',
          farePaise: ticket.fare?.perSeatPaise || 22000,
          boarded: isBoarded,
          boardedAt,
        })
      }
    }

    // Sort by seat order
    passengers.sort((a, b) => a.seatNo.localeCompare(b.seatNo, undefined, { numeric: true }))

    const busNumber = confirmedTickets[0]?.busNumber || 'MH 16 DP 4951'
    const busName = confirmedTickets[0]?.busName || 'Uday Express 55-Seater Coach'
    const totalCapacity = busNumber.includes('1003') ? 44 : busNumber.includes('3951') ? 33 : 55
    const routeName = confirmedTickets[0]?.route
      ? `${confirmedTickets[0].route.from} -> ${confirmedTickets[0].route.to}`
      : 'Ahilyanagar -> Pune'

    const departureTime = confirmedTickets[0]?.pickup?.pickupTime || '06:00 AM'
    const totalBooked = passengers.length
    const emptySeats = Math.max(0, totalCapacity - totalBooked)
    const boardingPercent = totalBooked > 0 ? Math.round((boardedCount / totalBooked) * 100) : 0

    const pdfBuffer = await renderToBuffer(
      <Document
        title={`Uday Travels Manifest - ${tripId} (${date})`}
        author="Uday Travels"
        subject="Bus Passenger Boarding Manifest"
      >
        <Page size="A4" orientation="landscape" style={styles.page}>
          {/* Header */}
          <View style={styles.headerContainer}>
            <View style={styles.brandLeft}>
              <View style={styles.logoBox}>
                <Text style={styles.logoText}>UT</Text>
              </View>
              <View>
                <Text style={styles.brandName}>UDAY TRAVELS</Text>
                <Text style={styles.brandSubtitle}>
                  Official Passenger Manifest &amp; Boarding Dispatch
                </Text>
              </View>
            </View>

            <View style={styles.tripInfoRight}>
              <Text style={styles.tripDateText}>
                Journey Date: {date} · {departureTime}
              </Text>
              <Text style={styles.routeText}>Route: {routeName}</Text>
              <Text style={styles.busBadgeText}>
                Bus: {busNumber} ({busName})
              </Text>
            </View>
          </View>

          {/* Key Stats Bar */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Trip ID:</Text>
              <Text style={styles.statValue}>{tripId}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Bus Capacity:</Text>
              <Text style={styles.statValue}>{totalCapacity} Seats</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Total Booked:</Text>
              <Text style={styles.statValue}>{totalBooked} Passengers</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Boarded:</Text>
              <Text style={styles.statValue}>
                {boardedCount} ({boardingPercent}%)
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Available Vacant:</Text>
              <Text style={styles.statValue}>{emptySeats} Seats</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Generated:</Text>
              <Text style={styles.statValue}>
                {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} IST
              </Text>
            </View>
          </View>

          {/* Passenger Table */}
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.thText, styles.colSeat]}>Seat</Text>
              <Text style={[styles.thText, styles.colName]}>Passenger Name &amp; Details</Text>
              <Text style={[styles.thText, styles.colMobile]}>Phone Number</Text>
              <Text style={[styles.thText, styles.colPickup]}>Pickup Point &amp; Time</Text>
              <Text style={[styles.thText, styles.colDrop]}>Drop Point</Text>
              <Text style={[styles.thText, styles.colPnr]}>Ticket PNR</Text>
              <Text style={[styles.thText, styles.colPayment]}>Fare</Text>
              <Text style={[styles.thText, styles.colSign]}>Check</Text>
            </View>

            {passengers.length === 0 ? (
              <View>
                <Text style={styles.emptyNotice}>
                  No confirmed passenger bookings on this departure yet. All {totalCapacity} seats are currently vacant.
                </Text>
              </View>
            ) : (
              passengers.map((p, idx) => {
                const isAlt = idx % 2 === 1
                return (
                  <View
                    key={p.seatNo}
                    style={[styles.tableRow, isAlt ? styles.tableRowAlt : {}]}
                  >
                    {/* Seat */}
                    <View style={styles.colSeat}>
                      <View style={styles.seatBadge}>
                        <Text style={styles.seatBadgeText}>{p.seatNo}</Text>
                      </View>
                    </View>

                    {/* Passenger Name */}
                    <View style={styles.colName}>
                      <Text style={styles.tdTextBold}>{p.name}</Text>
                      <Text style={styles.tdText}>
                        Age: {p.age} yrs · Gender: {p.gender === 'F' ? 'Female' : 'Male'}
                      </Text>
                    </View>

                    {/* Phone Number */}
                    <View style={styles.colMobile}>
                      <Text style={styles.tdTextBold}>+91 {p.mobile}</Text>
                    </View>

                    {/* Pickup Point & Time */}
                    <View style={styles.colPickup}>
                      <Text style={styles.tdTextBold}>{p.pickupStop}</Text>
                      <Text style={styles.tdText}>Time: {p.pickupTime}</Text>
                    </View>

                    {/* Drop Stop */}
                    <View style={styles.colDrop}>
                      <Text style={styles.tdTextBold}>{p.dropStop}</Text>
                    </View>

                    {/* PNR */}
                    <View style={styles.colPnr}>
                      <Text style={styles.tdTextBold}>{p.ticketNo}</Text>
                      <Text style={{ fontSize: 6, color: '#6B7280' }}>
                        {p.paymentMethod}
                      </Text>
                    </View>

                    {/* Fare */}
                    <View style={styles.colPayment}>
                      <Text style={styles.tdTextBold}>
                        Rs {Math.round(p.farePaise / 100)}
                      </Text>
                    </View>

                    {/* Checkbox / Boarded */}
                    <View style={styles.colSign}>
                      {p.boarded ? (
                        <View style={styles.boardedBadge}>
                          <Text style={styles.boardedText}>OK</Text>
                        </View>
                      ) : (
                        <View style={styles.checkboxSquare} />
                      )}
                    </View>
                  </View>
                )
              })
            )}
          </View>

          {/* Dispatch Verification & Sign-Off Footer */}
          <View style={styles.footerSection}>
            <View style={styles.signBlock}>
              <Text style={styles.signTitle}>Bus Conductor Sign-off</Text>
              <View style={styles.signLine} />
              <Text style={styles.signLabel}>Name: ______________________  Sign &amp; Date</Text>
            </View>

            <View style={styles.signBlock}>
              <Text style={styles.signTitle}>Bus Driver Sign-off</Text>
              <View style={styles.signLine} />
              <Text style={styles.signLabel}>Name: ______________________  Sign &amp; Date</Text>
            </View>

            <View style={styles.odometerBlock}>
              <Text style={styles.signTitle}>Odometer Reading &amp; Emergency Dispatch</Text>
              <Text style={styles.helplineText}>
                Start KM: ______________  ·  End KM: ______________
              </Text>
              <Text style={styles.helplineText}>
                Office Control Room: +91 98900 66580  ·  Helpline: +91 98220 12345
              </Text>
            </View>
          </View>
        </Page>
      </Document>
    )

    return new NextResponse(pdfBuffer as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="UdayTravels-Manifest-${tripId}-${date}.pdf"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (err: any) {
    console.error('[Manifest PDF API] Error:', err)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to generate manifest PDF' } },
      { status: 500 }
    )
  }
}
