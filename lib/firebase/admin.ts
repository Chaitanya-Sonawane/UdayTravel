import { initializeApp, getApps, getApp, App, cert } from 'firebase-admin/app'
import { getAuth, Auth } from 'firebase-admin/auth'
import { getFirestore, Firestore } from 'firebase-admin/firestore'
import { getDatabase, Database } from 'firebase-admin/database'
import { getAppCheck, AppCheck } from 'firebase-admin/app-check'

import fs from 'node:fs'
import path from 'node:path'
import dns from 'node:dns'
import { DEFAULT_BUSES } from '../data/buses.constants'

let adminApp: App

const serviceAccount = {
  type: 'service_account',
  project_id: process.env.FIREBASE_PROJECT_ID || 'united18-a884d',
  private_key_id:
    process.env.FIREBASE_PRIVATE_KEY_ID || '3395dc33a019700eca3b6c8814ba5ef50628a8ca',
  private_key: (
    process.env.FIREBASE_PRIVATE_KEY ||
    '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCzIFZ8BunRVBxG\n50y1x0MCxAGbuC8qVng1Y/DlFCz/ZgqZzlsf3NM4TL8PgHc8FEjQdscK6+/D/VXM\nta7gx/AwkF0ZN5b+173/YvHC9XcaG+oVPgfPm0XOCLVePk0P67zrzbOmWwAN5FOH\nkjK4wpMFN895cFl+rNLMWnCXm3yNt7owBXhyqWWAezWcr2P9UvQhTM1sRTMqzpnM\ns1Mt6HxB6puXQwAXGApbHm6CN3x0OknpG+juzfW5B4VdGWLr2uMDyBTh+mTQ++Yu\nEkLeZvSpsdkuRSYQ8bkFPRwGZ3iS0pDTvCzFIMbKGm6UuG7uT6G65oLB20dCTWDY\nv4rRn9L5AgMBAAECggEALL0QbLTLVGGGGH1vrt0gUwIChtKXUSM8rdUS1xxVasqh\nLi4Ym1orlR2yAJys6yAD2bE44HTyMwjEk7bzASheyLpdzk0QlQDsbutXB8MIJsi/\nC+QszkDxS9bn+axk0eumiVycmJmU52NWK3+r1HKghsacNrAFYjqnAaw6/9qxXrGP\n+SHcO8dW0sBgCY/1Va+GF2/5SrF1kQE7XaxQ6tyIBKe4cwmVVf/VC+Z1I2XMVc2G\nmb+5AGH1b70uPmmiH9ULUlpMjhMtpFB0uNtYyvjzmfAtnT/MtCCSCHTykxVe/XUC\nsV0Shle3RDNIOkaPT9cbbMFhd48YmoFChDwQt00LEwKBgQDmaFuFUjAus3zwK+Dt\nJWwY3LYasui4X8f6xMohJegclR9HFZSE/VLEqDvJFAl1KYV2TAmoNA5zv+8/Q4oz\n6Ia3Uh45pqb77BtQVYboU9qahHd1DJv9VWjR/raoB4sieZCe9rQ2WwniaApKJauR\nBJ1FvgqyoLTSlNVnGZeSmQId8wKBgQDHBcup1CpxUM1mcw0GaBhYJPzIh/mDyVkF\ngRvR7gRJGpT26/wYZ4lvBfbAJTqdaKijDDXgWvx5dj4dVVAlmS/KRHruPG6+pazj\nLgXHl66OIkKN5hESFlfMff12sWPKnCmlYQLdoG0W0p004s3ARutCtUlBvuhpADyR\nReBFDcJKYwKBgQDgzqG9i1uHtYkJrUZhHEpEV9U2Z6m5e3rbqnatsRawDK/f46Zt\nu92uE5eBshMoRcL6kWY6v8/6ECOXTobh7tbCt1TWW0xCMTTVRR3EQUzhxq3nfs4U\nd+k2O5hsii+vC32YHI3pGxqh1XF0txyW+jGZgrtdXoAPlzhAyC+j0bbHEQKBgBdU\n65peQBeGtH21MSq2G1yCAYx0vGChwyjtCNjkgWYckqgb5DLsOGVmmpXOB4Aam+J5\ndPt3Ty/iF8gSj1HJEpwwyQSS2xzIiWscoxrSAmmxRIIkHY40Rli30HYQt7Ux94Pm\nypI203Mgf8OKbzqCVeQ9InhtrAtbNr6FJZSS11snAoGBANe3MWq9OXb41RpckIQC\ngXrHJVo/komfVLFzxBPZRx4uutjlfUOvgOhaOjhsuk3uymkKPPW5fIyWJ1wuXKYK\nhk+qUjRY/v+OrtMTktUS70HYz2DGPOR2fD7O3krjI37VwclJJVWrhNYLezaMw+5Q\nkKghQykRazL7buQjjfBsQW7T\n-----END PRIVATE KEY-----\n'
  ).replace(/\\n/g, '\n'),
  client_email:
    process.env.FIREBASE_CLIENT_EMAIL ||
    'firebase-adminsdk-fbsvc@united18-a884d.iam.gserviceaccount.com',
}

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
  } catch (_err) {
    // dev storage file not present or unreadable
  }

  // Pre-seed default fleet buses if missing
  try {
    const hasBuses = Array.from(store.keys()).some((k) => k.startsWith('buses/'))
    if (!hasBuses && Array.isArray(DEFAULT_BUSES)) {
      DEFAULT_BUSES.forEach((bus) => {
        store.set(`buses/${bus.id}`, bus)
      })
    }
  } catch {
    // Ignore seed failure
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
  } catch (_err) {
    // dev storage persistence fallback
  }
}

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
  constructor(public colName: string, public docId: string) {}

  get id() {
    return this.docId
  }

  get path() {
    return `${this.colName}/${this.docId}`
  }

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
      path: this.path,
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
    const existing = devMemoryStore.get(this.key) || {}
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
  constructor(
    public colName: string,
    private filters: Array<{ field: string; op: string; value: any }> = []
  ) {}

  doc(docId?: string) {
    const id = docId || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    return new DevDocRef(this.colName, id)
  }

  async add(data: any) {
    const docRef = this.doc()
    await docRef.set(data)
    return docRef
  }

  where(field: string, op: string, value: any) {
    return new DevCollectionRef(this.colName, [...this.filters, { field, op, value }])
  }

  orderBy(_field?: string, _direction?: string) {
    return this
  }

  limit(_limitCount?: number) {
    return this
  }

  async get() {
    const prefix = `${this.colName}/`
    let docs = Array.from(devMemoryStore.entries())
      .filter(([k]) => k.startsWith(prefix) && !k.slice(prefix.length).includes('/'))
      .map(([k, v]) => ({
        id: k.slice(prefix.length),
        path: k,
        data: () => JSON.parse(JSON.stringify(v)),
        exists: true,
      }))

    if (this.filters.length > 0) {
      docs = docs.filter((d) => {
        const data = d.data() || {}
        return this.filters.every((f) => {
          const val = data[f.field]
          if (f.op === '==') return val === f.value
          if (f.op === '!=') return val !== f.value
          if (f.op === 'in') return Array.isArray(f.value) && f.value.includes(val)
          return true
        })
      })
    }

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

  doc(pathStr: string) {
    const parts = pathStr.split('/')
    if (parts.length >= 2) {
      const col = parts.slice(0, parts.length - 1).join('/')
      const id = parts[parts.length - 1]!
      return new DevDocRef(col, id)
    }
    return new DevDocRef(pathStr, 'default')
  }

  batch() {
    const operations: Array<() => Promise<any>> = []
    return {
      set(docRef: DevDocRef, data: any, options?: { merge?: boolean }) {
        operations.push(() => docRef.set(data, options))
        return this
      },
      update(docRef: DevDocRef, data: any) {
        operations.push(() => docRef.update(data))
        return this
      },
      delete(docRef: DevDocRef) {
        operations.push(() => docRef.delete())
        return this
      },
      async commit() {
        for (const op of operations) {
          await op()
        }
      },
    }
  }

  async runTransaction<T>(
    updateFunction: (transaction: DevTransaction) => Promise<T>
  ): Promise<T> {
    const transaction = new DevTransaction()
    return updateFunction(transaction)
  }
}

