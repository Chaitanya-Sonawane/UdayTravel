import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

async function cleanDummyData() {
  const isProd = process.argv.includes('--prod')

  if (!isProd) {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
      process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
    }
    console.info(`[Cleanup] Running against Firebase Firestore Emulator at ${process.env.FIRESTORE_EMULATOR_HOST}`)
  } else {
    console.info('[Cleanup] Running against PRODUCTION Firebase Project (--prod flag provided)')
  }

  if (getApps().length === 0) {
    const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64
    if (b64 && isProd) {
      const decoded = Buffer.from(b64, 'base64').toString('utf-8')
      const credentials = JSON.parse(decoded)
      initializeApp({
        credential: cert(credentials),
        projectId: credentials.project_id,
      })
    } else {
      initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'uday-travels-dev',
      })
    }
  }

  const db = getFirestore()

  console.info('Deleting sample dummy documents from "availability" collection...')
  const availSnapshot = await db.collection('availability').get()
  let deletedAvailCount = 0

  for (const doc of availSnapshot.docs) {
    await doc.ref.delete()
    deletedAvailCount++
    console.info(`  Deleted availability/${doc.id}`)
  }

  console.info(`✓ Successfully purged ${deletedAvailCount} dummy availability document(s).`)
  console.info('Default state restored: missing documents automatically represent 0 booked / 50 seats available.')
}

cleanDummyData().catch((err) => {
  console.error('Cleanup execution error:', err)
  process.exit(1)
})
