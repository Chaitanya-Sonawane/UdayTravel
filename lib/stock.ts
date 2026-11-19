import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  writeBatch,
  Unsubscribe,
  increment,
  Timestamp,
} from 'firebase/firestore'
import { getClientDb } from '@/lib/firebase/client'
import { toTypeKey, formatTypeDisplayName, toTitleCase } from '@/lib/parse'
import { generateTypeCode, generateItemCode } from '@/lib/codes'

export interface StockType {
  id: string // typeKey
  name: string
  code: string
  total: number
  createdAt?: Timestamp
}

export interface StockItem {
  id: string // itemKey
  code: string
  colour: string
  size: string
  qty: number
  updatedAt?: Timestamp
}

export interface StockEntry {
  id: string
  typeKey: string
  itemKey: string
  qty: number
  createdNewItem: boolean
  createdNewType: boolean
  userId: string
  at: Timestamp
  undone: boolean
}

export interface SaveStockParams {
  type: string
  colour: string
  size: string
  qty: number
  userId: string
  existingTypeCodes?: string[]
}

export interface SaveStockResult {
  typeKey: string
  itemKey: string
  typeName: string
  typeCode: string
  itemCode: string
  colour: string
  size: string
  qty: number
}

/**
 * Save stock in ONE Firestore transaction:
 * - read the type doc and the item doc
 * - create whichever is missing (generate type code and item code in the same transaction so codes stay unique)
 * - increment item qty and type total
 * - write an entries record
 * Quantities must be whole numbers above 0.
 */
export async function saveStock(params: SaveStockParams): Promise<SaveStockResult> {
  const db = getClientDb()
  const { type, colour, size, qty, userId } = params

  if (!Number.isInteger(qty) || qty <= 0) {
    throw new Error('Quantity must be a whole number greater than 0.')
  }

  const cleanType = type.trim()
  const cleanSize = size.trim().toUpperCase()
  const cleanColour = colour.trim() ? toTitleCase(colour.trim()) : ''

  if (!cleanType) {
    throw new Error('Type is required.')
  }
  if (!cleanSize) {
    throw new Error('Size is required.')
  }

  const typeKey = toTypeKey(cleanType)
  const itemKey = `${cleanColour.toLowerCase()}|${cleanSize.toLowerCase()}`

  const typeRef = doc(db, 'types', typeKey)
  const itemRef = doc(db, 'types', typeKey, 'items', itemKey)
  const entryRef = doc(collection(db, 'entries'))

  let generatedResult: SaveStockResult | null = null

  await runTransaction(db, async (transaction) => {
    const typeDoc = await transaction.get(typeRef)
    const itemDoc = await transaction.get(itemRef)

    let createdNewType = false
    let createdNewItem = false
    let typeCode = ''
    let typeName = ''

    if (typeDoc.exists()) {
      const data = typeDoc.data()
      typeCode = data.code || ''
      typeName = data.name || formatTypeDisplayName(cleanType)
    } else {
      createdNewType = true
      typeName = formatTypeDisplayName(cleanType)
      typeCode = generateTypeCode(typeName, params.existingTypeCodes || [])
    }

    let itemCode = ''
    if (itemDoc.exists()) {
      const data = itemDoc.data()
      itemCode = data.code || ''
    } else {
      createdNewItem = true
      itemCode = generateItemCode(typeCode, cleanColour, cleanSize)
    }

    // Writes
    if (createdNewType) {
      transaction.set(typeRef, {
        name: typeName,
        code: typeCode,
        total: qty,
        createdAt: serverTimestamp(),
      })
    } else {
      transaction.update(typeRef, {
        total: increment(qty),
      })
    }

    if (createdNewItem) {
      transaction.set(itemRef, {
        code: itemCode,
        colour: cleanColour,
        size: cleanSize,
        qty: qty,
        updatedAt: serverTimestamp(),
      })
    } else {
      transaction.update(itemRef, {
        qty: increment(qty),
        updatedAt: serverTimestamp(),
      })
    }

    transaction.set(entryRef, {
      typeKey,
      itemKey,
      qty,
      createdNewItem,
      createdNewType,
      userId,
      at: serverTimestamp(),
      undone: false,
    })

    generatedResult = {
      typeKey,
      itemKey,
      typeName,
      typeCode,
      itemCode,
      colour: cleanColour,
      size: cleanSize,
      qty,
    }
  })

  if (!generatedResult) {
    throw new Error('Transaction failed to complete.')
  }

  return generatedResult
}

/**
 * Adjust item qty with +/- button in a transaction (never below 0)
 * Updates type total by the same difference.
 */
export async function adjustItemQty(
  typeKey: string,
  itemKey: string,
  delta: number
): Promise<{ newQty: number; newTotal: number }> {
  const db = getClientDb()
  const typeRef = doc(db, 'types', typeKey)
  const itemRef = doc(db, 'types', typeKey, 'items', itemKey)

  let result = { newQty: 0, newTotal: 0 }

  await runTransaction(db, async (transaction) => {
    const [typeDoc, itemDoc] = await Promise.all([
      transaction.get(typeRef),
      transaction.get(itemRef),
    ])

    if (!typeDoc.exists() || !itemDoc.exists()) {
      throw new Error('Item or Type not found.')
    }

    const currentQty = itemDoc.data().qty || 0
    const currentTotal = typeDoc.data().total || 0

    const targetQty = currentQty + delta
    const newQty = targetQty < 0 ? 0 : targetQty
    const diff = newQty - currentQty

    if (diff === 0) {
      result = { newQty: currentQty, newTotal: currentTotal }
      return
    }

    const newTotal = Math.max(0, currentTotal + diff)

    transaction.update(itemRef, {
      qty: newQty,
      updatedAt: serverTimestamp(),
    })
    transaction.update(typeRef, {
      total: newTotal,
    })

    result = { newQty, newTotal }
  })

  return result
}