const devFirestoreInstance = new DevFirestoreProxy()

let isLiveFirestoreUnavailable = Boolean(
  process.env.FIREBASE_OFFLINE === 'true' ||
  process.env.USE_DEV_DB === 'true' ||
  isVitest
)

let hasCheckedDns = false

function checkDnsConnectivity() {
  if (hasCheckedDns || isLiveFirestoreUnavailable || typeof window !== 'undefined') return
  hasCheckedDns = true
  try {
    dns.lookup('firestore.googleapis.com', (err) => {
      if (err) {
        isLiveFirestoreUnavailable = true
      }
    })
  } catch {
    isLiveFirestoreUnavailable = true
  }
}

// Check DNS at startup
checkDnsConnectivity()

function isNetworkUnavailableError(err: any): boolean {
  if (!err) return false
  const msg = (
    (err.message || '') +
    ' ' +
    (err.details || '') +
    ' ' +
    String(err)
  ).toLowerCase()
  return (
    msg.includes('14 unavailable') ||
    msg.includes('unavailable') ||
    msg.includes('name resolution failed') ||
    msg.includes('could not reach cloud firestore') ||
    msg.includes('getaddrinfo') ||
    msg.includes('enotfound') ||
    msg.includes('eai_again') ||
    msg.includes('timeout') ||
    msg.includes('deadline_exceeded') ||
    msg.includes('permission_denied') ||
    msg.includes('permission-denied') ||
    msg.includes('permission denied') ||
    msg.includes('has not been used in project') ||
    msg.includes('not been used in project') ||
    msg.includes('is disabled') ||
    msg.includes('disabled') ||
    msg.includes('consumer-invalid') ||
    err.code === 14 ||
    err.code === 7 ||
    err.code === 'UNAVAILABLE' ||
    err.code === 'PERMISSION_DENIED'
  )
}

