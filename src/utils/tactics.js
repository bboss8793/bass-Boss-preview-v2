export const seasons = {
  spring: { months: [2, 3, 4], label: 'Spring' },
  summer: { months: [5, 6, 7], label: 'Summer' },
  fall: { months: [8, 9, 10], label: 'Fall' },
  winter: { months: [11, 0, 1], label: 'Winter' },
}

export function getCurrentSeason(date = new Date()) {
  const m = date.getMonth()
  return Object.entries(seasons).find(([, v]) => v.months.includes(m))?.[0] ?? 'summer'
}

export const tacticsByCondition = {
  clear_warm: [
    'Target deep structure (8–15 ft) mid-day — bass retreat to shade and cooler temps.',
    'Work topwater lures early morning and late evening near grass edges.',
    'Slow down presentations; finesse rigs outperform power baits.',
  ],
  overcast: [
    'Bass roam shallower and feed aggressively — cover water quickly.',
    'Chatterbaits and swimbaits along flats are deadly under cloud cover.',
    'Reaction baits shine; keep moving until you locate the school.',
  ],
  post_front: [
    'Slow way down — shaky heads and drop shots in 10–20 ft of water.',
    'Target the last piece of cover before the drop-off.',
    'Downsize line and lures; use finesse tactics for 24–48 hours.',
  ],
  pre_front: [
    'One of the best feeding windows of the year — throw big baits.',
    'Spinnerbaits and swimbaits through any available cover.',
    'Expect aggressive strikes; capitalize on the feeding frenzy.',
  ],
  windy: [
    'Fish windblown points and banks — baitfish pile up there.',
    'Lipless crankbaits and bladed jigs cut through chop.',
    'Position upwind and drift into structure naturally.',
  ],
  calm: [
    'Stealth is critical — use light line and subtle presentations.',
    'Look for subtle surface disturbances indicating feeding fish.',
    'Ned rigs and wacky-rigged Senkos excel in calm glassy conditions.',
  ],
}

export const seasonTactics = {
  spring: [
    'Pre-spawn bass stage on points and secondary structure in 8–15 ft.',
    'Spawn: look for beds in 1–6 ft on hard bottom near cover.',
    'Post-spawn females recuperate deep; target males guarding fry.',
    'Soft plastics in natural colors — crawfish patterns dominate.',
  ],
  summer: [
    'Early morning topwater on main-lake points and flats.',
    'Mid-day: deep water structure, humps, and ledges 15–30 ft.',
    'Swimbaits and deep-diving crankbaits near creek channel bends.',
    'Night fishing with dark-colored lures around dock lights.',
  ],
  fall: [
    'Bass chase shad shallower as water cools — great topwater season.',
    'Match the hatch: chrome, white, and shad-pattern lures.',
    'Squarebill crankbaits through shallow cover on feeding flats.',
    'Moving baits cover more water and locate active schools fast.',
  ],
  winter: [
    'Slow down dramatically — bass are lethargic in cold water.',
    'Blade baits and jigging spoons on main-lake structure 20–40 ft.',
    'Suspending jerkbaits on long pauses can be lethal.',
    'Mid-day when water warms even slightly offers best activity.',
  ],
}

export function getTacticsForConditions(condition) {
  return tacticsByCondition[condition] || tacticsByCondition.calm
}

export function getSeasonTactics(season) {
  return seasonTactics[season] || seasonTactics.summer
}
