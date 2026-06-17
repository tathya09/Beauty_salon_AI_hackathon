'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { Camera, RefreshCw, Sparkles, Download, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { MegaNav } from '@/components/discovery/MegaNav'

// ── Look palettes ─────────────────────────────────────────────
const HAIR_COLORS = [
  { label: 'Jet Black', value: '#0a0a0a', category: 'hair' },
  { label: 'Dark Brown', value: '#3b1d08', category: 'hair' },
  { label: 'Warm Chestnut', value: '#7b3f00', category: 'hair' },
  { label: 'Honey Blonde', value: '#c8a44c', category: 'hair' },
  { label: 'Platinum Blonde', value: '#e8dab2', category: 'hair' },
  { label: 'Auburn Red', value: '#9b2335', category: 'hair' },
  { label: 'Balayage Caramel', value: '#c68642', category: 'hair' },
  { label: 'Rose Gold', value: '#d4a0a0', category: 'hair' },
  { label: 'Violet Fantasy', value: '#7c3aed', category: 'hair' },
  { label: 'Steel Blue', value: '#4a6fa5', category: 'hair' },
]

const NAIL_COLORS = [
  { label: 'Classic Red', value: '#dc2626', service: 'Gel Manicure' },
  { label: 'Nude Beige', value: '#d4a69a', service: 'Soft Gel Manicure' },
  { label: 'French White', value: '#f5f0e8', service: 'French Manicure' },
  { label: 'Hot Pink', value: '#ec4899', service: 'Gel Nails' },
  { label: 'Deep Purple', value: '#7c3aed', service: 'Gel Nails' },
  { label: 'Coral Sunset', value: '#f97316', service: 'Gel Manicure' },
  { label: 'Midnight Navy', value: '#1e3a5f', service: 'Gel Nails' },
  { label: 'Sage Green', value: '#84a98c', service: 'Soft Gel Manicure' },
  { label: 'Chrome Silver', value: '#c0c0c0', service: 'Chrome Nails' },
  { label: 'Mirror Gold', value: '#ffd700', service: 'Chrome Nails' },
]

const MAKEUP_LOOKS = [
  { label: '✨ No Makeup', value: 'none', lipColor: null, blushOpacity: 0 },
  { label: '🌸 Soft Glam', value: 'soft', lipColor: '#e88080', blushOpacity: 0.15 },
  { label: '💄 Bold Red Lip', value: 'bold', lipColor: '#c0392b', blushOpacity: 0.2 },
  { label: '🌿 Natural Glow', value: 'natural', lipColor: '#b5785a', blushOpacity: 0.1 },
  { label: '💜 Evening Drama', value: 'drama', lipColor: '#6b21a8', blushOpacity: 0.25 },
  { label: '🩷 Bridal Blush', value: 'bridal', lipColor: '#e8a0a0', blushOpacity: 0.3 },
]

type ActiveTab = 'hair' | 'nails' | 'makeup'

