export const lurePatterns = [
  {
    id: 'texas-rig',
    name: 'Texas Rig',
    category: 'soft-plastic',
    description: 'Weedless soft plastic rig ideal for heavy cover.',
    bestConditions: ['clear_warm', 'post_front', 'calm'],
    targetDepth: '2–20 ft',
    seasons: ['spring', 'summer', 'fall'],
  },
  {
    id: 'drop-shot',
    name: 'Drop Shot',
    category: 'finesse',
    description: 'Suspended soft plastic above the bottom for finicky fish.',
    bestConditions: ['post_front', 'calm', 'clear_warm'],
    targetDepth: '10–40 ft',
    seasons: ['summer', 'winter', 'fall'],
  },
  {
    id: 'spinnerbait',
    name: 'Spinnerbait',
    category: 'reaction',
    description: 'Bladed reaction bait that excels in stained water and wind.',
    bestConditions: ['overcast', 'windy', 'pre_front'],
    targetDepth: '1–10 ft',
    seasons: ['spring', 'fall'],
  },
  {
    id: 'topwater',
    name: 'Topwater Popper',
    category: 'topwater',
    description: 'Surface lure for explosive early-morning strikes.',
    bestConditions: ['calm', 'overcast'],
    targetDepth: 'Surface',
    seasons: ['spring', 'summer', 'fall'],
  },
  {
    id: 'crankbait',
    name: 'Deep Crankbait',
    category: 'hardlure',
    description: 'Dives 15–20 ft to work ledges and main-lake structure.',
    bestConditions: ['clear_warm', 'overcast'],
    targetDepth: '15–25 ft',
    seasons: ['summer', 'fall'],
  },
  {
    id: 'jig',
    name: 'Football Jig',
    category: 'jig',
    description: 'Crawls along rocky bottom; triggers reaction strikes.',
    bestConditions: ['clear_warm', 'post_front'],
    targetDepth: '10–30 ft',
    seasons: ['summer', 'fall', 'winter'],
  },
  {
    id: 'swimbait',
    name: 'Paddle Tail Swimbait',
    category: 'soft-plastic',
    description: 'Realistic baitfish profile for pressured or schooling bass.',
    bestConditions: ['overcast', 'windy', 'pre_front'],
    targetDepth: '3–15 ft',
    seasons: ['spring', 'summer', 'fall'],
  },
  {
    id: 'shaky-head',
    name: 'Shaky Head',
    category: 'finesse',
    description: 'Subtle finesse rig for cold fronts and tough bites.',
    bestConditions: ['post_front', 'calm'],
    targetDepth: '5–20 ft',
    seasons: ['fall', 'winter', 'spring'],
  },
]

export function getPatternsForCondition(condition) {
  return lurePatterns.filter((p) => p.bestConditions.includes(condition))
}

export function getPatternsForSeason(season) {
  return lurePatterns.filter((p) => p.seasons.includes(season))
}

export function getPatternById(id) {
  return lurePatterns.find((p) => p.id === id) || null
}

export const categoryColors = {
  'soft-plastic': '#c8a030',
  finesse: '#00cc66',
  reaction: '#f0c84a',
  topwater: '#60a5fa',
  hardlure: '#f87171',
  jig: '#a08040',
}
