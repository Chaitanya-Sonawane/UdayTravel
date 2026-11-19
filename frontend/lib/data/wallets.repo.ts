import { getAdminDb } from '../firebase/admin'
import { firestoreMeter } from '../firebase/meter'
import { AppError, ErrorCodes } from '../errors/app-error'
import {
  WalletDoc,
  WalletHoldItem,
  LedgerEntry,
  LedgerEntryType,
} from '../schemas/wallet.schema'
import { validatePaise } from '../money'

export class WalletsRepository {
  /**
   * Lazily computes active hold sum and available balance.
   */
  static cleanActiveHolds(wallet: WalletDoc, now = Date.now()): {
    activeHolds: Record<string, WalletHoldItem>
    heldPaise: number
  } {
    const active: Record<string, WalletHoldItem> = {}
    let heldPaise = 0

    for (const [grp, hold] of Object.entries(wallet.activeHolds || {})) {
      if (hold.expiresAt > now) {
        active[grp] = hold
        heldPaise += hold.amountPaise
      }
    }

    return { activeHolds: active, heldPaise }
  }

  static async getWallet(uid: string): Promise<{
    balancePaise: number
    availablePaise: number
    activeHolds: Record<string, WalletHoldItem>
  }> {
    firestoreMeter.recordRead('wallets', uid)
    const db = getAdminDb()
    const snap = await db.collection('wallets').doc(uid).get()
    if (!snap.exists) {
      return {
        balancePaise: 0,
        availablePaise: 0,
        activeHolds: {},
      }
    }

    const doc = snap.data() as WalletDoc
    const { activeHolds, heldPaise } = this.cleanActiveHolds(doc)
    const availablePaise = Math.max(0, doc.balancePaise - heldPaise)

    return {
      balancePaise: doc.balancePaise,
      availablePaise,
      activeHolds,
    }
  }

  static async getWalletDocInTx(
    t: FirebaseFirestore.Transaction,
    uid: string
  ): Promise<WalletDoc> {
    firestoreMeter.recordRead('wallets', uid)
    const db = getAdminDb()
    const docRef = db.collection('wallets').doc(uid)
    const snap = await t.get(docRef)
    if (!snap.exists) {
      const now = new Date().toISOString()
      return {
        uid,
        balancePaise: 0,
        activeHolds: {},
        createdAt: now,
        updatedAt: now,
        schemaVersion: 1,
      }
    }
    return snap.data() as WalletDoc
  }

  /**
   * Places a temporary hold on the user's wallet store credit balance.
   */
  static placeHoldInTx(
    t: FirebaseFirestore.Transaction,
    uid: string,
    grp: string,
    amountPaise: number,
    expiresAt: number,
    currentDoc: WalletDoc
  ): void {
    validatePaise(amountPaise, 'amountPaise')
    const { activeHolds, heldPaise } = this.cleanActiveHolds(currentDoc)
    const available = currentDoc.balancePaise - heldPaise

    if (available < amountPaise) {
      throw new AppError(
        ErrorCodes.INSUFFICIENT_WALLET,
        `Insufficient available wallet balance. Available: ${available} paise, requested: ${amountPaise} paise`
      )
    }

    activeHolds[grp] = {
      grp,
      amountPaise,
      expiresAt,
    }

    const isoNow = new Date().toISOString()
    const db = getAdminDb()
    const docRef = db.collection('wallets').doc(uid)

    firestoreMeter.recordWrite('wallets', uid)
    t.set(
      docRef,
      {
        uid,
        balancePaise: currentDoc.balancePaise,
        activeHolds,
        updatedAt: isoNow,
        createdAt: currentDoc.createdAt || isoNow,
        schemaVersion: 1,
      },
      { merge: true }
    )
  }

