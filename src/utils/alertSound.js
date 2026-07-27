let audioCtx = null

function getAudioCtx() {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)() }
    catch { return null }
  }
  return audioCtx
}

export function playAlertSound() {
  const ctx = getAudioCtx()
  if (!ctx) return
  if (ctx.state === 'suspended') ctx.resume()
  const now = ctx.currentTime

  const notes = [880, 1100, 880]
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.value = freq
    const start = now + i * 0.25
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(0.3, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2)
    osc.start(start)
    osc.stop(start + 0.2)
  })
}

export const ALERT_MILESTONES = [
  { secs: 1800, label: '30 minutes remaining', alert: true },
  { secs: 900, label: '15 minutes remaining', alert: true },
  { secs: 300, label: '5 minutes remaining', alert: true },
]
