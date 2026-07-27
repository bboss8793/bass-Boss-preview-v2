export async function createBrandedImage(photoBlob, { weight, lakeName, length }) {
  const bitmap = await createImageBitmap(photoBlob)
  const w = bitmap.width
  const h = bitmap.height

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')

  ctx.drawImage(bitmap, 0, 0)

  const barH = Math.round(h * 0.13)
  const gradient = ctx.createLinearGradient(0, h - barH, 0, h)
  gradient.addColorStop(0, 'rgba(10, 9, 0, 0)')
  gradient.addColorStop(0.35, 'rgba(10, 9, 0, 0.75)')
  gradient.addColorStop(1, 'rgba(10, 9, 0, 0.95)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, h - barH, w, barH)

  const pad = Math.round(w * 0.04)
  const gold = '#f0c84a'
  const text = '#f0e8c8'

  const bigSize = Math.round(h * 0.052)
  ctx.font = `bold ${bigSize}px Barlow, sans-serif`
  ctx.fillStyle = gold
  ctx.textBaseline = 'alphabetic'
  const weightLabel = weight ? `${weight} lb` : ''
  if (weightLabel) {
    ctx.fillText(weightLabel, pad, h - pad - Math.round(h * 0.012))
  }

  if (length) {
    const lenSize = Math.round(h * 0.03)
    ctx.font = `${lenSize}px Barlow, sans-serif`
    ctx.fillStyle = text
    ctx.fillText(`${length}"`, pad + ctx.measureText(weightLabel).width + Math.round(w * 0.02), h - pad - Math.round(h * 0.012))
  }

  const lakeSize = Math.round(h * 0.03)
  ctx.font = `${lakeSize}px Barlow, sans-serif`
  ctx.fillStyle = text
  ctx.textAlign = 'right'
  ctx.fillText(lakeName || '', w - pad, h - pad - Math.round(h * 0.012))
  ctx.textAlign = 'left'

  const wmSize = Math.round(h * 0.022)
  ctx.font = `bold ${wmSize}px Barlow, sans-serif`
  ctx.fillStyle = 'rgba(240, 200, 74, 0.85)'
  ctx.fillText('BASS BOSS', pad, pad + wmSize)

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92))
  bitmap.close()
  return blob
}

export async function shareCatch(brandedBlob, fileName = 'bass-boss-catch.jpg') {
  const file = new File([brandedBlob], fileName, { type: 'image/jpeg' })
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title: 'My Bass Boss Catch' })
    return true
  }
  const url = URL.createObjectURL(brandedBlob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return false
}
