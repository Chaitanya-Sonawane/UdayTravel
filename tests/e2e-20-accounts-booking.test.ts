import { describe, it, expect, vi, beforeAll } from 'vitest'
import { UsersRepository } from '../lib/data/users.repo'
import { SeatsRepository } from '../lib/data/seats.repo'
import { OrdersRepository } from '../lib/data/orders.repo'
import { BookingsRepository } from '../lib/data/bookings.repo'
import { TicketsRepository } from '../lib/data/tickets.repo'
import { TripsRepository } from '../lib/data/trips.repo'
import { AvailabilityRepository } from '../lib/data/availability.repo'
import { confirmBooking } from '../lib/payments/confirm'
import { holdSeatInRtdb, getTripSeatsFromRtdb } from '../lib/firebase/rtdb'
import * as razorpayModule from '../lib/payments/razorpay'

interface TestAccount {
  uid: string
  name: string
  mobile: string
  age: number
  gender: 'Male' | 'Female'
  email: string
  seatId: string
  pickupPoint: string
  dropPoint: string
}

const TEST_20_ACCOUNTS: TestAccount[] = [
  {
    uid: 'usr_uday_001_ramesh',
    name: 'Ramesh Kulkarni',
    mobile: '9822011001',
    age: 34,
    gender: 'Male',
    email: 'ramesh.kulkarni@example.com',
    seatId: 'A1',
    pickupPoint: 'Office',
    dropPoint: 'Wakadewadi',
  },
  {
    uid: 'usr_uday_002_suresh',
    name: 'Suresh Patil',
    mobile: '9822011002',
    age: 29,
    gender: 'Male',
    email: 'suresh.patil@example.com',
    seatId: 'A2',
    pickupPoint: 'Office',
    dropPoint: 'Wakadewadi',
  },
  {
    uid: 'usr_uday_003_priya',
    name: 'Priya Deshmukh',
    mobile: '9822011003',
    age: 27,
    gender: 'Female',
    email: 'priya.deshmukh@example.com',
    seatId: 'B1',
    pickupPoint: 'Ekvira Chowk',
    dropPoint: 'Sangamwadi',
  },
  {
    uid: 'usr_uday_004_anjali',
    name: 'Anjali Joshi',
    mobile: '9822011004',
    age: 24,
    gender: 'Female',
    email: 'anjali.joshi@example.com',
    seatId: 'B2',
    pickupPoint: 'Ekvira Chowk',
    dropPoint: 'Sangamwadi',
  },
  {
    uid: 'usr_uday_005_amit',
    name: 'Amit Shinde',
    mobile: '9822011005',
    age: 31,
    gender: 'Male',
    email: 'amit.shinde@example.com',
    seatId: 'C1',
    pickupPoint: 'HDFC Bank',
    dropPoint: 'Yerwada',
  },
  {
    uid: 'usr_uday_006_sachin',
    name: 'Sachin Pawar',
    mobile: '9822011006',
    age: 38,
    gender: 'Male',
    email: 'sachin.pawar@example.com',
    seatId: 'C2',
    pickupPoint: 'HDFC Bank',
    dropPoint: 'Yerwada',
  },
  {
    uid: 'usr_uday_007_sneha',
    name: 'Sneha Jadhav',
    mobile: '9822011007',
    age: 26,
    gender: 'Female',
    email: 'sneha.jadhav@example.com',
    seatId: 'D1',
    pickupPoint: 'Bhistbag Chowk',
    dropPoint: 'Shastri Nagar',
  },
  {
    uid: 'usr_uday_008_pooja',
    name: 'Pooja Gaikwad',
    mobile: '9822011008',
    age: 25,
    gender: 'Female',
    email: 'pooja.gaikwad@example.com',
    seatId: 'D2',
    pickupPoint: 'Bhistbag Chowk',
    dropPoint: 'Shastri Nagar',
  },
  {
    uid: 'usr_uday_009_rahul',
    name: 'Rahul More',
    mobile: '9822011009',
    age: 33,
    gender: 'Male',
    email: 'rahul.more@example.com',
    seatId: 'E1',
    pickupPoint: 'Professor Chowk',
    dropPoint: 'Ramwadi Naka',
  },
  {
    uid: 'usr_uday_010_vikram',
    name: 'Vikram Kale',
    mobile: '9822011010',
    age: 42,
    gender: 'Male',
    email: 'vikram.kale@example.com',
    seatId: 'E2',
    pickupPoint: 'Professor Chowk',
    dropPoint: 'Ramwadi Naka',
  },
  {
    uid: 'usr_uday_011_neha',
    name: 'Neha Kadam',
    mobile: '9822011011',
    age: 28,
    gender: 'Female',
    email: 'neha.kadam@example.com',
    seatId: 'F1',
    pickupPoint: 'Premdan Chowk',
    dropPoint: 'Four Points',
  },
  {
    uid: 'usr_uday_012_kavita',
    name: 'Kavita Bhosale',
    mobile: '9822011012',
    age: 30,
    gender: 'Female',
    email: 'kavita.bhosale@example.com',
    seatId: 'F2',
    pickupPoint: 'Premdan Chowk',
    dropPoint: 'Four Points',
  },
  {
    uid: 'usr_uday_013_rohan',
    name: 'Rohan Jagtap',
    mobile: '9822011013',
    age: 23,
    gender: 'Male',
    email: 'rohan.jagtap@example.com',
    seatId: 'G1',
    pickupPoint: 'Delhigate',
    dropPoint: 'Viman Nagar',
  },
  {
    uid: 'usr_uday_014_nitin',
    name: 'Nitin Chavan',
    mobile: '9822011014',
    age: 35,
    gender: 'Male',
    email: 'nitin.chavan@example.com',
    seatId: 'G2',
    pickupPoint: 'Delhigate',
    dropPoint: 'Viman Nagar',
  },
  {
    uid: 'usr_uday_015_sunita',
    name: 'Sunita Mane',
    mobile: '9822011015',
    age: 39,
    gender: 'Female',
    email: 'sunita.mane@example.com',
    seatId: 'H1',
    pickupPoint: 'Nepti Naka Chowk',
    dropPoint: 'Chandan Nagar',
  },
  {
    uid: 'usr_uday_016_swati',
    name: 'Swati Salunkhe',
    mobile: '9822011016',
    age: 32,
    gender: 'Female',
    email: 'swati.salunkhe@example.com',
    seatId: 'H2',
    pickupPoint: 'Nepti Naka Chowk',
    dropPoint: 'Chandan Nagar',
  },
  {
    uid: 'usr_uday_017_ganesh',
    name: 'Ganesh Thorat',
    mobile: '9822011017',
    age: 27,
    gender: 'Male',
    email: 'ganesh.thorat@example.com',
    seatId: 'I1',
    pickupPoint: 'Swastik Chowk',
    dropPoint: 'Kharadi Bye Pass',
  },
  {
    uid: 'usr_uday_018_pradeep',
    name: 'Pradeep Tambe',
    mobile: '9822011018',
    age: 45,
    gender: 'Male',
    email: 'pradeep.tambe@example.com',
    seatId: 'I2',
    pickupPoint: 'Swastik Chowk',
    dropPoint: 'Kharadi Bye Pass',
  },
  {
    uid: 'usr_uday_019_meera',
    name: 'Meera Date',
    mobile: '9822011019',
    age: 29,
    gender: 'Female',
    email: 'meera.date@example.com',
    seatId: 'J1',
    pickupPoint: 'Rangoli Hotel',
    dropPoint: 'Wagholi',
  },
  {
    uid: 'usr_uday_020_aarti',
    name: 'Aarti Bhalerao',
    mobile: '9822011020',
    age: 22,
    gender: 'Female',
    email: 'aarti.bhalerao@example.com',
    seatId: 'J2',
    pickupPoint: 'Rangoli Hotel',
    dropPoint: 'Wagholi',
  },
]

