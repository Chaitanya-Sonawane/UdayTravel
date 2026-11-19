import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { getDatabase } from 'firebase-admin/database'
import fs from 'node:fs'
import path from 'node:path'

// Load service account key
const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json')
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'))

const app = getApps().length
  ? getApp()
  : initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id,
      databaseURL: 'https://udaytravels-ad458-default-rtdb.firebaseio.com',
    })

const auth = getAuth(app)
const db = getFirestore(app)
const rtdb = getDatabase(app)

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
    email: 'ramesh.kulkarni@udaytravel.in',
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
    email: 'suresh.patil@udaytravel.in',
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
    email: 'priya.deshmukh@udaytravel.in',
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
    email: 'anjali.joshi@udaytravel.in',
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
    email: 'amit.shinde@udaytravel.in',
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
    email: 'sachin.pawar@udaytravel.in',
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
    email: 'sneha.jadhav@udaytravel.in',
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
    email: 'pooja.gaikwad@udaytravel.in',
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
    email: 'rahul.more@udaytravel.in',
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
    email: 'vikram.kale@udaytravel.in',
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
    email: 'neha.kadam@udaytravel.in',
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
    email: 'kavita.bhosale@udaytravel.in',
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
    email: 'rohan.jagtap@udaytravel.in',
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
    email: 'nitin.chavan@udaytravel.in',
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
    email: 'sunita.mane@udaytravel.in',
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
    email: 'swati.salunkhe@udaytravel.in',
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
    email: 'ganesh.thorat@udaytravel.in',
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
    email: 'pradeep.tambe@udaytravel.in',
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
    email: 'meera.date@udaytravel.in',
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
    email: 'aarti.bhalerao@udaytravel.in',
    seatId: 'J2',
    pickupPoint: 'Rangoli Hotel',
    dropPoint: 'Wagholi',
  },
]

