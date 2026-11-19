/**
 * Code generation utilities for United 18 Stock
 */

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U'])

/**
 * abbr(word, n) = first letter + the word's remaining consonants in order + then its remaining vowels, cut to n letters, uppercase.
 * English consonants include Y (e.g. Grey -> GRY).
 */
export function abbr(word: string, n: number): string {
  const clean = word.replace(/[^a-zA-Z]/g, '').toUpperCase()
  if (!clean) return ''
  if (clean.length <= 1) return clean

  const firstLetter = clean[0]
  const rest = clean.slice(1)

  const consonants: string[] = []
  const vowels: string[] = []

  for (const char of rest) {
    if (VOWELS.has(char)) {
      vowels.push(char)
    } else {
      consonants.push(char)
    }
  }

  const combined = firstLetter + consonants.join('') + vowels.join('')
  return combined.slice(0, n)
}

/**
 * Type code generator
 * For a multi-word name: first letters of all words except the last, plus abbr(last word, 2).
 * Examples: Pant = PN, Shirt = SH, T-Shirt = TSH, Short Pant = SPN, Jeans = JN, Hoodie = HD, Track Pant = TPN.
 * If the code is already used by another type, lengthen the last word's abbreviation (Short = SHR).
 * If still taken, add a number.
 */
export function generateTypeCode(typeName: string, existingCodes: string[] = []): string {
  const existingSet = new Set(existingCodes.map((c) => c.toUpperCase()))
  // Split on whitespace or hyphens
  const words = typeName.trim().split(/[\s-]+/).filter(Boolean)
  if (words.length === 0) return ''

  if (words.length === 1) {
    const singleWord = words[0]!
    const fullAbbr = abbr(singleWord, singleWord.length)
    for (let n = 2; n <= fullAbbr.length; n++) {
      const candidate = abbr(singleWord, n)
      if (!existingSet.has(candidate)) {
        return candidate
      }
    }
    // If still taken, append number
    const base = abbr(singleWord, 2)
    let counter = 2
    while (existingSet.has(`${base}${counter}`)) {
      counter++
    }
    return `${base}${counter}`
  }

  const prefix = words
    .slice(0, -1)
    .map((w) => w[0]!.toUpperCase())
    .join('')
  const lastWord = words[words.length - 1]!
  const fullLastAbbr = abbr(lastWord, lastWord.length)

  for (let n = 2; n <= fullLastAbbr.length; n++) {
    const candidate = prefix + abbr(lastWord, n)
    if (!existingSet.has(candidate)) {
      return candidate
    }
  }

  // If still taken, append number
  const base = prefix + abbr(lastWord, 2)
  let counter = 2
  while (existingSet.has(`${base}${counter}`)) {
    counter++
  }
  return `${base}${counter}`
}

/**
 * Colour code generator
 * One word -> abbr(word, 3) (Grey = GRY, White = WHT, Green = GRN).
 * Two or more words -> first letters of the earlier words + abbr(last word, 2) (Dark Blue = DBL).
 * No colour -> leave the colour part out ("").
 */
export function generateColourCode(colourName?: string): string {
  if (!colourName) return ''
  const trimmed = colourName.trim()
  if (!trimmed) return ''

  const words = trimmed.split(/[\s-]+/).filter(Boolean)
  if (words.length === 0) return ''

  if (words.length === 1) {
    return abbr(words[0]!, 3)
  }

  const prefix = words
    .slice(0, -1)
    .map((w) => w[0]!.toUpperCase())
    .join('')
  const lastWord = words[words.length - 1]!
  return prefix + abbr(lastWord, 2)
}

/**
 * Item code generator
 * Format: TYPECODE-COLOURCODE-SIZE, e.g. PN-GRY-32, SH-WHT-M, PN-DBL-32, PN-30 (no colour).
 * If two items of the same type get the same code, append -2, -3.
 */
export function generateItemCode(
  typeCode: string,
  colourNameOrCode: string | undefined,
  size: string,
  existingItemCodes: string[] = []
): string {
  const existingSet = new Set(existingItemCodes.map((c) => c.toUpperCase()))
  const upperTypeCode = typeCode.trim().toUpperCase()
  const upperSize = size.trim().toUpperCase()

  let colCode = ''
  if (colourNameOrCode) {
    const trimmedCol = colourNameOrCode.trim()
    // If it's already an abbreviation (e.g. GRY, DBL) or a name, resolve it
    if (trimmedCol.length <= 4 && trimmedCol === trimmedCol.toUpperCase() && !trimmedCol.includes(' ')) {
      colCode = trimmedCol
    } else {
      colCode = generateColourCode(trimmedCol)
    }
  }

  const baseCode = colCode
    ? `${upperTypeCode}-${colCode}-${upperSize}`
    : `${upperTypeCode}-${upperSize}`

  if (!existingSet.has(baseCode)) {
    return baseCode
  }

  let counter = 2
  while (existingSet.has(`${baseCode}-${counter}`)) {
    counter++
  }
  return `${baseCode}-${counter}`
}
