import {
  ALL_SEAT_IDS,
  SeatState,
  Gender,
  levelFor,
  lowestAvailableLevel,
  evaluate,
  suggestSeats,
} from '../lib/domain/seats/rules'
import { SEATS_TOTAL } from '../lib/config/seat-rules'

interface SimConfig {
  paxCount: number
  maleRatio: number
  acceptanceRate: number
  iterations?: number
}

interface SimResult {
  paxCount: number
  maleRatio: number
  acceptanceRate: number
  levelCounts: {
    'Level 0': number
    'Level 1': number
    'Level 2': number
    OPEN: number
    Rejected: number
  }
  womenNoStrict: number
  menNoStrict: number
  womenTotal: number
  menTotal: number
  unsoldSeats: number
}

export function runSimulation(config: SimConfig): SimResult {
  const { paxCount, maleRatio, acceptanceRate, iterations = 200 } = config
  const departureAt = 1_800_000_000_000
  const bookingTime = departureAt - 24 * 60 * 60 * 1000 // T-24h (strict booking window)

  let totalWomenNoStrict = 0
  let totalMenNoStrict = 0
  let totalWomen = 0
  let totalMen = 0
  let totalUnsold = 0
  const levelCounts: Record<string, number> = {
    'Level 0': 0,
    'Level 1': 0,
    'Level 2': 0,
    OPEN: 0,
    Rejected: 0,
  }

  for (let it = 0; it < iterations; it++) {
    const seats: Record<string, SeatState> = {}

    // Generate passengers with gender mix and window preference
    for (let pIdx = 0; pIdx < paxCount; pIdx++) {
      const isMale = Math.random() < maleRatio
      const gender: Gender = isMale ? 'M' : 'F'
      const age = 20 + Math.floor(Math.random() * 40)
      const wantsWindow = Math.random() < 0.7 // 70% prefer window

      if (gender === 'F') totalWomen++
      else totalMen++

      const acceptsSuggestion = Math.random() < acceptanceRate
      let chosenSeatId: string | null = null

      if (acceptsSuggestion) {
        const suggestions = suggestSeats(
          seats,
          {
            family: false,
            pax: [
              {
                gender,
                age,
                prefs: { seatType: wantsWindow ? 'window' : 'any' },
              },
            ],
          },
          bookingTime,
          departureAt
        )
        if (suggestions.length > 0 && suggestions[0]?.seatIds[0]) {
          chosenSeatId = suggestions[0].seatIds[0]
        }
      }

      // If no suggestion accepted or available, pick manually from lowest available level
      if (!chosenSeatId) {
        const minLvl = lowestAvailableLevel(seats, gender, bookingTime, departureAt)
        const candidates = ALL_SEAT_IDS.filter((sId) => {
          const lvl = levelFor(seats, sId, gender, bookingTime, departureAt)
          return lvl === minLvl
        })

        if (candidates.length > 0) {
          if (wantsWindow) {
            const windowCandidates = candidates.filter((sId) =>
              sId.endsWith('1') || sId.endsWith('5')
            )
            if (windowCandidates.length > 0) {
              const pick = windowCandidates[Math.floor(Math.random() * windowCandidates.length)]
              if (pick) chosenSeatId = pick
            }
          }
          if (!chosenSeatId) {
            const pick = candidates[Math.floor(Math.random() * candidates.length)]
            if (pick) chosenSeatId = pick
          }
        }
      }

      if (!chosenSeatId) {
        levelCounts.Rejected = (levelCounts.Rejected || 0) + 1
        if (gender === 'F') totalWomenNoStrict++
        else totalMenNoStrict++
        continue
      }

      // Evaluate the pick
      const evalRes = evaluate(
        seats,
        {
          family: false,
          acceptAdjacent: true,
          pax: [{ seatId: chosenSeatId, gender, age }],
        },
        bookingTime,
        departureAt
      )

      if (evalRes.ok) {
        const lvl = evalRes.levels[chosenSeatId]
        if (lvl === 0) {
          levelCounts['Level 0'] = (levelCounts['Level 0'] || 0) + 1
        } else if (lvl === 1) {
          levelCounts['Level 1'] = (levelCounts['Level 1'] || 0) + 1
          if (gender === 'F') totalWomenNoStrict++
          else totalMenNoStrict++
        } else if (lvl === 2) {
          levelCounts['Level 2'] = (levelCounts['Level 2'] || 0) + 1
          if (gender === 'F') totalWomenNoStrict++
          else totalMenNoStrict++
        } else {
          levelCounts.OPEN = (levelCounts.OPEN || 0) + 1
        }

        // Commit seat
        seats[chosenSeatId] = {
          state: 'CONFIRMED',
          gender,
          level: typeof lvl === 'number' ? lvl : 0,
        }
      } else {
        levelCounts.Rejected = (levelCounts.Rejected || 0) + 1
        if (gender === 'F') totalWomenNoStrict++
        else totalMenNoStrict++
      }
    }

    const takenInSim = Object.values(seats).filter((s) => s.state === 'CONFIRMED').length
    totalUnsold += SEATS_TOTAL - takenInSim
  }

  return {
    paxCount,
    maleRatio,
    acceptanceRate,
    levelCounts: {
      'Level 0': Math.round((levelCounts['Level 0'] || 0) / iterations),
      'Level 1': Math.round((levelCounts['Level 1'] || 0) / iterations),
      'Level 2': Math.round((levelCounts['Level 2'] || 0) / iterations),
      OPEN: Math.round((levelCounts.OPEN || 0) / iterations),
      Rejected: Math.round((levelCounts.Rejected || 0) / iterations),
    },
    womenNoStrict: parseFloat(((totalWomenNoStrict / (totalWomen || 1)) * 100).toFixed(1)),
    menNoStrict: parseFloat(((totalMenNoStrict / (totalMen || 1)) * 100).toFixed(1)),
    womenTotal: Math.round(totalWomen / iterations),
    menTotal: Math.round(totalMen / iterations),
    unsoldSeats: Math.round(totalUnsold / iterations),
  }
}

