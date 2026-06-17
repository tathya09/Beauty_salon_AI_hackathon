export interface FaceQualityMetrics {
  brightness: number
  contrast: number
  sharpness: number
  faceCoverage: number
}

export interface FaceQualityReview {
  score: number
  label: 'Excellent' | 'Good' | 'Fair' | 'Low'
  notes: string[]
}

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value))

function computeBrightness(imageData: ImageData) {
  let sum = 0
  for (let i = 0; i < imageData.data.length; i += 4) {
    const r = imageData.data[i]
    const g = imageData.data[i + 1]
    const b = imageData.data[i + 2]
    sum += (r + g + b) / 3
  }
  return sum / (imageData.data.length / 4) / 255
}

function computeContrast(imageData: ImageData) {
  let mean = 0
  const pixels = imageData.data.length / 4
  for (let i = 0; i < imageData.data.length; i += 4) {
    const value = (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3
    mean += value
  }
  mean /= pixels

  let variance = 0
  for (let i = 0; i < imageData.data.length; i += 4) {
    const value = (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3
    variance += (value - mean) ** 2
  }
  variance /= pixels
  return clamp(Math.sqrt(variance) / 255)
}

function computeSharpness(imageData: ImageData) {
  let total = 0
  const width = imageData.width
  const height = imageData.height

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const left = (y * width + (x - 1)) * 4
      const right = (y * width + (x + 1)) * 4
      const up = ((y - 1) * width + x) * 4
      const down = ((y + 1) * width + x) * 4

      const gradX = Math.abs(
        ((imageData.data[left] + imageData.data[left + 1] + imageData.data[left + 2]) / 3) -
        ((imageData.data[right] + imageData.data[right + 1] + imageData.data[right + 2]) / 3)
      )
      const gradY = Math.abs(
        ((imageData.data[up] + imageData.data[up + 1] + imageData.data[up + 2]) / 3) -
        ((imageData.data[down] + imageData.data[down + 1] + imageData.data[down + 2]) / 3)
      )
      total += Math.sqrt(gradX * gradX + gradY * gradY)
    }
  }

  const average = total / ((width - 2) * (height - 2))
  return clamp(average / 75)
}

export function computeQualityReview(metrics: FaceQualityMetrics): FaceQualityReview {
  const brightnessScore = 1 - Math.abs(metrics.brightness - 0.5) * 2
  const contrastScore = metrics.contrast
  const sharpnessScore = metrics.sharpness
  const coverageScore = metrics.faceCoverage

  const score = Math.round(
    clamp(
      brightnessScore * 0.3 + contrastScore * 0.2 + sharpnessScore * 0.3 + coverageScore * 0.2,
      0,
      1,
    ) * 100,
  )

  const notes: string[] = []
  if (metrics.brightness < 0.35) notes.push('Lighting looks slightly dim.')
  else if (metrics.brightness > 0.75) notes.push('Lighting looks a bit bright.')
  else notes.push('Lighting looks balanced.')

  if (metrics.sharpness < 0.45) notes.push('The image may need a sharper capture.')
  if (metrics.faceCoverage < 0.6) notes.push('The face is not fully centered in the frame.')
  if (notes.length === 0) notes.push('Overall framing looks strong.')

  let label: FaceQualityReview['label'] = 'Low'
  if (score >= 85) label = 'Excellent'
  else if (score >= 70) label = 'Good'
  else if (score >= 50) label = 'Fair'

  return { score, label, notes }
}

function adjustBrightnessAndContrast(imageData: ImageData, brightnessShift = 10, contrastFactor = 1.1) {
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    data[i] = clamp((data[i] - 128) * contrastFactor + 128 + brightnessShift, 0, 255)
    data[i + 1] = clamp((data[i + 1] - 128) * contrastFactor + 128 + brightnessShift, 0, 255)
    data[i + 2] = clamp((data[i + 2] - 128) * contrastFactor + 128 + brightnessShift, 0, 255)
  }
  return imageData
}

export async function preprocessFaceImage(dataUrl: string) {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Failed to load image.'))
    image.src = dataUrl
  })

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas is not supported in this browser.')
  }

  const width = img.naturalWidth
  const height = img.naturalHeight
  const cropSize = Math.min(width, height)
  const x = Math.floor((width - cropSize) / 2)
  const y = Math.floor((height - cropSize) / 2)

  const outputSize = 900
  canvas.width = outputSize
  canvas.height = outputSize

  ctx.drawImage(img, x, y, cropSize, cropSize, 0, 0, outputSize, outputSize)

  const original = ctx.getImageData(0, 0, outputSize, outputSize)
  const normalized = adjustBrightnessAndContrast(original)
  ctx.putImageData(normalized, 0, 0)

  const normalizedDataUrl = canvas.toDataURL('image/jpeg', 0.92)

  const faceCoverage = clamp(
    Math.min(
      (outputSize * 0.6) / Math.max(width, height),
      1,
    ) * 0.8 + 0.2,
  )

  const qualityMetrics: FaceQualityMetrics = {
    brightness: computeBrightness(normalized),
    contrast: computeContrast(normalized),
    sharpness: computeSharpness(normalized),
    faceCoverage,
  }

  return {
    dataUrl: normalizedDataUrl,
    quality: computeQualityReview(qualityMetrics),
  }
}