/**
 * Undo latest entry for user/shop that is not undone:
 * reverses the owner's latest entry, deletes item or type if count is back to 0, marks entry undone.
 */
export async function undoLastEntry(): Promise<{
  success: boolean
  message: string
}> {
  const db = getClientDb()
  // Query latest non-undone entry
  const q = query(
    collection(db, 'entries'),
    where('undone', '==', false),
    orderBy('at', 'desc'),
    limit(1)
  )

  const snap = await getDocs(q)
  if (snap.empty) {
    return { success: false, message: 'No recent entry found to undo.' }
  }

  const latestEntryDoc = snap.docs[0]!
  const entryData = latestEntryDoc.data() as StockEntry
  const entryId = latestEntryDoc.id

  const typeRef = doc(db, 'types', entryData.typeKey)
  const itemRef = doc(db, 'types', entryData.typeKey, 'items', entryData.itemKey)
  const entryRef = doc(db, 'entries', entryId)

  await runTransaction(db, async (transaction) => {
    const [typeDoc, itemDoc, currentEntryDoc] = await Promise.all([
      transaction.get(typeRef),
      transaction.get(itemRef),
      transaction.get(entryRef),
    ])

    if (!currentEntryDoc.exists() || currentEntryDoc.data().undone) {
      throw new Error('Entry was already undone.')
    }

    const currentQty = itemDoc.exists() ? (itemDoc.data().qty || 0) : 0
    const currentTotal = typeDoc.exists() ? (typeDoc.data().total || 0) : 0

    const newQty = Math.max(0, currentQty - entryData.qty)
    const newTotal = Math.max(0, currentTotal - entryData.qty)

    // Deletes item or type that this entry created if its count is back to 0
    if (entryData.createdNewItem && newQty === 0 && itemDoc.exists()) {
      transaction.delete(itemRef)
    } else if (itemDoc.exists()) {
      transaction.update(itemRef, {
        qty: newQty,
        updatedAt: serverTimestamp(),
      })
    }

    if (entryData.createdNewType && newTotal === 0 && typeDoc.exists()) {
      transaction.delete(typeRef)
    } else if (typeDoc.exists()) {
      transaction.update(typeRef, {
        total: newTotal,
      })
    }

    transaction.update(entryRef, {
      undone: true,
    })
  })

  return { success: true, message: `Reversed entry of ${entryData.qty} items.` }
}

/**
 * Edit type code in heading:
 * Uppercase letters and digits only, must be unique across types.
 * Regenerates all item codes of that type.
 */
export async function updateTypeCode(
  typeKey: string,
  newCode: string,
  existingTypes: StockType[]
): Promise<void> {
  const db = getClientDb()
  const cleanCode = newCode.trim().toUpperCase()

  if (!/^[A-Z0-9]+$/.test(cleanCode)) {
    throw new Error('Code must contain uppercase letters and numbers only.')
  }

  // Check uniqueness across types
  const duplicate = existingTypes.find(
    (t) => t.id !== typeKey && t.code.toUpperCase() === cleanCode
  )
  if (duplicate) {
    throw new Error(`Code ${cleanCode} is already used by type "${duplicate.name}".`)
  }

  // Read all items under this type
  const itemsColl = collection(db, 'types', typeKey, 'items')
  const itemsSnap = await getDocs(itemsColl)

  const batch = writeBatch(db)
  const typeRef = doc(db, 'types', typeKey)
  batch.update(typeRef, { code: cleanCode })

  const usedItemCodes: string[] = []
  itemsSnap.docs.forEach((itemDoc) => {
    const data = itemDoc.data()
    const newItemCode = generateItemCode(
      cleanCode,
      data.colour,
      data.size,
      usedItemCodes
    )
    usedItemCodes.push(newItemCode)
    batch.update(itemDoc.ref, { code: newItemCode })
  })

  await batch.commit()
}

/**
 * Real-time listener for all types
 */
export function subscribeToStockTypes(
  callback: (types: StockType[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const db = getClientDb()
  const typesColl = collection(db, 'types')
  return onSnapshot(
    typesColl,
    (snapshot) => {
      const types: StockType[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name || doc.id,
        code: doc.data().code || '',
        total: doc.data().total || 0,
        createdAt: doc.data().createdAt,
      }))
      // Sort alphabetically by name
      types.sort((a, b) => a.name.localeCompare(b.name))
      callback(types)
    },
    (error) => {
      if (onError) onError(error)
      else console.error('Error listening to stock types:', error)
    }
  )
}

/**
 * Real-time listener for items of a selected type
 */
export function subscribeToStockItems(
  typeKey: string,
  callback: (items: StockItem[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const db = getClientDb()
  const itemsColl = collection(db, 'types', typeKey, 'items')
  return onSnapshot(
    itemsColl,
    (snapshot) => {
      const items: StockItem[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        code: doc.data().code || '',
        colour: doc.data().colour || '',
        size: doc.data().size || '',
        qty: doc.data().qty || 0,
        updatedAt: doc.data().updatedAt,
      }))
      // Sort items: colour then size
      items.sort((a, b) => {
        if (a.colour !== b.colour) return a.colour.localeCompare(b.colour)
        return a.size.localeCompare(b.size)
      })
      callback(items)
    },
    (error) => {
      if (onError) onError(error)
      else console.error(`Error listening to items for type ${typeKey}:`, error)
    }
  )
}
