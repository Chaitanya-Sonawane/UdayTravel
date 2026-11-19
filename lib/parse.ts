/**
 * Voice Stock-Input Parser for United 18 Stock
 * Pure function parsing spoken input into { type, colour, size, qty }
 */

export interface ParseOptions {
  existingTypes?: string[]
  selectedType?: string
}

export interface ParseResult {
  type: string
  colour: string
  size: string
  qty: number
}

// Built-in colour words
const BASE_COLOURS = [
  'black',
  'white',
  'grey',
  'gray',
  'blue',
  'navy',
  'red',
  'maroon',
  'green',
  'olive',
  'brown',
  'beige',
  'cream',
  'khaki',
  'yellow',
  'orange',
  'pink',
  'purple',
  'mustard',
  'cyan',
  'teal',
  'peach',
  'wine',
  'silver',
  'golden',
  'coffee',
  'charcoal',
  'lavender',
]

// Colour modifiers
const MODIFIERS = ['dark', 'light', 'sky', 'royal', 'bottle', 'off', 'pastel']

// Standard size words
const SIZE_WORDS = [
  'xxxl',
  'xxl',
  '3xl',
  '2xl',
  'xl',
  'small',
  'medium',
  'large',
  'free',
  's',
  'm',
  'l',
]

// Filler words to drop
const FILLER_WORDS = new Set([
  'of',
  'in',
  'a',
  'the',
  'colour',
  'color',
  'count',
  'number',
  'nos',
  'and',
  'with',
  'have',
  'has',
  'is',
  'are',
  'quantity',
  'qty',
  'add',
  'stock',
  'new',
])

// Number words 0 to 50
const NUMBER_WORDS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
}

// Helper to convert words like "twenty five" or "thirty" to digits
function replaceNumberWords(text: string): string {
  let result = text

  // Compound numbers 21-49: e.g. "twenty five", "thirty two", "forty eight"
  const tens = ['twenty', 'thirty', 'forty', 'fifty']
  const ones = [
    'one',
    'two',
    'three',
    'four',
    'five',
    'six',
    'seven',
    'eight',
    'nine',
  ]

  for (const t of tens) {
    for (const o of ones) {
      const val = (NUMBER_WORDS[t] || 0) + (NUMBER_WORDS[o] || 0)
      const compoundSpace = new RegExp(`\\b${t}[ -]${o}\\b`, 'gi')
      result = result.replace(compoundSpace, String(val))
    }
  }

  // Single word numbers: e.g. "twenty", "thirty", "five"
  for (const [word, val] of Object.entries(NUMBER_WORDS)) {
    const singleRegex = new RegExp(`\\b${word}\\b`, 'gi')
    result = result.replace(singleRegex, String(val))
  }

  return result
}

/**
 * Format string to Title Case
 */
