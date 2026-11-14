interface MeterCounts {
  reads: number
  writes: number
}

class FirestoreMeter {
  private counts: MeterCounts = { reads: 0, writes: 0 }
  private isDev: boolean = process.env.NODE_ENV !== 'production'

  public recordRead(collection: string, docId?: string): void {
    if (!this.isDev) return
    this.counts.reads += 1
    console.info(
      `[Firestore Meter] READ (#${this.counts.reads}) -> ${collection}/${docId ?? '*'} | Total session reads: ${this.counts.reads} / 50,000 daily budget`
    )
  }

  public recordWrite(collection: string, docId?: string): void {
    if (!this.isDev) return
    this.counts.writes += 1
    console.info(
      `[Firestore Meter] WRITE (#${this.counts.writes}) -> ${collection}/${docId ?? '*'} | Total session writes: ${this.counts.writes} / 20,000 daily budget`
    )
  }

  public getStats(): Readonly<MeterCounts> {
    return { ...this.counts }
  }

  public resetStats(): void {
    this.counts = { reads: 0, writes: 0 }
  }
}

export const firestoreMeter = new FirestoreMeter()
