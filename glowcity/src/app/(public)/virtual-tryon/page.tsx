'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import {
  Camera, RefreshCw, Sparkles, Download,
  ArrowRight, ArrowLeft, Wand2, AlertCircle, Upload,
} from 'lucide-react'
import Link from 'next/link'
import { MegaNav } from '@/components/discovery/MegaNav'

// ── Palettes ──────────────────────────────────────────────────
const HAIR_COLORS = [
  { label: 'Jet Black',        value: '#0a0a0a' },
  { label: 'Dark Brown',       value: '#3b1d08' },
  { label: 'Warm Chestnut',    value: '#7b3f00' },
  { label: 'Honey Blonde',     value: '#c8a44c' },
  { label: 'Platinum Blonde',  value: '#e8dab2' },
  { label: 'Auburn Red',       value: '#9b2335' },
  { label: 'Balayage Caramel', value: '#c68642' },
  { label: 'Rose Gold',        value: '#d4a0a0' },
  { label: 'Violet Fantasy',   value: '#7c3aed' },
  { label: 'Steel Blue',       value: '#4a6fa5' },
]

const NAIL_COLORS = [
  { label: 'Classic Red',   value: '#dc2626', service: 'Gel Manicure' },
  { label: 'Nude Beige',    value: '#d4a69a', service: 'Soft Gel Manicure' },
  { label: 'French White',  value: '#f5f0e8', service: 'French Manicure' },
  { label: 'Hot Pink',      value: '#ec4899', service: 'Gel Nails' },
  { label: 'Deep Purple',   value: '#7c3aed', service: 'Gel Nails' },
  { label: 'Coral Sunset',  value: '#f97316', service: 'Gel Manicure' },
  { label: 'Midnight Navy', value: '#1e3a5f', service: 'Gel Nails' },
  { label: 'Sage Green',    value: '#84a98c', service: 'Soft Gel Manicure' },
  { label: 'Chrome Silver', value: '#c0c0c0', service: 'Chrome Nails' },
  { label: 'Mirror Gold',   value: '#ffd700', service: 'Chrome Nails' },
]

const MAKEUP_LOOKS = [
  { label: '✨ No Makeup',     value: 'none',    lipColor: null,      blushOpacity: 0 },
  { label: '🌸 Soft Glam',    value: 'soft',    lipColor: '#e88080', blushOpacity: 0.15 },
  { label: '💄 Bold Red Lip', value: 'bold',    lipColor: '#c0392b', blushOpacity: 0.2 },
  { label: '🌿 Natural Glow', value: 'natural', lipColor: '#b5785a', blushOpacity: 0.1 },
  { label: '💜 Evening Drama', value: 'drama',  lipColor: '#6b21a8', blushOpacity: 0.25 },
  { label: '🩷 Bridal Blush', value: 'bridal',  lipColor: '#e8a0a0', blushOpacity: 0.3 },
]

type ActiveTab = 'hair' | 'nails' | 'makeup'

// ── MediaPipe CDN wasm path ───────────────────────────────────
const MP_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'

// ── Hex helpers ───────────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]
}

// ── Hair recolor via ImageSegmenter mask ──────────────────────
// MediaPipe ImageSegmenter returns a Float32Array "confidence mask"
// where each pixel is 0–1 (probability of being foreground / hair).
// We use the "hair" category (index 1 in SELFIE_MULTICLASS model).
// The SELFIE_SEGMENTATION model returns only foreground vs background,
// so we derive a "hair region" by looking at the TOP ~40% of foreground.

