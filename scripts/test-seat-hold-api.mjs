import { getApiAuthHeaders } from './lib/firebase/client.js'

async function run() {
  console.log('Testing getApiAuthHeaders()...')
  const headers = await getApiAuthHeaders()
  console.log('Obtained headers:', headers)

  const payload = {
    routeId: 'AHM_PUN',
    date: '2026-11-22',
    tripId: 'AHM_PUN_0600_4951',
    family: false,
    acceptAdjacent: false,
    passengers: [
      { seatId: 'B1', gender: 'M', age: 25 }
    ]
  }

  console.log('Calling POST /api/seats/hold...')
  const res = await fetch('http://localhost:3000/api/seats/hold', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  })

  console.log('Response status:', res.status)
  const data = await res.json()
  console.log('Response data:', data)

  if (res.ok && data.grp) {
    console.log('SUCCESS: Seat hold placed cleanly without any configuration-not-found error!')
  } else {
    console.error('FAILED:', data)
    process.exit(1)
  }
}

run().catch(e => {
  console.error('Error:', e)
  process.exit(1)
})
