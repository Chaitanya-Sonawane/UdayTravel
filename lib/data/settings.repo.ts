import { getAdminDb } from '../firebase/admin'
import { firestoreMeter } from '../firebase/meter'

export interface BusinessSettings {
  companyName: string
  contactPhone: string
  supportEmail: string
  address: string
  farePerSeat: number
  cancellationPolicy: {
    ahmednagarToPuneCutoffHours: number
    puneToAhmednagarSameDayAllowed: boolean
  }
  upiId: string
  emergencyHelpline: string
  updatedAt: string
}

export const DEFAULT_SETTINGS: BusinessSettings = {
  companyName: 'Uday Travels',
  contactPhone: '+91 98900 66580',
  supportEmail: 'care@udaytravel.in',
  address: 'Shop No 1, Near Old Bus Stand, Ahilyanagar, Maharashtra 414001',
  farePerSeat: 200,
  cancellationPolicy: {
    ahmednagarToPuneCutoffHours: 20, // 8:00 PM previous day
    puneToAhmednagarSameDayAllowed: false,
  },
  upiId: 'udaytravels@upi',
  emergencyHelpline: '1800-209-8329',
  updatedAt: new Date().toISOString(),
}

export class SettingsRepository {
  private static collectionName = 'settings'
  private static docId = 'business'

  static async getSettings(): Promise<BusinessSettings> {
    firestoreMeter.recordRead(this.collectionName, this.docId)
    const db = getAdminDb()
    try {
      const snap = await db.collection(this.collectionName).doc(this.docId).get()
      if (!snap.exists) {
        await this.updateSettings(DEFAULT_SETTINGS)
        return DEFAULT_SETTINGS
      }
      return snap.data() as BusinessSettings
    } catch (err) {
      console.warn('[SettingsRepository] getSettings failed, using defaults:', err)
      return DEFAULT_SETTINGS
    }
  }

  static async updateSettings(settings: Partial<BusinessSettings>): Promise<void> {
    firestoreMeter.recordWrite(this.collectionName, this.docId)
    const db = getAdminDb()
    const now = new Date().toISOString()
    await db.collection(this.collectionName).doc(this.docId).set(
      {
        ...DEFAULT_SETTINGS,
        ...settings,
        updatedAt: now,
      },
      { merge: true }
    )
  }
}
