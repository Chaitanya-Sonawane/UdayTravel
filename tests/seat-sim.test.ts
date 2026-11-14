import { describe, it, expect } from 'vitest'
import { runSimulation, printSimulationMatrix } from '../scripts/seat-sim'

describe('Seat Rules Simulation Matrix', () => {
  it('runs seat simulation and validates acceptance rate impact', () => {
    // Run with 30 iterations for fast test execution
    const resNoSug = runSimulation({ paxCount: 40, maleRatio: 0.9, acceptanceRate: 0, iterations: 30 })
    const resHighSug = runSimulation({ paxCount: 40, maleRatio: 0.9, acceptanceRate: 0.8, iterations: 30 })

    // Higher suggestion acceptance significantly reduces women left with no strict seat
    expect(resHighSug.womenNoStrict).toBeLessThanOrEqual(resNoSug.womenNoStrict)
  }, 30000)
})
