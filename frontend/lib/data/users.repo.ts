import { getAdminDb } from '../firebase/admin'
import { firestoreMeter } from '../firebase/meter'
import { UserProfile, AccountCreateInput, SavedPassenger } from '../schema/account'

export class UsersRepository {
  private static collectionName = 'users'

  static async getUser(uid: string): Promise<UserProfile | null> {
    firestoreMeter.recordRead(this.collectionName, uid)
    const db = getAdminDb()
    const docSnap = await db.collection(this.collectionName).doc(uid).get()
    if (!docSnap.exists) {
      return null
    }
    const data = docSnap.data() as UserProfile
    return {
      ...data,
      uid,
      savedPassengers: data.savedPassengers || [],
    }
  }

  static async createUser(uid: string, input: AccountCreateInput): Promise<UserProfile> {
    firestoreMeter.recordWrite(this.collectionName, uid)
    const db = getAdminDb()
    const now = new Date().toISOString()

    const initialSavedPassenger: SavedPassenger = {
      id: `sp_self_${uid}`,
      name: input.name,
      age: input.age,
      gender: input.gender,
      isSelf: true,
    }

    const savedPassengers: SavedPassenger[] = input.savedPassengers && input.savedPassengers.length > 0
      ? input.savedPassengers
      : [initialSavedPassenger]

    const profileData: Omit<UserProfile, 'uid'> = {
      name: input.name,
      mobile: input.mobile,
      age: input.age,
      gender: input.gender,
      email: input.email || '',
      savedPassengers,
      createdAt: now,
      updatedAt: now,
    }

    await db.collection(this.collectionName).doc(uid).set(profileData, { merge: true })

    return {
      uid,
      ...profileData,
    }
  }

  static async updateUser(uid: string, updates: Partial<UserProfile>): Promise<void> {
    firestoreMeter.recordWrite(this.collectionName, uid)
    const db = getAdminDb()
    const now = new Date().toISOString()
    await db.collection(this.collectionName).doc(uid).set(
      {
        ...updates,
        updatedAt: now,
      },
      { merge: true }
    )
  }

  static async getSavedPassengers(uid: string): Promise<SavedPassenger[]> {
    const user = await this.getUser(uid)
    return user?.savedPassengers || []
  }

  static async addSavedPassenger(
    uid: string,
    passenger: Omit<SavedPassenger, 'id'> & { id?: string }
  ): Promise<SavedPassenger[]> {
    const user = await this.getUser(uid)
    const currentList = user?.savedPassengers || []

    const newId = passenger.id || `sp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    const newPassenger: SavedPassenger = {
      id: newId,
      name: passenger.name.trim(),
      age: Number(passenger.age),
      gender: passenger.gender,
      isSelf: passenger.isSelf || false,
    }

    // Replace if exists, else append
    const existingIndex = currentList.findIndex(
      (p) => p.id === newId || (p.name.toLowerCase() === newPassenger.name.toLowerCase() && p.gender === newPassenger.gender)
    )

    let updatedList: SavedPassenger[]
    if (existingIndex >= 0) {
      updatedList = [...currentList]
      updatedList[existingIndex] = { ...updatedList[existingIndex], ...newPassenger }
    } else {
      updatedList = [...currentList, newPassenger]
    }

    await this.updateUser(uid, { savedPassengers: updatedList })
    return updatedList
  }

  static async removeSavedPassenger(uid: string, passengerId: string): Promise<SavedPassenger[]> {
    const user = await this.getUser(uid)
    const currentList = user?.savedPassengers || []
    const updatedList = currentList.filter((p) => p.id !== passengerId)

    await this.updateUser(uid, { savedPassengers: updatedList })
    return updatedList
  }
}
