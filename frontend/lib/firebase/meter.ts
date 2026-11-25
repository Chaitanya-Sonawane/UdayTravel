interface MeterCounts {
  reads: number
  writes: number
}

class FirestoreMeter {
  private counts: MeterCounts = { reads: 0, writes: 0 }
  private isDev: boolean = process.env.NODE_ENV !== 'production'

  public recordRead(collection: string, docId?: string): void {
    this.counts.reads += 1
  }

  public recordWrite(collection: string, docId?: string): void {
    this.counts.writes += 1
  }

  public getStats(): Readonly<MeterCounts> {
    return { ...this.counts }
  }

  public resetStats(): void {
    this.counts = { reads: 0, writes: 0 }
  }
}

export const firestoreMeter = new FirestoreMeter()