function triggerOfflineFallback(err?: any) {
  if (!isLiveFirestoreUnavailable) {
    isLiveFirestoreUnavailable = true
  }
}

function createResilientDocRef(origDoc: any, docPath: string): any {
  return new Proxy(origDoc, {
    get(target, prop, receiver) {
      const orig = Reflect.get(target, prop, receiver)
      if (typeof orig !== 'function') return orig

      if (['get', 'set', 'update', 'delete', 'create'].includes(prop as string)) {
        return async (...args: any[]) => {
          if (isLiveFirestoreUnavailable) {
            const devDoc = devFirestoreInstance.doc(docPath)
            return (devDoc as any)[prop](...args)
          }
          try {
            return await Promise.race([
              orig.apply(target, args),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Firestore operation timed out (14 UNAVAILABLE)')), 2000)
              ),
            ])
          } catch (err: any) {
            if (isNetworkUnavailableError(err)) {
              triggerOfflineFallback(err)
              const devDoc = devFirestoreInstance.doc(docPath)
              return (devDoc as any)[prop](...args)
            }
            throw err
          }
        }
      }

      return orig.bind(target)
    },
  })
}

function createResilientCollectionRef(origCol: any, colName: string): any {
  return new Proxy(origCol, {
    get(target, prop, receiver) {
      const orig = Reflect.get(target, prop, receiver)
      if (typeof orig !== 'function') return orig

      if (prop === 'doc') {
        return (docId?: string) => {
          if (isLiveFirestoreUnavailable) {
            return devFirestoreInstance.collection(colName).doc(docId)
          }
          const origDoc = orig.call(target, docId)
          const fullPath = docId ? `${colName}/${docId}` : colName
          return createResilientDocRef(origDoc, fullPath)
        }
      }

      if (prop === 'get') {
        return async () => {
          if (isLiveFirestoreUnavailable) {
            return devFirestoreInstance.collection(colName).get()
          }
          try {
            return await Promise.race([
              orig.call(target),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Firestore query timed out (14 UNAVAILABLE)')), 2000)
              ),
            ])
          } catch (err: any) {
            if (isNetworkUnavailableError(err)) {
              triggerOfflineFallback(err)
              return devFirestoreInstance.collection(colName).get()
            }
            throw err
          }
        }
      }

      if (['where', 'orderBy', 'limit'].includes(prop as string)) {
        return (...args: any[]) => {
          if (isLiveFirestoreUnavailable) {
            return (devFirestoreInstance.collection(colName) as any)[prop](...args)
          }
          try {
            const nextQuery = orig.apply(target, args)
            return createResilientCollectionRef(nextQuery, colName)
          } catch {
            return (devFirestoreInstance.collection(colName) as any)[prop](...args)
          }
        }
      }

      return orig.bind(target)
    },
  })
}

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
        databaseURL:
          process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ||
          'https://united18-a884d-default-rtdb.firebaseio.com',
      })
      return adminApp
    } catch (err) {
      console.error('[Firebase Admin] Failed parsing FIREBASE_SERVICE_ACCOUNT_B64:', err)
    }
  }

  try {
    adminApp = initializeApp({
      credential: cert(serviceAccount as any),
      projectId: serviceAccount.project_id,
      databaseURL:
        process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ||
        'https://united18-a884d-default-rtdb.firebaseio.com',
    })
    return adminApp
  } catch (err) {
    console.warn('[Firebase Admin] Certificate init fallback:', err)
  }

  // Fallback for emulator suite and dev environments
  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID ||
    'united18-a884d'

  adminApp = initializeApp({
    projectId,
    databaseURL:
      process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ||
      'https://united18-a884d-default-rtdb.firebaseio.com',
  })

  return adminApp
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp())
}

