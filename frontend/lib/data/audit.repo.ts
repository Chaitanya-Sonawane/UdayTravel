import { getAdminDb } from '../firebase/admin'
import { firestoreMeter } from '../firebase/meter'

export interface AuditLogDoc {
  auditId: string
  action: string
  performedBy: string
  targetId?: string
  details: Record<string, unknown>
  timestamp: string
}

export class AuditRepository {
  static async log(
    action: string,
    performedBy: string,
    details: Record<string, unknown>,
    targetId?: string
  ): Promise<void> {
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    firestoreMeter.recordWrite('audit_logs', auditId)

    const doc: AuditLogDoc = {
      auditId,
      action,
      performedBy,
      targetId,
      details,
      timestamp: new Date().toISOString(),
    }

    const db = getAdminDb()
    await db.collection('audit_logs').doc(auditId).set(doc)
  }
}
