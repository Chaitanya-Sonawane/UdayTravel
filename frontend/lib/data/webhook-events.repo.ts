import { getAdminDb } from '../firebase/admin'
import { firestoreMeter } from '../firebase/meter'

export interface WebhookEventDoc {
  eventId: string
  event: string
  processedAt: string
  status: 'PROCESSED' | 'FAILED'
  error?: string
  schemaVersion: number
}

export class WebhookEventsRepository {
  /**
   * Atomically records a webhook event. Returns true if newly created; false if already processed (deduplicated).
   */
  static async recordEventIfNew(
    eventId: string,
    event: string
  ): Promise<boolean> {
    const db = getAdminDb()
    firestoreMeter.recordWrite('webhook_events', eventId)

    const doc: WebhookEventDoc = {
      eventId,
      event,
      processedAt: new Date().toISOString(),
      status: 'PROCESSED',
      schemaVersion: 1,
    }

    try {
      await db.collection('webhook_events').doc(eventId).create(doc)
      return true
    } catch (err: unknown) {
      const errorObj = err as { code?: number | string; message?: string }
      const isAlreadyExists =
        errorObj.code === 6 ||
        errorObj.code === 'already-exists' ||
        (typeof errorObj.message === 'string' && errorObj.message.includes('ALREADY_EXISTS'))

      if (isAlreadyExists) {
        return false // Duplicate event, skip processing
      }
      throw err
    }
  }
}