describe('Actual Production E2E: 20 Accounts Booking 20 Seats on Route Ahilyanagar → Pune', () => {
  const routeId = 'AHM_PUN'
  const tripId = 'AHM_PUN_0600'
  const travelDate = '2026-11-25'
  const busNumber = 'MH 16 DP 4951'
  const fareRupees = 200
  const perSeatPaise = 20000

  const confirmedBookingsSummary: Array<{
    accountIndex: number
    uid: string
    name: string
    gender: string
    seatId: string
    ticketNo: string
    bookingId: string
    paymentId: string
  }> = []

  beforeAll(() => {
    // Intercept Razorpay payment verification to simulate real captured payment
    vi.spyOn(razorpayModule, 'fetchRazorpayPayment').mockImplementation(async (paymentId: string) => {
      return {
        id: paymentId,
        order_id: `order_rzp_${paymentId}`,
        amount: perSeatPaise,
        currency: 'INR',
        status: 'captured',
        method: 'upi',
        email: 'passenger@udaytravel.in',
        contact: '9822011000',
      }
    })
  })

  it(
    'successfully creates 20 real passenger profiles and confirms 20 seats on the bus',
    async () => {
    console.log(`\n========================================================================`)
    console.log(`[STARTING E2E TEST] Booking 20 Seats for 20 Accounts on Route ${routeId}`)
    console.log(`Trip: ${tripId} | Bus: ${busNumber} | Travel Date: ${travelDate}`)
    console.log(`========================================================================\n`)

    for (let i = 0; i < TEST_20_ACCOUNTS.length; i++) {
      const acc = TEST_20_ACCOUNTS[i]!
      const grp = `grp_e2e_20acc_${String(i + 1).padStart(2, '0')}_${Date.now()}`
      const paymentId = `pay_e2e_rzp_${String(i + 1).padStart(2, '0')}_${Date.now()}`

      // 1. Create real User in Firestore `users/{uid}`
      const createdUser = await UsersRepository.createUser(acc.uid, {
        name: acc.name,
        mobile: acc.mobile,
        age: acc.age,
        gender: acc.gender,
        email: acc.email,
      })

      expect(createdUser.uid).toBe(acc.uid)
      expect(createdUser.name).toBe(acc.name)
      expect(createdUser.savedPassengers?.length).toBeGreaterThanOrEqual(1)

      // 2. Hold Seat in Firestore + RTDB
      const genderRuleFormat = acc.gender === 'Female' ? 'F' : 'M'
      await SeatsRepository.placeHold(
        tripId,
        travelDate,
        [acc.seatId],
        acc.uid,
        grp,
        Date.now() + 600000,
        {
          passengers: [{ seatId: acc.seatId, gender: genderRuleFormat, age: acc.age }],
        }
      )

      await holdSeatInRtdb({
        tripId,
        seatId: acc.seatId,
        userId: acc.uid,
        gender: acc.gender,
        holdTtlMs: 600000,
      })

      // 3. Create Authoritative Order Document
      await OrdersRepository.createOrder({
        grp,
        uid: acc.uid,
        routeId,
        tripId,
        travelDate,
        busName: 'Uday Travels Premium Executive AC Sleeper/Seater',
        seatIds: [acc.seatId],
        passengers: [
          {
            seat: acc.seatId,
            name: acc.name,
            age: acc.age,
            gender: acc.gender.toLowerCase() as 'male' | 'female',
          },
        ],
        perSeatPaise,
        totalPaise: perSeatPaise,
        walletDebitPaise: 0,
        razorpayPaise: perSeatPaise,
        status: 'CREATED',
        razorpayOrderId: `order_rzp_${paymentId}`,
        razorpayPaymentId: paymentId,
        holdExpiresAt: Date.now() + 600000,
        holdExtended: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        schemaVersion: 1,
      })

      // 4. Confirm Booking (dual-writes tickets, bookings, trips, payments, RTDB)
      const confirmResult = await confirmBooking({
        grp,
        paymentId,
        source: 'VERIFY_API',
      })

      expect(confirmResult.isNewConfirmation).toBe(true)
      expect(confirmResult.ticketNo).toBeDefined()
      expect(confirmResult.order.status).toBe('CONFIRMED')

      // 5. Verify Firestore Bookings Document
      const bookingDoc = await BookingsRepository.getBooking(grp)
      expect(bookingDoc).not.toBeNull()
      expect(bookingDoc?.userId).toBe(acc.uid)
      expect(bookingDoc?.seats).toEqual([acc.seatId])
      expect(bookingDoc?.status).toBe('confirmed')
      expect(bookingDoc?.ticketNo).toBe(confirmResult.ticketNo)

      // 6. Verify Ticket Document
      const ticketDoc = await TicketsRepository.getTicket(confirmResult.ticketNo)
      expect(ticketDoc).not.toBeNull()
      expect(ticketDoc?.uid).toBe(acc.uid)
      expect(ticketDoc?.qrToken).toBeDefined()

      confirmedBookingsSummary.push({
        accountIndex: i + 1,
        uid: acc.uid,
        name: acc.name,
        gender: acc.gender,
        seatId: acc.seatId,
        ticketNo: confirmResult.ticketNo,
        bookingId: grp,
        paymentId,
      })

      console.log(
        `✓ [${String(i + 1).padStart(2, '0')}/20] Confirmed: Passenger: ${acc.name} (${acc.gender}) | Seat: ${acc.seatId} | Ticket: ${confirmResult.ticketNo} | UID: ${acc.uid}`
      )
    }

    // 7. Verify RTDB seat states
    const rtdbSeats = await getTripSeatsFromRtdb(tripId)
    for (const item of confirmedBookingsSummary) {
      expect(rtdbSeats[item.seatId]).toBeDefined()
      expect(rtdbSeats[item.seatId]?.status).toBe('booked')
      expect(rtdbSeats[item.seatId]?.ticketNo).toBe(item.ticketNo)
    }

    // 8. Verify 20 total seats booked
    expect(confirmedBookingsSummary.length).toBe(20)

    console.log(`\n========================================================================`)
    console.log(`[E2E SUMMARY: 20/20 ACCOUNTS SUCCESSFULLY BOOKED]`)
    console.log(`Route: Ahilyanagar → Pune | Trip: ${tripId} | Bus: ${busNumber}`)
    console.log(`------------------------------------------------------------------------`)
    console.table(
      confirmedBookingsSummary.map((b) => ({
        '#': b.accountIndex,
        Passenger: b.name,
        Gender: b.gender,
        Seat: b.seatId,
        'Ticket No': b.ticketNo,
        'Booking ID': b.bookingId,
        'Firebase UID': b.uid,
      }))
    )
    console.log(`========================================================================\n`)
  }, 120000)
})