export default function VirtualTryOnPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraOn, setCameraOn] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ActiveTab>('hair')
  const [selectedHairColor, setSelectedHairColor] = useState<string | null>(null)
  const [selectedNailColor, setSelectedNailColor] = useState<string | null>(null)
  const [selectedMakeup, setSelectedMakeup] = useState(MAKEUP_LOOKS[0])

  // KEY FIX: assign srcObject after camera state flips so DOM node is mounted
  useEffect(() => {
    if (cameraOn && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
    }
  }, [cameraOn])

  const startCamera = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = s
      setCameraOn(true)
      setCapturedImage(null)
    } catch {
      alert('Camera access denied. Please allow camera permissions in your browser.')
    }
  }, [])

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCameraOn(false)
  }, [])

  const capture = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    if (video.videoWidth === 0) { alert('Video not ready — try again in a moment.'); return }
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')!
    ctx.save()
    ctx.scale(-1, 1)
    ctx.drawImage(video, -canvas.width, 0)
    ctx.restore()
    setCapturedImage(canvas.toDataURL('image/png'))
    stopStream()
  }, [stopStream])

  // Overlay effects on captured image
  useEffect(() => {
    if (!capturedImage || !overlayCanvasRef.current) return
    const canvas = overlayCanvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)
      ctx.save()
      ctx.scale(-1, 1)
      ctx.drawImage(img, -img.width, 0)
      ctx.restore()

      // Hair color overlay (top ~35% of image as hair region)
      if (selectedHairColor) {
        ctx.save()
        ctx.globalCompositeOperation = 'multiply'
        ctx.globalAlpha = 0.45
        ctx.fillStyle = selectedHairColor
        // Approximate hair area — top portion
        const hairHeight = img.height * 0.38
        ctx.beginPath()
        ctx.ellipse(img.width / 2, hairHeight * 0.3, img.width * 0.42, hairHeight * 0.8, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()

        // Add color label
        ctx.save()
        ctx.fillStyle = 'rgba(0,0,0,0.5)'
        ctx.fillRect(8, 8, 130, 24)
        ctx.fillStyle = 'white'
        ctx.font = '12px sans-serif'
        const colorName = HAIR_COLORS.find((c) => c.value === selectedHairColor)?.label ?? ''
        ctx.fillText(`🎨 ${colorName}`, 14, 24)
        ctx.restore()
      }

      // Lip color overlay
      if (selectedMakeup.lipColor) {
        ctx.save()
        ctx.globalCompositeOperation = 'multiply'
        ctx.globalAlpha = 0.55
        ctx.fillStyle = selectedMakeup.lipColor
        // Approximate lip area — center-bottom face region
        const lipY = img.height * 0.75
        ctx.beginPath()
        ctx.ellipse(img.width / 2, lipY, img.width * 0.1, img.height * 0.025, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      // Blush overlay
      if (selectedMakeup.blushOpacity > 0) {
        ctx.save()
        ctx.globalCompositeOperation = 'screen'
        ctx.globalAlpha = selectedMakeup.blushOpacity
        ctx.fillStyle = '#ff9999'
        const blushY = img.height * 0.6
        // Left cheek
        ctx.beginPath()
        ctx.ellipse(img.width * 0.28, blushY, img.width * 0.12, img.height * 0.06, -0.3, 0, Math.PI * 2)
        ctx.fill()
        // Right cheek
        ctx.beginPath()
        ctx.ellipse(img.width * 0.72, blushY, img.width * 0.12, img.height * 0.06, 0.3, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      // Nail color swatch overlay (bottom corner)
      if (selectedNailColor) {
        ctx.save()
        const swatchY = img.height - 48
        for (let i = 0; i < 5; i++) {
          ctx.beginPath()
          ctx.fillStyle = selectedNailColor
          ctx.roundRect(12 + i * 22, swatchY, 16, 36, 8)
          ctx.fill()
          ctx.strokeStyle = 'rgba(255,255,255,0.6)'
          ctx.lineWidth = 1
          ctx.stroke()
        }
        const nailName = NAIL_COLORS.find((c) => c.value === selectedNailColor)?.label ?? ''
        ctx.fillStyle = 'rgba(0,0,0,0.5)'
        ctx.fillRect(8, swatchY - 20, 115, 18)
        ctx.fillStyle = 'white'
        ctx.font = '11px sans-serif'
        ctx.fillText(`💅 ${nailName}`, 12, swatchY - 6)
        ctx.restore()
      }
    }
    img.src = capturedImage
  }, [capturedImage, selectedHairColor, selectedNailColor, selectedMakeup])

  function downloadLook() {
    if (!overlayCanvasRef.current) return
    const link = document.createElement('a')
    link.download = 'glowcity-tryon.png'
    link.href = overlayCanvasRef.current.toDataURL()
    link.click()
  }

  const suggestedService = selectedNailColor
    ? NAIL_COLORS.find((c) => c.value === selectedNailColor)?.service
    : selectedHairColor
    ? HAIR_COLORS.find((c) => c.value === selectedHairColor)?.label
    : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-violet-50">
      <MegaNav />

      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-pink-100 text-rose-600 px-4 py-1.5 rounded-full text-sm font-medium mb-3">
            <Camera className="w-4 h-4" />
            Virtual Try-On Studio
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            See the Look <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-violet-600">Before You Book</span>
          </h1>
          <p className="text-gray-500">Try hair colors, nail shades, and makeup looks using your camera</p>
        </div>

        <div className="grid md:grid-cols-5 gap-6">
          {/* Camera view — 3 cols */}
          <div className="md:col-span-3 space-y-4">
            <div className="relative bg-gray-900 rounded-2xl overflow-hidden aspect-[4/3]">
              {/* Video always rendered, visibility toggled via CSS */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover scale-x-[-1] ${cameraOn ? 'block' : 'hidden'}`}
              />
              {capturedImage && !cameraOn && (
                <canvas ref={overlayCanvasRef} className="w-full h-full object-cover" />
              )}
              {!cameraOn && !capturedImage && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                  <Camera className="w-16 h-16 mb-3 opacity-30" />
                  <p className="text-sm">Start camera to try looks live</p>
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />

              {/* Live badge */}
              {cameraOn && (
                <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  LIVE
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex gap-3">
              {!cameraOn && !capturedImage && (
                <button onClick={startCamera} className="flex-1 flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 text-white py-3 rounded-xl font-medium transition-colors">
                  <Camera className="w-4 h-4" /> Start Camera
                </button>
              )}
              {cameraOn && (
                <>
                  <button onClick={stopStream} className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">
                    Cancel
                  </button>
                  <button onClick={capture} className="flex-1 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-xl font-medium transition-colors">
                    📸 Capture &amp; Apply Look
                  </button>
                </>
              )}
              {capturedImage && !cameraOn && (
                <>
                  <button
                    onClick={() => { setCapturedImage(null); setSelectedHairColor(null); setSelectedNailColor(null); setSelectedMakeup(MAKEUP_LOOKS[0]) }}
                    className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" /> Retake
                  </button>
                  <button
                    onClick={downloadLook}
                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-violet-600 text-white py-3 rounded-xl font-medium hover:opacity-90"
                  >
                    <Download className="w-4 h-4" /> Save Look
                  </button>
                </>
              )}
            </div>

            {/* Book this look CTA */}
            {suggestedService && capturedImage && !cameraOn && (
              <div className="bg-gradient-to-r from-rose-50 to-violet-50 border border-rose-100 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">You&apos;re trying</p>
                  <p className="font-semibold text-gray-800">{suggestedService}</p>
                </div>
                <Link
                  href={`/salons?q=${encodeURIComponent(suggestedService)}`}
                  className="flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Book Now <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>

          {/* Options panel — 2 cols */}
          <div className="md:col-span-2 space-y-4">
            {/* Tabs */}
            <div className="flex bg-gray-100 rounded-xl p-1">
              {(['hair', 'nails', 'makeup'] as ActiveTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${
                    activeTab === tab ? 'bg-white shadow text-rose-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab === 'hair' ? '💇 Hair' : tab === 'nails' ? '💅 Nails' : '💄 Makeup'}
                </button>
              ))}
            </div>

            {/* Hair colors */}
            {activeTab === 'hair' && (
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Hair Color</p>
                <div className="grid grid-cols-5 gap-2">
                  {HAIR_COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setSelectedHairColor(selectedHairColor === color.value ? null : color.value)}
                      title={color.label}
                      className={`relative w-10 h-10 rounded-full border-2 transition-all ${
                        selectedHairColor === color.value
                          ? 'border-rose-500 scale-110 shadow-lg'
                          : 'border-transparent hover:border-gray-300'
                      }`}
                      style={{ backgroundColor: color.value }}
                    >
                      {selectedHairColor === color.value && (
                        <span className="absolute inset-0 flex items-center justify-center text-white text-xs">✓</span>
                      )}
                    </button>
                  ))}
                </div>
                {selectedHairColor && (
                  <p className="text-xs text-gray-500 mt-3 text-center">
                    Selected: <span className="font-medium text-rose-600">
                      {HAIR_COLORS.find((c) => c.value === selectedHairColor)?.label}
                    </span>
                  </p>
                )}
              </div>
            )}

            {/* Nail colors */}
            {activeTab === 'nails' && (
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Nail Shade</p>
                <div className="grid grid-cols-5 gap-2">
                  {NAIL_COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setSelectedNailColor(selectedNailColor === color.value ? null : color.value)}
                      title={`${color.label} (${color.service})`}
                      className={`relative w-10 h-10 rounded-lg border-2 transition-all ${
                        selectedNailColor === color.value
                          ? 'border-rose-500 scale-110 shadow-lg'
                          : 'border-transparent hover:border-gray-300'
                      }`}
                      style={{ backgroundColor: color.value }}
                    >
                      {selectedNailColor === color.value && (
                        <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">✓</span>
                      )}
                    </button>
                  ))}
                </div>
                {selectedNailColor && (
                  <p className="text-xs text-gray-500 mt-3 text-center">
                    <span className="font-medium text-rose-600">
                      {NAIL_COLORS.find((c) => c.value === selectedNailColor)?.label}
                    </span> — {NAIL_COLORS.find((c) => c.value === selectedNailColor)?.service}
                  </p>
                )}
              </div>
            )}

            {/* Makeup looks */}
            {activeTab === 'makeup' && (
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Makeup Look</p>
                <div className="space-y-2">
                  {MAKEUP_LOOKS.map((look) => (
                    <button
                      key={look.value}
                      onClick={() => setSelectedMakeup(look)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-all ${
                        selectedMakeup.value === look.value
                          ? 'border-rose-300 bg-rose-50 text-rose-700 font-medium'
                          : 'border-gray-100 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span>{look.label}</span>
                      {look.lipColor && (
                        <span className="w-5 h-5 rounded-full border border-gray-200" style={{ backgroundColor: look.lipColor }} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Explore salons */}
            <div className="bg-gradient-to-br from-violet-50 to-rose-50 rounded-xl border border-violet-100 p-4">
              <p className="text-xs font-semibold text-violet-600 mb-2">✨ Love a look?</p>
              <p className="text-xs text-gray-600 mb-3">Find salons near you that offer this service.</p>
              <Link
                href="/salons"
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-rose-500 text-white py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Sparkles className="w-4 h-4" /> Browse Salons
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
