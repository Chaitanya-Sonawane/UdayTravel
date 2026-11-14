import { initializeApp, getApps, getApp, App, cert } from 'firebase-admin/app'
import { getAuth, Auth } from 'firebase-admin/auth'
import { getFirestore, Firestore } from 'firebase-admin/firestore'
import { getAppCheck, AppCheck } from 'firebase-admin/app-check'

import fs from 'node:fs'
import path from 'node:path'

let adminApp: App

const DEV_STORAGE_FILE = path.join(process.cwd(), '.dev-firestore-store.json')
const isVitest = Boolean(process.env.VITEST || process.env.NODE_ENV === 'test')

function loadDevStore(): Map<string, any> {
  const store = new Map<string, any>()
  if (isVitest) {
    return store
  }
  try {
    if (fs.existsSync(DEV_STORAGE_FILE)) {
      const content = fs.readFileSync(DEV_STORAGE_FILE, 'utf-8')
      const parsed = JSON.parse(content)
      for (const [k, v] of Object.entries(parsed)) {
        store.set(k, v)
      }
    }
  } catch (err) {
    console.warn('[Firebase Dev Memory Store] Could not read dev storage file:', err)
  }
  return store
}

function saveDevStore(store: Map<string, any>) {
  if (isVitest) {
    return
  }
  try {
    const obj: Record<string, any> = {}
    for (const [k, v] of store.entries()) {
      obj[k] = v
    }
    fs.writeFileSync(DEV_STORAGE_FILE, JSON.stringify(obj, null, 2), 'utf-8')
  } catch (err) {
    console.warn('[Firebase Dev Memory Store] Could not persist dev storage file:', err)
  }
}

// In-memory + disk dev storage map for local offline/dev testing when service account is not yet supplied
const globalForDev = globalThis as unknown as {
  __devMemoryStore?: Map<string, any>
}

export function clearDevMemoryStore() {
  if (globalForDev.__devMemoryStore) {
    globalForDev.__devMemoryStore.clear()
  }
}

const devMemoryStore = isVitest
  ? new Map<string, any>()
  : (globalForDev.__devMemoryStore ?? loadDevStore())
if (process.env.NODE_ENV !== 'production' && !isVitest) {
  globalForDev.__devMemoryStore = devMemoryStore
}

function applyNestedUpdate(target: any, updateObj: any) {
  for (const [key, value] of Object.entries(updateObj)) {
    if (key.includes('.')) {
      const parts = key.split('.')
      let curr = target
      for (let i = 0; i < parts.length - 1; i++) {
        const p = parts[i] as string
        if (!curr[p] || typeof curr[p] !== 'object') {
          curr[p] = {}
        }
        curr = curr[p]
      }
      const last = parts[parts.length - 1] as string
      curr[last] = value
    } else {
      target[key] = value
    }
  }
}

class DevDocRef {
  constructor(private colName: string, private docId: string) {}

  private get key() {
    return `${this.colName}/${this.docId}`
  }

  collection(subColName: string) {
    return new DevCollectionRef(`${this.colName}/${this.docId}/${subColName}`)
  }

  async get() {
    const data = devMemoryStore.get(this.key)
    return {
      id: this.docId,
      exists: Boolean(data),
      data: () => (data ? JSON.parse(JSON.stringify(data)) : undefined),
    }
  }

  async set(data: any, options?: { merge?: boolean }) {
    if (options?.merge) {
      const existing = devMemoryStore.get(this.key) || {}
      const merged = JSON.parse(JSON.stringify(existing))
      applyNestedUpdate(merged, data)
      devMemoryStore.set(this.key, merged)
    } else {
      devMemoryStore.set(this.key, JSON.parse(JSON.stringify(data)))
    }
    saveDevStore(devMemoryStore)
    return { writeTime: new Date().toISOString() }
  }

  async update(data: any) {
    const existing = devMemoryStore.get(this.key)
    if (!existing) {
      throw new Error(`NOT_FOUND: Document ${this.key} does not exist`)
    }
    const updated = JSON.parse(JSON.stringify(existing))
    applyNestedUpdate(updated, data)
    devMemoryStore.set(this.key, updated)
    saveDevStore(devMemoryStore)
    return { writeTime: new Date().toISOString() }
  }

  async create(data: any) {
    if (devMemoryStore.has(this.key)) {
      const err: any = new Error('ALREADY_EXISTS: Document already exists')
      err.code = 6
      throw err
    }
    devMemoryStore.set(this.key, JSON.parse(JSON.stringify(data)))
    saveDevStore(devMemoryStore)
    return { writeTime: new Date().toISOString() }
  }

  async delete() {
    devMemoryStore.delete(this.key)
    saveDevStore(devMemoryStore)
    return { writeTime: new Date().toISOString() }
  }
}

class DevCollectionRef {
  constructor(private colName: string) {}

  doc(docId: string) {
    return new DevDocRef(this.colName, docId)
  }

  async get() {
    const prefix = `${this.colName}/`
    const docs = Array.from(devMemoryStore.entries())
      .filter(([k]) => k.startsWith(prefix) && !k.slice(prefix.length).includes('/'))
      .map(([k, v]) => ({
        id: k.slice(prefix.length),
        data: () => JSON.parse(JSON.stringify(v)),
        exists: true,
      }))
    return {
      docs,
      empty: docs.length === 0,
      size: docs.length,
      forEach: (cb: (doc: any) => void) => docs.forEach(cb),
    }
  }
}

class DevTransaction {
  async get(docRef: DevDocRef) {
    return docRef.get()
  }

  set(docRef: DevDocRef, data: any, options?: { merge?: boolean }) {
    docRef.set(data, options)
    return this
  }

  update(docRef: DevDocRef, data: any) {
    docRef.update(data)
    return this
  }

  create(docRef: DevDocRef, data: any) {
    docRef.create(data)
    return this
  }
}

class DevFirestoreProxy {
  collection(colName: string) {
    return new DevCollectionRef(colName)
  }

  async runTransaction<T>(
    updateFunction: (transaction: DevTransaction) => Promise<T>
  ): Promise<T> {
    const transaction = new DevTransaction()
    return updateFunction(transaction)
  }
}

const devFirestoreInstance = new DevFirestoreProxy()

export function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApp()
  }

  const b64ServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_B64

  if (b64ServiceAccount) {
    try {
      const decodedJson = Buffer.from(b64ServiceAccount, 'base64').toString('utf-8')
      const credentials = JSON.parse(decodedJson)
      adminApp = initializeApp({
        credential: cert(credentials),
        projectId: credentials.project_id,
      })
      return adminApp
    } catch (err) {
      console.error('[Firebase Admin] Failed parsing FIREBASE_SERVICE_ACCOUNT_B64:', err)
    }
  }

  // Fallback for emulator suite and dev environments
  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID ||
    'uday-travels-dev'

  adminApp = initializeApp({
    projectId,
  })

  return adminApp
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp())
}

export function getAdminDb(): Firestore {
  const hasServiceAccount = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_B64)
  const hasEmulator = Boolean(
    process.env.FIRESTORE_EMULATOR_HOST || process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST
  )

  // Use real Firestore if service account or emulator is present
  if (hasServiceAccount || hasEmulator) {
    return getFirestore(getAdminApp())
  }

  // Fallback in dev mode when service account is not yet configured locally
  return devFirestoreInstance as unknown as Firestore
}

export function getAdminAppCheck(): AppCheck {
  return getAppCheck(getAdminApp())
}