async function seedCloudFirebase() {
  console.log(`\n========================================================================`)
  console.log(`[SEEDING LIVE GOOGLE CLOUD FIREBASE] Project: ${serviceAccount.project_id}`)
  console.log(`Service Account: ${serviceAccount.client_email}`)
  console.log(`========================================================================\n`)

  const now = new Date().toISOString()
  const routeId = 'AHM_PUN'
  const tripId = 'AHM_PUN_0600'
  const travelDate = '2026-11-25'
  const busNumber = 'MH 16 DP 4951'

  // 1. Seed Business Settings in live Firestore
  console.log('1. Writing settings/business...')
  await db.collection('settings').doc('business').set(
    {
      companyName: 'Uday Travels',
      contactPhone: '+91 98900 66580',
      supportEmail: 'care@udaytravel.in',
      address: 'Shop No 1, Near Old Bus Stand, Ahilyanagar, Maharashtra 414001',
      farePerSeat: 200,
      emergencyHelpline: '1800-209-8329',
      updatedAt: now,
    },
    { merge: true }
  )

  // 2. Seed Route in live Firestore
  console.log('2. Writing routes/AHM_PUN and routes/PUN_AHM...')
  await db.collection('routes').doc('AHM_PUN').set(
    {
      id: 'AHM_PUN',
      source: 'Ahilyanagar',
      destination: 'Pune',
      routeName: 'Ahilyanagar → Pune',
      fare: 200,
      active: true,
      departures: ['05:30', '06:00', '09:30', '14:00'],
      durationMin: 165,
      cancellationPolicy:
        'Ahilyanagar to Pune bookings will not be cancelled after 08:00 PM for the next day journey.',
      updatedAt: now,
    },
    { merge: true }
  )

  await db.collection('routes').doc('PUN_AHM').set(
    {
      id: 'PUN_AHM',
      source: 'Pune',
      destination: 'Ahilyanagar',
      routeName: 'Pune → Ahilyanagar',
      fare: 200,
      active: true,
      departures: ['06:30', '10:00', '13:30', '17:00'],
      durationMin: 165,
      cancellationPolicy:
        'Pune to Ahilyanagar bookings cannot be cancelled on the same day of booking and journey.',
      updatedAt: now,
    },
    { merge: true }
  )

  // 3. Seed Bus in live Firestore
  console.log('3. Writing buses/bus_mh16dp4951...')
  await db.collection('buses').doc('bus_mh16dp4951').set(
    {
      id: 'bus_mh16dp4951',
      busNumber: 'MH 16 DP 4951',
      busName: 'Uday Travels Premium Executive AC Sleeper/Seater',
      seatLayout: '3+2 Seater',
      totalSeats: 50,
      active: true,
      updatedAt: now,
    },
    { merge: true }
  )

  // 4. Seed Trip in live Firestore
  console.log('4. Writing trips/trip_AHM_PUN_0600_20261125...')
  const bookedSeatList = TEST_20_ACCOUNTS.map((a) => a.seatId)
  await db
    .collection('trips')
    .doc('trip_AHM_PUN_0600_20261125')
    .set(
      {
        id: 'trip_AHM_PUN_0600_20261125',
        tripId,
        routeId,
        busId: 'bus_mh16dp4951',
        travelDate,
        departureTime: '06:00',
        arrivalTime: '08:45',
        fare: 200,
        status: 'active',
        totalSeats: 50,
        availableSeats: 30, // 50 - 20 booked
        bookedSeats: bookedSeatList,
        updatedAt: now,
      },
      { merge: true }
    )

  // 5. Create 20 Real Accounts & Bookings
  console.log('\n5. Creating 20 Accounts & Bookings in live Firestore & RTDB...')
  const summary: any[] = []

  for (let i = 0; i < TEST_20_ACCOUNTS.length; i++) {
    const acc = TEST_20_ACCOUNTS[i]!
    const ticketNo = `UT${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    const bookingId = `bk_live_20261125_${String(i + 1).padStart(2, '0')}`
    const paymentId = `pay_live_rzp_${String(i + 1).padStart(2, '0')}_${Date.now()}`

    // A. Create/Update in Firebase Auth
    try {
      await auth.createUser({
        uid: acc.uid,
        email: acc.email,
        password: 'Password@123',
        displayName: acc.name,
      })
      console.log(`   [Auth] Created user ${acc.uid} (${acc.email})`)
    } catch (authErr: any) {
      if (authErr.code === 'auth/uid-already-exists' || authErr.code === 'auth/email-already-exists') {
        console.log(`   [Auth] User ${acc.uid} already exists in Firebase Auth`)
      } else {
        console.warn(`   [Auth Notice] ${authErr.message}`)
      }
    }

    // B. Save User Profile in Firestore `users/{uid}`
    await db.collection('users').doc(acc.uid).set(
      {
        uid: acc.uid,
        name: acc.name,
        email: acc.email,
        mobile: acc.mobile,
        age: acc.age,
        gender: acc.gender,
        role: 'passenger',
        status: 'active',
        savedPassengers: [
          {
            id: `sp_self_${acc.uid}`,
            name: acc.name,
            age: acc.age,
            gender: acc.gender,
            isSelf: true,
          },
        ],
        createdAt: now,
        updatedAt: now,
      },
      { merge: true }
    )

    // C. Save Booking Document in Firestore `bookings/{bookingId}`
    await db.collection('bookings').doc(bookingId).set({
      id: bookingId,
      bookingId,
      userId: acc.uid,
      tripId,
      routeId,
      busId: 'bus_mh16dp4951',
      travelDate,
      departureTime: '06:00',
      pickupPoint: { name: acc.pickupPoint, time: '06:00' },
      dropPoint: { name: acc.dropPoint, time: '08:45' },
      seats: [acc.seatId],
      passengers: [
        {
          name: acc.name,
          age: acc.age,
          gender: acc.gender,
          seat: acc.seatId,
        },
      ],
      fare: { perSeat: 200, seats: 1, total: 200 },
      totalAmount: 200,
      status: 'confirmed',
      paymentId,
      ticketId: ticketNo,
      ticketNo,
      createdAt: now,
      updatedAt: now,
    })

    // D. Save Ticket Document in Firestore `tickets/{ticketNo}`
    await db.collection('tickets').doc(ticketNo).set({
      ticketNo,
      grp: bookingId,
      uid: acc.uid,
      status: 'CONFIRMED',
      route: { from: 'Ahilyanagar', to: 'Pune', routeId },
      travelDate,
      tripId,
      busName: 'Uday Travels Premium Executive AC Sleeper/Seater',
      busNumber,
      seatLayout: '3+2 Seater',
      pickup: { name: acc.pickupPoint, time: '06:00' },
      drop: { name: acc.dropPoint, time: '08:45' },
      passengers: [
        {
          seat: acc.seatId,
          title: '',
          name: acc.name,
          age: acc.age,
          gender: acc.gender,
        },
      ],
      contactMobile: acc.mobile,
      email: acc.email,
      fare: { perSeatPaise: 20000, seats: 1, totalPaise: 20000, taxesPaise: 0 },
      payment: {
        method: 'UPI',
        razorpayPaymentId: paymentId,
        paidAt: now,
      },
      bookedAt: now,
      createdAt: now,
      updatedAt: now,
    })

    // E. Save Payment Document in Firestore `payments/{paymentId}`
    await db.collection('payments').doc(paymentId).set({
      razorpayPaymentId: paymentId,
      grp: bookingId,
      uid: acc.uid,
      amountPaise: 20000,
      currency: 'INR',
      status: 'captured',
      method: 'UPI',
      email: acc.email,
      contact: acc.mobile,
      createdAt: now,
      updatedAt: now,
    })

    // F. Save Live Seat State in Firebase Realtime Database
    await rtdb.ref(`seatState/${tripId}/${acc.seatId}`).set({
      status: 'booked',
      userId: acc.uid,
      gender: acc.gender,
      ticketNo,
      bookingId,
      updatedAt: Date.now(),
    })

    summary.push({
      '#': i + 1,
      Passenger: acc.name,
      Gender: acc.gender,
      Seat: acc.seatId,
      'Ticket No': ticketNo,
      'Booking ID': bookingId,
      'Firebase UID': acc.uid,
    })

    console.log(
      `   ✓ [${String(i + 1).padStart(2, '0')}/20] Written: ${acc.name} | Seat ${acc.seatId} | Ticket ${ticketNo}`
    )
  }

  // 6. Update bus_seats & seat_public in Firestore
  console.log('\n6. Updating bus_seats and seat_public...')
  const busSeatsDoc: Record<string, any> = {}
  for (const acc of TEST_20_ACCOUNTS) {
    busSeatsDoc[acc.seatId] = {
      state: 'CONFIRMED',
      passengerGender: acc.gender.toLowerCase(),
      ticketNo: summary.find((s) => s.Seat === acc.seatId)?.['Ticket No'],
      heldBy: acc.uid,
      updatedAt: now,
    }
  }
  await db
    .collection('bus_seats')
    .doc(`${tripId}_${travelDate}`)
    .set({ tripId, date: travelDate, seats: busSeatsDoc, updatedAt: now }, { merge: true })

  // 7. Verify live count from Firestore
  const usersSnap = await db.collection('users').get()
  const bookingsSnap = await db.collection('bookings').get()
  const ticketsSnap = await db.collection('tickets').get()

  console.log(`\n========================================================================`)
  console.log(`[VERIFIED LIVE IN GOOGLE CLOUD FIRESTORE]`)
  console.log(`Total documents in 'users' collection:    ${usersSnap.size}`)
  console.log(`Total documents in 'bookings' collection: ${bookingsSnap.size}`)
  console.log(`Total documents in 'tickets' collection:  ${ticketsSnap.size}`)
  console.log(`========================================================================\n`)

  console.table(summary)
}

seedCloudFirebase()
  .then(() => {
    console.log('\n✓ CLOUD FIREBASE SYNC COMPLETED SUCCESSFULLY!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('\n✗ Error seeding cloud Firebase:', err)
    process.exit(1)
  })
