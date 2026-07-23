const ADJECTIVES = [
  'Largemouth', 'Bronzeback', 'Spotted', 'Smallmouth', 'Bucketmouth',
  'Hawg', 'Trophy', 'Lunker', 'Kicker', 'Hawkbill',
]
const NOUNS = [
  'Bass', 'Slayer', 'Hunter', 'Angler', 'Crusher',
  'Fisher', 'Catcher', 'Master', 'Chaser', 'Warrior',
]

export function generateVerifyCode() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  const num = Math.floor(100 + Math.random() * 900)
  return `${adj}${noun}${num}`
}

export function validateCode(input, expected) {
  return input.trim().toLowerCase() === expected.trim().toLowerCase()
}

export function obfuscateCode(code) {
  if (code.length <= 4) return '****'
  return code.slice(0, 2) + '*'.repeat(code.length - 4) + code.slice(-2)
}