  /**
   * Finalizes wallet debit on confirmed booking: releases hold and decrements balance, writing ledger entry.
   */
  static finalizeDebitInTx(
    t: FirebaseFirestore.Transaction,
    uid: string,
    grp: string,
    amountPaise: number,
    referenceId: string,
    currentDoc: WalletDoc
  ): void {
    validatePaise(amountPaise, 'amountPaise')
    if (currentDoc.balancePaise < amountPaise) {
      throw new AppError(
        ErrorCodes.INSUFFICIENT_WALLET,
        `Cannot debit wallet: balance ${currentDoc.balancePaise} < amount ${amountPaise}`
      )
    }

    const { activeHolds } = this.cleanActiveHolds(currentDoc)
    delete activeHolds[grp]

    const balanceBeforePaise = currentDoc.balancePaise
    const balanceAfterPaise = balanceBeforePaise - amountPaise

    const isoNow = new Date().toISOString()
    const db = getAdminDb()
    const walletRef = db.collection('wallets').doc(uid)

    firestoreMeter.recordWrite('wallets', uid)
    t.set(
      walletRef,
      {
        balancePaise: balanceAfterPaise,
        activeHolds,
        updatedAt: isoNow,
      },
      { merge: true }
    )

    // Write append-only ledger entry
    const entryId = `spend_${grp}`
    const ledgerRef = walletRef.collection('ledger').doc(entryId)
    const ledgerEntry: LedgerEntry = {
      entryId,
      uid,
      type: 'SPEND',
      amountPaise: -amountPaise,
      balanceBeforePaise,
      balanceAfterPaise,
      referenceId,
      description: `Payment for booking ${referenceId}`,
      createdAt: isoNow,
      schemaVersion: 1,
    }

    firestoreMeter.recordWrite('wallets_ledger', `${uid}_${entryId}`)
    t.set(ledgerRef, ledgerEntry)
  }

  /**
   * Credits wallet with store credit (e.g. from cancellation or admin credit).
   */
  static creditInTx(
    t: FirebaseFirestore.Transaction,
    uid: string,
    amountPaise: number,
    type: LedgerEntryType,
    referenceId: string,
    description: string,
    currentDoc: WalletDoc
  ): void {
    validatePaise(amountPaise, 'credit amountPaise')
    const balanceBeforePaise = currentDoc.balancePaise
    const balanceAfterPaise = balanceBeforePaise + amountPaise
    const { activeHolds } = this.cleanActiveHolds(currentDoc)

    const isoNow = new Date().toISOString()
    const db = getAdminDb()
    const walletRef = db.collection('wallets').doc(uid)

    firestoreMeter.recordWrite('wallets', uid)
    t.set(
      walletRef,
      {
        uid,
        balancePaise: balanceAfterPaise,
        activeHolds,
        updatedAt: isoNow,
        createdAt: currentDoc.createdAt || isoNow,
        schemaVersion: 1,
      },
      { merge: true }
    )

    const entryId = `${type.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    const ledgerRef = walletRef.collection('ledger').doc(entryId)
    const ledgerEntry: LedgerEntry = {
      entryId,
      uid,
      type,
      amountPaise,
      balanceBeforePaise,
      balanceAfterPaise,
      referenceId,
      description,
      createdAt: isoNow,
      schemaVersion: 1,
    }

    firestoreMeter.recordWrite('wallets_ledger', `${uid}_${entryId}`)
    t.set(ledgerRef, ledgerEntry)
  }

  /**
   * Debits wallet directly (e.g. admin debit).
   */
  static debitInTx(
    t: FirebaseFirestore.Transaction,
    uid: string,
    amountPaise: number,
    type: LedgerEntryType,
    referenceId: string,
    description: string,
    currentDoc: WalletDoc
  ): void {
    validatePaise(amountPaise, 'debit amountPaise')
    if (currentDoc.balancePaise < amountPaise) {
      throw new AppError(
        ErrorCodes.INSUFFICIENT_WALLET,
        `Cannot debit: balance ${currentDoc.balancePaise} < amount ${amountPaise}`
      )
    }

    const balanceBeforePaise = currentDoc.balancePaise
    const balanceAfterPaise = balanceBeforePaise - amountPaise
    const { activeHolds } = this.cleanActiveHolds(currentDoc)

    const isoNow = new Date().toISOString()
    const db = getAdminDb()
    const walletRef = db.collection('wallets').doc(uid)

    firestoreMeter.recordWrite('wallets', uid)
    t.set(
      walletRef,
      {
        balancePaise: balanceAfterPaise,
        activeHolds,
        updatedAt: isoNow,
      },
      { merge: true }
    )

    const entryId = `${type.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    const ledgerRef = walletRef.collection('ledger').doc(entryId)
    const ledgerEntry: LedgerEntry = {
      entryId,
      uid,
      type,
      amountPaise: -amountPaise,
      balanceBeforePaise,
      balanceAfterPaise,
      referenceId,
      description,
      createdAt: isoNow,
      schemaVersion: 1,
    }

    firestoreMeter.recordWrite('wallets_ledger', `${uid}_${entryId}`)
    t.set(ledgerRef, ledgerEntry)
  }
}