export function toTitleCase(str: string): string {
  if (!str) return ''
  return str
    .split(' ')
    .filter(Boolean)
    .map((word) => {
      if (word.toLowerCase() === 'tshirt' || word.toLowerCase() === 't-shirt') {
        return 'T-Shirt'
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(' ')
}

/**
 * Singularise a word according to the core rule:
 * singularise the last word (pants -> pant, shirts -> shirt, but keep "jeans", and words ending in "ss" or "us")
 */
export function singularise(word: string): string {
  const lower = word.toLowerCase()
  if (lower === 'jeans') return 'Jeans'
  if (lower.endsWith('ss') || lower.endsWith('us')) {
    return word.charAt(0).toUpperCase() + word.slice(1)
  }
  if (lower.endsWith('s') && lower.length > 2) {
    const cut = word.slice(0, -1)
    return cut.charAt(0).toUpperCase() + cut.slice(1)
  }
  return word.charAt(0).toUpperCase() + word.slice(1)
}

/**
 * Generate type key:
 * join words without spaces or hyphens, and singularise the last word
 */
export function toTypeKey(typeName: string): string {
  const words = typeName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .split(/[\s-]+/)
    .filter(Boolean)

  if (words.length === 0) return ''

  const lastWord = words[words.length - 1]!
  const singLast = singularise(lastWord).toLowerCase()
  words[words.length - 1] = singLast

  return words.join('')
}

/**
 * Format Display Name for a type
 */
export function formatTypeDisplayName(typeName: string): string {
  if (!typeName) return ''
  const words = typeName.trim().split(/[\s-]+/).filter(Boolean)
  if (words.length === 0) return ''

  if (
    words.length === 1 &&
    (words[0]!.toLowerCase() === 'tshirt' || words[0]!.toLowerCase() === 't-shirt')
  ) {
    return 'T-Shirt'
  }

  const lastWord = words[words.length - 1]!
  const singLast = singularise(lastWord)
  words[words.length - 1] = singLast

  return words
    .map((w) => {
      if (w.toLowerCase() === 'tshirt' || w.toLowerCase() === 't') return w.toUpperCase()
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    })
    .join(' ')
}

/**
 * Normalize size representation
 */
function normalizeSize(rawSize: string): string {
  const lower = rawSize.toLowerCase().trim()
  if (lower === 'small') return 'S'
  if (lower === 'medium') return 'M'
  if (lower === 'large') return 'L'
  if (lower === 'free') return 'FREE'
  if (/^\d+$/.test(lower)) return lower
  return lower.toUpperCase()
}

/**
 * Parse a spoken sentence into { type, colour, size, qty }
 */
export function parseSentence(
  input: string,
  options: ParseOptions = {}
): ParseResult {
  const { existingTypes = [], selectedType } = options

  // 1. Lowercase, remove commas and full stops
  let text = input.toLowerCase().replace(/[,.]/g, ' ')

  // 2. Normalise
  // "t shirt", "t-shirt", "tshirt(s)", "tshirts" -> tshirt
  text = text.replace(/\b(t[\s-]shirts?|tshirt\(s\)|tshirts?)\b/g, 'tshirt')
  // "double xl"/"double extra large" -> xxl
  text = text.replace(/\b(double extra large|double xl)\b/g, 'xxl')
  // "extra large" -> xl
  text = text.replace(/\bextra large\b/g, 'xl')
  // "triple xl" -> 3xl
  text = text.replace(/\btriple xl\b/g, '3xl')
  // drop "piece/pieces/pcs"
  text = text.replace(/\b(pieces?|pcs)\b/g, ' ')

  // 3. Convert number words (zero to fifty) to digits
  text = replaceNumberWords(text)

  // Tokenize
  const rawTokens = text.split(/\s+/).filter(Boolean)

  let size = ''
  let sizeIndex = -1
  let sizeWordIndex = -1

  // 4. Size extraction
  // Check if "size" keyword exists
  const sizeKwIdx = rawTokens.findIndex((t) => t === 'size')
  if (sizeKwIdx !== -1 && sizeKwIdx + 1 < rawTokens.length) {
    size = normalizeSize(rawTokens[sizeKwIdx + 1]!)
    sizeKwIdx >= 0 && (sizeWordIndex = sizeKwIdx)
    sizeIndex = sizeKwIdx + 1
  } else {
    // If there is no "size", use a size word
    for (const sw of SIZE_WORDS) {
      const idx = rawTokens.findIndex((t) => t === sw)
      if (idx !== -1) {
        size = normalizeSize(rawTokens[idx]!)
        sizeIndex = idx
        break
      }
    }
  }

  // 5. Count extraction
  // Count: first remaining number.
  // If there is no "size" word and two numbers are given, first = count, second = size.
  let qty = 0
  let countIndex = -1

  if (!size) {
    const numberIndices: number[] = []
    rawTokens.forEach((t, i) => {
      if (/^\d+$/.test(t)) {
        numberIndices.push(i)
      }
    })

    if (numberIndices.length >= 2) {
      countIndex = numberIndices[0]!
      qty = parseInt(rawTokens[countIndex]!, 10)
      sizeIndex = numberIndices[1]!
      size = rawTokens[sizeIndex]!
    } else if (numberIndices.length === 1) {
      countIndex = numberIndices[0]!
      qty = parseInt(rawTokens[countIndex]!, 10)
    }
  } else {
    // Size is already determined. Find the first remaining number for count.
    for (let i = 0; i < rawTokens.length; i++) {
      if (i === sizeIndex || i === sizeWordIndex) continue
      if (/^\d+$/.test(rawTokens[i]!)) {
        qty = parseInt(rawTokens[i]!, 10)
        countIndex = i
        break
      }
    }
  }

  // Indices already consumed
  const consumedIndices = new Set<number>()
  if (sizeIndex !== -1) consumedIndices.add(sizeIndex)
  if (sizeWordIndex !== -1) consumedIndices.add(sizeWordIndex)
  if (countIndex !== -1) consumedIndices.add(countIndex)

  // Remaining tokens after removing consumed indices & filler words
  const remainingTokens: { token: string; originalIndex: number }[] = []
  for (let i = 0; i < rawTokens.length; i++) {
    if (consumedIndices.has(i)) continue
    const tok = rawTokens[i]!
    if (FILLER_WORDS.has(tok) || tok === 'size') continue
    remainingTokens.push({ token: tok, originalIndex: i })
  }

  // 6. Colour extraction
  // Built-in colour words + modifiers
  let colour = ''
  let colourIndices = new Set<number>()

  // Check for modifier + base colour
  for (let i = 0; i < remainingTokens.length - 1; i++) {
    const t1 = remainingTokens[i]!.token
    const t2 = remainingTokens[i + 1]!.token
    if (MODIFIERS.includes(t1) && BASE_COLOURS.includes(t2)) {
      const colName = `${t1} ${t2 === 'gray' ? 'grey' : t2}`
      colour = toTitleCase(colName)
      colourIndices.add(remainingTokens[i]!.originalIndex)
      colourIndices.add(remainingTokens[i + 1]!.originalIndex)
      break
    }
  }

  // If no modifier+colour, check single base colour
  if (!colour) {
    for (let i = 0; i < remainingTokens.length; i++) {
      const t = remainingTokens[i]!.token
      if (BASE_COLOURS.includes(t)) {
        const normalized = t === 'gray' ? 'grey' : t
        colour = toTitleCase(normalized)
        colourIndices.add(remainingTokens[i]!.originalIndex)
        break
      }
    }
  }

  // Remaining tokens for type determination
  const tokensForType = remainingTokens
    .filter((rt) => !colourIndices.has(rt.originalIndex))
    .map((rt) => rt.token)

  let type = ''

  // If colour was NOT found in the built-in list:
  // "try the longest leading words that match an existing type; the words after it are the colour"
  if (!colour && existingTypes.length > 0) {
    const normalisedExisting = existingTypes.map((et) => ({
      raw: et,
      key: toTypeKey(et),
      display: formatTypeDisplayName(et),
    }))

    // Try longest leading matches
    for (let len = tokensForType.length; len >= 1; len--) {
      const candidateWords = tokensForType.slice(0, len)
      const candidateKey = toTypeKey(candidateWords.join(' '))
      const match = normalisedExisting.find((et) => et.key === candidateKey)
      if (match) {
        type = match.display
        const trailing = tokensForType.slice(len)
        if (trailing.length > 0) {
          colour = toTitleCase(trailing.join(' '))
        }
        break
      }
    }
  }

  // If type is still empty:
  if (!type) {
    if (tokensForType.length > 0) {
      // If no known colour word was found and no existing type matched:
      // "For a brand-new type with an unknown colour, put all words in Type and leave Colour empty for the owner to fix."
      type = formatTypeDisplayName(tokensForType.join(' '))
    } else if (selectedType) {
      // "If no type word is said and a type is selected in the sidebar, use the selected type."
      type = formatTypeDisplayName(selectedType)
    }
  }

  return {
    type,
    colour,
    size,
    qty,
  }
}