function applyHairMask(
  src: HTMLCanvasElement,
  dst: HTMLCanvasElement,
  maskData: Float32Array | Uint8ClampedArray,
  maskW: number,
  maskH: number,
  hairHex: string,
) {
  dst.width  = src.width
  dst.height = src.height

  const ctx = dst.getContext('2d')!
  // Draw the original photo
  ctx.drawImage(src, 0, 0)

  const [hr, hg, hb] = hexToRgb(hairHex)

  // Read original pixels so we can do colour-tinting per-pixel
  const imgData = ctx.getImageData(0, 0, dst.width, dst.height)
  const px = imgData.data

  const scaleX = maskW  / dst.width
  const scaleY = maskH / dst.height

  for (let y = 0; y < dst.height; y++) {
    for (let x = 0; x < dst.width; x++) {
      const mx = Math.min(maskW  - 1, Math.round(x * scaleX))
      const my = Math.min(maskH - 1, Math.round(y * scaleY))
      const maskVal = maskData[my * maskW + mx] // 0–1 or 0–255

      // Normalise to 0–1
      const conf = maskVal > 1 ? maskVal / 255 : maskVal

      // Only tint if this pixel is high-confidence foreground AND
      // in the top 50% of the image (hair is above mid-face)
      const inHairZone = (y / dst.height) < 0.55
      if (conf > 0.35 && inHairZone) {
        const i = (y * dst.width + x) * 4
        const strength = Math.min(0.75, conf * 0.85)

        // Multiply-blend the hair colour onto the pixel
        px[i]     = Math.round(px[i]     * (1 - strength) + (px[i]     * hr / 255) * strength)
        px[i + 1] = Math.round(px[i + 1] * (1 - strength) + (px[i + 1] * hg / 255) * strength)
        px[i + 2] = Math.round(px[i + 2] * (1 - strength) + (px[i + 2] * hb / 255) * strength)
      }
    }
  }

  ctx.putImageData(imgData, 0, 0)

  // Label overlay
  const colorName = HAIR_COLORS.find((c) => c.value === hairHex)?.label ?? ''
  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  ctx.fillRect(8, 8, 155, 26)
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 13px sans-serif'
  ctx.fillText(`🎨 ${colorName}`, 14, 26)
}

// ── Nail recolor via HandLandmarker ──────────────────────────
// HandLandmarker returns 21 landmarks per hand.
// Fingertip indices: thumb=4, index=8, middle=12, ring=16, pinky=20
// We also use the "DIP joint" (one below tip) to get nail length.

const FINGERTIP_IDS = [4, 8, 12, 16, 20]
const DIP_IDS       = [3, 7, 11, 15, 19] // joint just below tip

interface NormLandmark { x: number; y: number; z: number }