export function printSimulationMatrix() {
  console.log('='.repeat(80))
  console.log('UDAY TRAVELS - SEAT RULES ENGINE SIMULATION')
  console.log('Coach: 50 seats (Rows A-J, 2+3 layout), Window Pref: 70%')
  console.log('='.repeat(80))

  const scenarios: SimConfig[] = [
    // 40 pax (80% full), 90% men
    { paxCount: 40, maleRatio: 0.9, acceptanceRate: 0 },
    { paxCount: 40, maleRatio: 0.9, acceptanceRate: 0.5 },
    { paxCount: 40, maleRatio: 0.9, acceptanceRate: 0.8 },

    // 50 pax (100% full), 70% men
    { paxCount: 50, maleRatio: 0.7, acceptanceRate: 0 },
    { paxCount: 50, maleRatio: 0.7, acceptanceRate: 0.5 },
    { paxCount: 50, maleRatio: 0.7, acceptanceRate: 0.8 },

    // 50 pax (100% full), 50% men
    { paxCount: 50, maleRatio: 0.5, acceptanceRate: 0 },
    { paxCount: 50, maleRatio: 0.5, acceptanceRate: 0.5 },
    { paxCount: 50, maleRatio: 0.5, acceptanceRate: 0.8 },
  ]

  console.log(
    'Pax | Mix (M/F) | Sug Accept | Women No Strict | Men No Strict | Level 0 | Level 1 | Level 2 | Unsold'
  )
  console.log('-'.repeat(80))

  for (const sc of scenarios) {
    const res = runSimulation(sc)
    const mixStr = `${Math.round(sc.maleRatio * 100)}/${Math.round((1 - sc.maleRatio) * 100)}`
    const acceptStr = `${Math.round(sc.acceptanceRate * 100)}%`
    console.log(
      `${sc.paxCount.toString().padEnd(3)} | ${mixStr.padEnd(9)} | ${acceptStr.padEnd(10)} | ` +
        `${(res.womenNoStrict + '%').padEnd(15)} | ${(res.menNoStrict + '%').padEnd(13)} | ` +
        `${res.levelCounts['Level 0'].toString().padEnd(7)} | ${res.levelCounts['Level 1'].toString().padEnd(7)} | ` +
        `${res.levelCounts['Level 2'].toString().padEnd(7)} | ${res.unsoldSeats}`
    )
  }
  console.log('='.repeat(80))
}

// Run if called directly or in vitest
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('seat-sim')) {
  printSimulationMatrix()
}
