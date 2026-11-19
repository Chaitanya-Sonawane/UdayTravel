import { getApps, initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import * as fs from 'fs'
import * as path from 'path'

// Helper script to create or update owner user in Firebase Auth
async function main() {
  const email = process.argv[2] || 'owner@united18.com'
  const password = process.argv[3] || 'United18Stock!'

  const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json')
  if (!fs.existsSync(serviceAccountPath)) {
    console.error('serviceAccountKey.json not found.')
    process.exit(1)
  }

  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))

  if (!getApps().length) {
    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id,
    })
  }

  const auth = getAuth()

  try {
    const existing = await auth.getUserByEmail(email)
    console.log(`User ${email} already exists with UID: ${existing.uid}`)
    await auth.updateUser(existing.uid, { password })
    console.log(`Password updated successfully for ${email}.`)
  } catch (err: any) {
    if (err.code === 'auth/user-not-found') {
      const user = await auth.createUser({
        email,
        password,
        displayName: 'United 18 Owner',
      })
      console.log(`Created new owner user ${email} with UID: ${user.uid}`)
    } else {
      console.error('Error managing user:', err)
      process.exit(1)
    }
  }

  console.log('Done.')
}

main()