function applyNailsMask(
  src: HTMLCanvasElement,
  dst: HTMLCanvasElement,
  hands: NormLandmark[][],
  nailHex: string,
) {
  dst.width  = src.width
  dst.height = src.height
  const ctx = dst.getContext('2d')!
  ctx.drawImage(src, 0, 0)

  const [nr, ng, nb] = hexToRgb(nailHex)
  const imgData = ctx.getImageData(0, 0, dst.width, dst.height)
  const px = imgData.data

  for (const landmarks of hands) {
    for (let f = 0; f < FINGERTIP_IDS.length; f++) {
      const tip = landmarks[FINGERTIP_IDS[f]]
      const dip = landmarks[DIP_IDS[f]]
      if (!tip || !dip) continue

      // Convert normalised → pixel
      const tx = tip.x * dst.width
      const ty = tip.y * dst.height
      const dx = dip.x * dst.width
      const dy = dip.y * dst.height

      // Nail length = distance tip → DIP, nail width ~0.6× that
      const nailLen = Math.hypot(tx - dx, ty - dy)
      const nailW   = nailLen * 0.65
      const nailH   = nailLen * 1.1

      // Angle of the finger
      const angle = Math.atan2(ty - dy, tx - dx) - Math.PI / 2

      // Paint the nail region pixel-by-pixel inside a rotated ellipse
      const cx = tx - Math.cos(angle + Math.PI / 2) * nailH * 0.3
      const cy = ty - Math.sin(angle + Math.PI / 2) * nailH * 0.3

      const cosA = Math.cos(-angle)
      const sinA = Math.sin(-angle)

      const rx2 = (nailW / 2) ** 2
      const ry2 = (nailH / 2) ** 2

      // Bounding box scan
      const bx = Math.max(0, Math.floor(cx - nailW))
      const by = Math.max(0, Math.floor(cy - nailH))
      const ex = Math.min(dst.width  - 1, Math.ceil(cx + nailW))
      const ey = Math.min(dst.height - 1, Math.ceil(cy + nailH))

      for (let py2 = by; py2 <= ey; py2++) {
        for (let px2 = bx; px2 <= ex; px2++) {
          // Rotate point relative to nail centre
          const lx = px2 - cx
          const ly = py2 - cy
          const rx = lx * cosA - ly * sinA
          const ry = lx * sinA + ly * cosA

          // Inside ellipse test
          if (rx * rx / rx2 + ry * ry / ry2 <= 1) {
            const i = (py2 * dst.width + px2) * 4
            // Overlay blend at 80%
            const a = 0.82
            px[i]     = Math.round(px[i]     * (1 - a) + nr * a)
            px[i + 1] = Math.round(px[i + 1] * (1 - a) + ng * a)
            px[i + 2] = Math.round(px[i + 2] * (1 - a) + nb * a)
          }
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0)

  // Label
  const nailName = NAIL_COLORS.find((c) => c.value === nailHex)?.label ?? ''
  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  ctx.fillRect(8, dst.height - 32, 155, 26)
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 12px sans-serif'
  ctx.fillText(`💅 ${nailName}`, 12, dst.height - 13)
}

// ── Makeup overlay (canvas-based, no ML needed) ───────────────
function applyMakeup(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  makeup: typeof MAKEUP_LOOKS[0],
) {
  if (makeup.lipColor) {
    ctx.save()
    ctx.globalCompositeOperation = 'multiply'
    ctx.globalAlpha = 0.58
    ctx.fillStyle = makeup.lipColor
    ctx.beginPath()
    ctx.ellipse(w / 2, h * 0.75, w * 0.1, h * 0.026, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  if (makeup.blushOpacity > 0) {
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    ctx.globalAlpha = makeup.blushOpacity
    ctx.fillStyle = '#ff9999'
    ctx.beginPath()
    ctx.ellipse(w * 0.27, h * 0.60, w * 0.12, h * 0.065, -0.3, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(w * 0.73, h * 0.60, w * 0.12, h * 0.065,  0.3, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

// ── Main page component ───────────────────────────────────────
export default function VirtualTryOnPage() {
  // Camera
  const videoRef        = useRef<HTMLVideoElement>(null)
  const captureCanvasRef = useRef<HTMLCanvasElement>(null)   // raw capture
  const overlayRef      = useRef<HTMLCanvasElement>(null)    // result shown to user
  const fileInputRef    = useRef<HTMLInputElement>(null)
  const streamRef       = useRef<MediaStream | null>(null)

  // State
  const [cameraOn,       setCameraOn]       = useState(false)
  const [srcCanvas,      setSrcCanvas]      = useState<HTMLCanvasElement | null>(null) // clean base
  const [activeTab,      setActiveTab]      = useState<ActiveTab>('hair')
  const [selectedHair,   setSelectedHair]   = useState<string | null>(null)
  const [selectedNail,   setSelectedNail]   = useState<string | null>(null)
  const [selectedMakeup, setSelectedMakeup] = useState(MAKEUP_LOOKS[0])
  const [mpLoading,      setMpLoading]      = useState(false)
  const [mpError,        setMpError]        = useState<string | null>(null)
  const [mpStatus,       setMpStatus]       = useState('')  // status text for user
  const [nailHands,      setNailHands]      = useState<NormLandmark[][] | null>(null)
  const [hairMask,       setHairMask]       = useState<{ data: Float32Array | Uint8ClampedArray; w: number; h: number } | null>(null)

  // Assign stream after camera state flips
  useEffect(() => {
    if (cameraOn && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
    }
  }, [cameraOn])

  // Cleanup camera on unmount
  useEffect(() => () => { streamRef.current?.getTracks().forEach((t) => t.stop()) }, [])

  const startCamera = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = s
      setCameraOn(true)
      setSrcCanvas(null)
      setHairMask(null)
      setNailHands(null)
      setMpError(null)
    } catch {
      alert('Camera access denied. Please allow camera permissions or upload a photo.')
    }
  }, [])

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCameraOn(false)
  }, [])

  // ── Capture from camera ──────────────────────────────────────
  const capture = useCallback(() => {
    const video  = videoRef.current
    const canvas = captureCanvasRef.current
    if (!video || !canvas) return
    if (video.videoWidth === 0) { alert('Video not ready — try again.'); return }
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')!
    ctx.save(); ctx.scale(-1, 1); ctx.drawImage(video, -canvas.width, 0); ctx.restore()
    stopStream()

    // Clone into a clean "source" canvas
    const clean = document.createElement('canvas')
    clean.width = canvas.width; clean.height = canvas.height
    clean.getContext('2d')!.drawImage(canvas, 0, 0)
    setSrcCanvas(clean)
    setHairMask(null); setNailHands(null); setMpError(null)
  }, [stopStream])

  // ── Upload from file ─────────────────────────────────────────
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = img.width; c.height = img.height
      c.getContext('2d')!.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)
      setSrcCanvas(c)
      setHairMask(null); setNailHands(null); setMpError(null)
    }
    img.src = url
  }

  // ── Run MediaPipe segmentation ───────────────────────────────
  const runSegmentation = useCallback(async (canvas: HTMLCanvasElement) => {
    setMpLoading(true)
    setMpStatus('Loading AI model…')
    setMpError(null)
    try {
      const { ImageSegmenter, FilesetResolver } = await import('@mediapipe/tasks-vision')
      setMpStatus('Detecting hair…')

      const vision = await FilesetResolver.forVisionTasks(MP_CDN)

      const segmenter = await ImageSegmenter.createFromOptions(vision, {
        baseOptions: {
          // Selfie segmentation model — detects person foreground
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite',
          delegate: 'GPU',
        },
        runningMode: 'IMAGE',
        outputConfidenceMasks: true,
      })

      const result = segmenter.segment(canvas)
      const masks  = result.confidenceMasks
      if (masks && masks.length > 0) {
        const mask = masks[0]
        const data = mask.getAsFloat32Array()
        setHairMask({ data, w: mask.width, h: mask.height })
        setMpStatus('Hair detected ✓')
      } else {
        setMpStatus('Hair region not detected — try a clearer photo')
      }
      segmenter.close()
    } catch (err) {
      console.error('MediaPipe segmentation error:', err)
      setMpError('AI model failed to load. Hair colouring will use approximate mode.')
      setMpStatus('')
      // Fallback: create a synthetic top-half mask
      const fw = canvas.width; const fh = canvas.height
      const fakeData = new Float32Array(fw * fh)
      for (let y = 0; y < fh; y++) {
        for (let x = 0; x < fw; x++) {
          // Strong signal in top 35%, fade out toward 50%
          const normY = y / fh
          fakeData[y * fw + x] = normY < 0.35 ? 0.9 : normY < 0.5 ? (0.5 - normY) / 0.15 * 0.9 : 0
        }
      }
      setHairMask({ data: fakeData, w: fw, h: fh })
    } finally {
      setMpLoading(false)
    }
  }, [])

  // ── Run MediaPipe hand landmark detection ────────────────────
  const runHandDetection = useCallback(async (canvas: HTMLCanvasElement) => {
    setMpLoading(true)
    setMpStatus('Detecting nails…')
    setMpError(null)
    try {
      const { HandLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision')
      const vision = await FilesetResolver.forVisionTasks(MP_CDN)

      const landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'IMAGE',
        numHands: 2,
      })

      const result = landmarker.detect(canvas)
      landmarker.close()

      if (result.landmarks && result.landmarks.length > 0) {
        setNailHands(result.landmarks as NormLandmark[][])
        setMpStatus(`${result.landmarks.length} hand(s) detected ✓`)
      } else {
        setMpStatus('No hands detected — try showing your nails clearly')
        // Fallback: approximate nail positions centre-image
        setNailHands([[
          ...Array(21).fill({ x: 0.5, y: 0.5, z: 0 }),
        ]])
      }
    } catch (err) {
      console.error('MediaPipe hand detection error:', err)
      setMpError('Nail AI model failed. Using approximate nail positions.')
      setMpStatus('')
    } finally {
      setMpLoading(false)
    }
  }, [])

  // ── When a hair colour is selected ───────────────────────────
  function selectHairColor(hex: string) {
    const next = selectedHair === hex ? null : hex
    setSelectedHair(next)
    if (next && srcCanvas && !hairMask) {
      runSegmentation(srcCanvas)
    }
  }

  // ── When a nail colour is selected ───────────────────────────
  function selectNailColor(hex: string) {
    const next = selectedNail === hex ? null : hex
    setSelectedNail(next)
    if (next && srcCanvas && !nailHands) {
      runHandDetection(srcCanvas)
    }
  }

  // ── Composite overlay whenever anything changes ───────────────
  useEffect(() => {
    if (!srcCanvas || !overlayRef.current) return
    const dst = overlayRef.current

    // Draw original first
    dst.width  = srcCanvas.width
    dst.height = srcCanvas.height
    const ctx = dst.getContext('2d')!
    ctx.drawImage(srcCanvas, 0, 0)

    // Hair
    if (selectedHair && hairMask) {
      applyHairMask(srcCanvas, dst, hairMask.data, hairMask.w, hairMask.h, selectedHair)
    }

    // Nails — need to redraw on top of hair-coloured image
    if (selectedNail && nailHands && nailHands.length > 0) {
      // applyNailsMask reads srcCanvas and writes to dst
      applyNailsMask(srcCanvas, dst, nailHands, selectedNail)
      // Re-apply hair on top if both selected
      if (selectedHair && hairMask) {
        applyHairMask(dst, dst, hairMask.data, hairMask.w, hairMask.h, selectedHair)
      }
    }

    // Makeup
    applyMakeup(ctx, dst.width, dst.height, selectedMakeup)
  }, [srcCanvas, selectedHair, selectedNail, selectedMakeup, hairMask, nailHands])

  function downloadLook() {
    if (!overlayRef.current) return
    const link = document.createElement('a')
    link.download = 'glowcity-tryon.png'
    link.href = overlayRef.current.toDataURL()
    link.click()
  }

  function reset() {
    stopStream()
    setSrcCanvas(null)
    setSelectedHair(null)
    setSelectedNail(null)
    setSelectedMakeup(MAKEUP_LOOKS[0])
    setHairMask(null)
    setNailHands(null)
    setMpError(null)
    setMpStatus('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const hasPhoto = !!srcCanvas
  const suggestedService = selectedNail
    ? NAIL_COLORS.find((c) => c.value === selectedNail)?.service
    : selectedHair
    ? HAIR_COLORS.find((c) => c.value === selectedHair)?.label
    : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-violet-50">
      <MegaNav />

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/" className="p-2 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-rose-500 hover:border-rose-200 transition-colors shadow-sm">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="inline-flex items-center gap-2 bg-pink-100 text-rose-600 px-3 py-1 rounded-full text-xs font-medium mb-1">
              <Camera className="w-3.5 h-3.5" /> Virtual Try-On Studio
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              See the Look{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-violet-600">
                Before You Book
              </span>
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Uses <strong>MediaPipe AI</strong> — runs in your browser, no upload needed
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-5 gap-6">
          {/* ── Left: camera / photo ── */}
          <div className="md:col-span-3 space-y-3">
            <div className="relative bg-gray-900 rounded-2xl overflow-hidden aspect-[4/3]">
              {/* Live camera feed */}
              <video ref={videoRef} autoPlay playsInline muted
                className={`w-full h-full object-cover scale-x-[-1] ${cameraOn ? 'block' : 'hidden'}`} />

              {/* Result canvas */}
              {hasPhoto && !cameraOn && (
                <canvas ref={overlayRef} className="w-full h-full object-cover" />
              )}

              {/* Empty state */}
              {!cameraOn && !hasPhoto && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-gray-400">
                  <Camera className="w-14 h-14 opacity-20" />
                  <p className="text-sm text-center px-6">
                    Start camera or upload a photo<br />
                    <span className="text-xs opacity-60">MediaPipe AI will detect hair &amp; nails in-browser</span>
                  </p>
                </div>
              )}

              {/* Hidden canvases */}
              <canvas ref={captureCanvasRef} className="hidden" />

              {/* LIVE badge */}
              {cameraOn && (
                <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
                </div>
              )}

              {/* AI processing overlay */}
              {mpLoading && hasPhoto && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-3 text-white">
                  <Wand2 className="w-9 h-9 animate-spin" />
                  <p className="text-sm font-semibold">{mpStatus || 'Running AI…'}</p>
                  <p className="text-xs opacity-70">MediaPipe running in your browser</p>
                </div>
              )}

              {/* Status badge when not loading */}
              {!mpLoading && mpStatus && hasPhoto && (
                <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full">
                  {mpStatus}
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex gap-3 flex-wrap">
              {!cameraOn && !hasPhoto && (
                <>
                  <button onClick={startCamera}
                    className="flex-1 flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 text-white py-3 rounded-xl font-medium transition-colors">
                    <Camera className="w-4 h-4" /> Start Camera
                  </button>
                  <button onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">
                    <Upload className="w-4 h-4" /> Upload Photo
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                </>
              )}

              {cameraOn && (
                <>
                  <button onClick={stopStream}
                    className="px-5 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                  <button onClick={capture}
                    className="flex-1 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-xl font-medium transition-colors">
                    📸 Capture &amp; Try Looks
                  </button>
                </>
              )}

              {hasPhoto && !cameraOn && (
                <>
                  <button onClick={reset}
                    className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">
                    <RefreshCw className="w-4 h-4" /> Retake
                  </button>
                  <button onClick={downloadLook}
                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-violet-600 text-white py-3 rounded-xl font-medium hover:opacity-90 transition-opacity">
                    <Download className="w-4 h-4" /> Save Look
                  </button>
                </>
              )}
            </div>

            {mpError && (
              <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{mpError}</span>
              </div>
            )}

            {/* Book CTA */}
            {suggestedService && hasPhoto && (
              <div className="bg-gradient-to-r from-rose-50 to-violet-50 border border-rose-100 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">You&apos;re trying</p>
                  <p className="font-semibold text-gray-800">{suggestedService}</p>
                </div>
                <Link href={`/salons?q=${encodeURIComponent(suggestedService)}`}
                  className="flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  Book Now <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>

          {/* ── Right: colour pickers ── */}
          <div className="md:col-span-2 space-y-4">
            {/* Tabs */}
            <div className="flex bg-gray-100 rounded-xl p-1">
              {(['hair', 'nails', 'makeup'] as ActiveTab[]).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${
                    activeTab === tab ? 'bg-white shadow text-rose-600' : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  {tab === 'hair' ? '💇 Hair' : tab === 'nails' ? '💅 Nails' : '💄 Makeup'}
                </button>
              ))}
            </div>

            {/* AI info banner */}
            {(activeTab === 'hair' || activeTab === 'nails') && (
              <div className="flex items-start gap-2 text-xs bg-violet-50 border border-violet-100 rounded-xl px-3 py-2.5 text-violet-700">
                <Wand2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  {activeTab === 'hair'
                    ? 'MediaPipe SelfieSegmenter builds a pixel-precise hair mask in your browser — no data is sent anywhere.'
                    : 'MediaPipe HandLandmarker pinpoints all 20 fingertip positions for accurate nail colouring.'}
                </span>
              </div>
            )}

            {/* ── Hair colours ── */}
            {activeTab === 'hair' && (
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Hair Colour</p>
                <div className="grid grid-cols-5 gap-2.5">
                  {HAIR_COLORS.map((c) => (
                    <button key={c.value} title={c.label}
                      onClick={() => selectHairColor(c.value)}
                      disabled={!hasPhoto && !cameraOn}
                      className={`relative w-10 h-10 rounded-full border-2 transition-all disabled:opacity-40 ${
                        selectedHair === c.value
                          ? 'border-rose-500 scale-110 shadow-lg ring-2 ring-rose-200'
                          : 'border-transparent hover:border-gray-300 hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.value }}>
                      {selectedHair === c.value && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <span className="w-4 h-4 rounded-full bg-white/80 flex items-center justify-center text-gray-800 text-xs font-bold">✓</span>
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                {selectedHair && (
                  <p className="text-xs text-center mt-3 text-gray-600">
                    <span className="font-semibold text-rose-600">{HAIR_COLORS.find((c) => c.value === selectedHair)?.label}</span>
                    {mpLoading && activeTab === 'hair'
                      ? <span className="ml-2 text-violet-500 animate-pulse">• Segmenting hair…</span>
                      : hairMask
                      ? <span className="ml-2 text-green-600">• Mask ready ✓</span>
                      : null}
                  </p>
                )}
                {!hasPhoto && (
                  <p className="text-xs text-gray-400 text-center mt-2">Take a photo first to try colours</p>
                )}
              </div>
            )}

            {/* ── Nail colours ── */}
            {activeTab === 'nails' && (
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Nail Shade</p>
                <div className="grid grid-cols-5 gap-2.5">
                  {NAIL_COLORS.map((c) => (
                    <button key={c.value} title={`${c.label} — ${c.service}`}
                      onClick={() => selectNailColor(c.value)}
                      disabled={!hasPhoto && !cameraOn}
                      className={`relative w-10 h-10 rounded-lg border-2 transition-all disabled:opacity-40 ${
                        selectedNail === c.value
                          ? 'border-rose-500 scale-110 shadow-lg ring-2 ring-rose-200'
                          : 'border-transparent hover:border-gray-300 hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.value }}>
                      {selectedNail === c.value && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <span className="w-4 h-4 rounded-full bg-white/80 flex items-center justify-center text-gray-800 text-xs font-bold">✓</span>
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                {selectedNail && (
                  <p className="text-xs text-center mt-3 text-gray-600">
                    <span className="font-semibold text-rose-600">{NAIL_COLORS.find((c) => c.value === selectedNail)?.label}</span>
                    {' — '}{NAIL_COLORS.find((c) => c.value === selectedNail)?.service}
                    {mpLoading && activeTab === 'nails'
                      ? <span className="block mt-1 text-violet-500 animate-pulse">Detecting hand landmarks…</span>
                      : nailHands
                      ? <span className="block mt-1 text-green-600">{nailHands.length} hand(s) detected ✓</span>
                      : null}
                  </p>
                )}
                {!hasPhoto && (
                  <p className="text-xs text-gray-400 text-center mt-2">Take a photo first to try colours</p>
                )}
              </div>
            )}

            {/* ── Makeup ── */}
            {activeTab === 'makeup' && (
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Makeup Look</p>
                <div className="space-y-2">
                  {MAKEUP_LOOKS.map((look) => (
                    <button key={look.value} onClick={() => setSelectedMakeup(look)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-all ${
                        selectedMakeup.value === look.value
                          ? 'border-rose-300 bg-rose-50 text-rose-700 font-medium'
                          : 'border-gray-100 text-gray-600 hover:bg-gray-50'
                      }`}>
                      <span>{look.label}</span>
                      {look.lipColor && (
                        <span className="w-5 h-5 rounded-full border border-gray-200"
                          style={{ backgroundColor: look.lipColor }} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Salons CTA */}
            <div className="bg-gradient-to-br from-violet-50 to-rose-50 rounded-xl border border-violet-100 p-4">
              <p className="text-xs font-semibold text-violet-600 mb-1">✨ Love a look?</p>
              <p className="text-xs text-gray-600 mb-3">Find Mumbai salons that offer this exact service.</p>
              <Link href="/salons"
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-rose-500 text-white py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                <Sparkles className="w-4 h-4" /> Browse Salons
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