export function getAdminDb(): Firestore {
  if (isVitest || isLiveFirestoreUnavailable) {
    return devFirestoreInstance as unknown as Firestore
  }

  try {
    const realDb = getFirestore(getAdminApp())

    // Return a Proxy around the real Firestore that intercepts network crashes and falls back seamlessly
    return new Proxy(realDb, {
      get(target, prop, receiver) {
        if (isLiveFirestoreUnavailable) {
          return Reflect.get(devFirestoreInstance, prop)
        }

        const origMethod = Reflect.get(target, prop, receiver)
        if (typeof origMethod !== 'function') {
          return origMethod
        }

        if (prop === 'collection') {
          return (colName: string) => {
            if (isLiveFirestoreUnavailable) {
              return devFirestoreInstance.collection(colName)
            }
            const origCol = origMethod.call(target, colName)
            return createResilientCollectionRef(origCol, colName)
          }
        }

        if (prop === 'doc') {
          return (docPath: string) => {
            if (isLiveFirestoreUnavailable) {
              return devFirestoreInstance.doc(docPath)
            }
            const origDoc = origMethod.call(target, docPath)
            return createResilientDocRef(origDoc, docPath)
          }
        }

        if (prop === 'batch') {
          return () => {
            if (isLiveFirestoreUnavailable) {
              return devFirestoreInstance.batch()
            }
            try {
              const origBatch = origMethod.call(target)
              return {
                set(docRef: any, data: any, options?: any) {
                  origBatch.set(docRef, data, options)
                  return this
                },
                update(docRef: any, data: any) {
                  origBatch.update(docRef, data)
                  return this
                },
                delete(docRef: any) {
                  origBatch.delete(docRef)
                  return this
                },
                async commit() {
                  if (isLiveFirestoreUnavailable) {
                    return devFirestoreInstance.batch().commit()
                  }
                  try {
                    return await origBatch.commit()
                  } catch (err: any) {
                    if (isNetworkUnavailableError(err)) {
                      triggerOfflineFallback(err)
                      return devFirestoreInstance.batch().commit()
                    }
                    throw err
                  }
                },
              }
            } catch {
              return devFirestoreInstance.batch()
            }
          }
        }

        if (prop === 'runTransaction') {
          return async <T>(updateFunction: any): Promise<T> => {
            if (isLiveFirestoreUnavailable) {
              return devFirestoreInstance.runTransaction(updateFunction)
            }
            try {
              return await origMethod.call(target, updateFunction)
            } catch (err: any) {
              if (isNetworkUnavailableError(err)) {
                triggerOfflineFallback(err)
                return devFirestoreInstance.runTransaction(updateFunction)
              }
              throw err
            }
          }
        }

        return origMethod.bind(target)
      },
    })
  } catch (err) {
    triggerOfflineFallback(err)
    return devFirestoreInstance as unknown as Firestore
  }
}

export function getAdminRtdb(): Database {
  return getDatabase(getAdminApp())
}

export function getAdminAppCheck(): AppCheck {
  return getAppCheck(getAdminApp())
}

export const adminDb = isVitest ? (devFirestoreInstance as unknown as Firestore) : getAdminDb()
export default { getAdminApp, getAdminAuth, getAdminDb, getAdminRtdb, adminDb }
