'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { Camera, Upload, RefreshCw, Sparkles, X, ImageIcon, Brain, Leaf, Zap, Stethoscope, Star, AlertCircle, ChevronRight, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { MegaNav } from '@/components/discovery/MegaNav'
import { Badge } from '@/components/ui/badge'

// ── Types ─────────────────────────────────────────────────────
interface Recommendation {
  type: 'natural' | 'ayurvedic' | 'chemical' | 'dermat'
  label: string
  reason: string
  services: string[]
}

interface AnalysisResult {
  skinType: string
  concerns: string[]
  overallScore: number
  confidence: number
  analysisSummary: string
  glowTip: string
  recommendations: Recommendation[]
}

// ── Treatment type config ─────────────────────────────────────
const TREATMENT_ICONS: Record<string, React.ReactNode> = {
  natural: <Leaf className="w-4 h-4" />,
  ayurvedic: <Sparkles className="w-4 h-4" />,
  chemical: <Zap className="w-4 h-4" />,
  dermat: <Stethoscope className="w-4 h-4" />,
}

const TREATMENT_COLORS: Record<string, string> = {
  natural: 'from-green-50 to-emerald-50 border-green-200',
  ayurvedic: 'from-amber-50 to-orange-50 border-amber-200',
  chemical: 'from-violet-50 to-purple-50 border-violet-200',
  dermat: 'from-blue-50 to-cyan-50 border-blue-200',
}

const TREATMENT_ACCENT: Record<string, string> = {
  natural: 'text-green-700 bg-green-100',
  ayurvedic: 'text-amber-700 bg-amber-100',
  chemical: 'text-violet-700 bg-violet-100',
  dermat: 'text-blue-700 bg-blue-100',
}

const SCORE_COLOR = (score: number) => {
  if (score >= 8) return 'text-green-600'
  if (score >= 6) return 'text-amber-600'
  return 'text-rose-600'
}

const SCORE_BG = (score: number) => {
  if (score >= 8) return 'bg-green-50 border-green-200'
  if (score >= 6) return 'bg-amber-50 border-amber-200'
  return 'bg-rose-50 border-rose-200'
}

// ── Preferred treatment options ───────────────────────────────
const PREF_OPTIONS = [
  { value: '', label: 'All Treatments', icon: <Sparkles className="w-3.5 h-3.5" /> },
  { value: 'natural', label: 'Natural', icon: <Leaf className="w-3.5 h-3.5" /> },
  { value: 'ayurvedic', label: 'Ayurvedic', icon: <Sparkles className="w-3.5 h-3.5" /> },
  { value: 'chemical', label: 'Chemical', icon: <Zap className="w-3.5 h-3.5" /> },
  { value: 'dermat', label: 'Dermat', icon: <Stethoscope className="w-3.5 h-3.5" /> },
]

export default function AIFaceAnalystPage() {
  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [mode, setMode] = useState<'idle' | 'camera' | 'captured' | 'uploaded'>('idle')
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [preferredType, setPreferredType] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  // Assign stream to video element once camera is active
  useEffect(() => {
    if (mode === 'camera' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
    }
  }, [mode])

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      setMode('camera')
      setResult(null)
      setError(null)
    } catch {
      setError('Camera access denied. Please allow camera permissions or upload a photo instead.')
    }
  }, [])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  const capture = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    if (video.videoWidth === 0) {
      setError('Video not ready — please try again.')
      return
    }
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')!
    // Mirror the image (selfie)
    ctx.save()
    ctx.scale(-1, 1)
    ctx.drawImage(video, -canvas.width, 0)
    ctx.restore()

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    const base64 = dataUrl.split(',')[1]
    setCapturedImage(dataUrl)
    setImageBase64(base64)
    setMode('captured')
    stopCamera()
  }, [stopCamera])

  const processUploadedFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPEG or PNG).')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      const base64 = dataUrl.split(',')[1]
      setCapturedImage(dataUrl)
      setImageBase64(base64)
      setMode('uploaded')
      setResult(null)
      setError(null)
    }
    reader.readAsDataURL(file)
  }, [])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processUploadedFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processUploadedFile(file)
  }

  function reset() {
    stopCamera()
    setCapturedImage(null)
    setImageBase64(null)
    setMode('idle')
    setResult(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function analyse() {
    if (!imageBase64) return
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const res = await fetch('/api/ai/face-analyst', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, preferredType: preferredType || undefined }),
      })
      if (!res.ok) throw new Error(`API error ${res.status}`)
      const data: AnalysisResult = await res.json()
      setResult(data)
    } catch {
      setError('Analysis failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const hasImage = mode === 'captured' || mode === 'uploaded'

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-pink-50 to-rose-50">
      <MegaNav />

      <div className="max-w-5xl mx-auto px-4 pt-8 pb-16">
        {/* Back arrow + Header */}
        <div className="flex items-start gap-3 mb-8">
          <Link href="/" className="p-2 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-violet-600 hover:border-violet-200 transition-colors shadow-sm mt-1 shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="text-center flex-1">
            <div className="inline-flex items-center gap-2 bg-violet-100 text-violet-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
              <Brain className="w-4 h-4" />
              AI-Powered Skin Analysis
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2">
              AI Face Analyst ✨
            </h1>
            <p className="text-gray-500 max-w-lg mx-auto">
              Upload a selfie or use your camera — our Gemini AI analyses your skin and recommends personalised beauty treatments.
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* LEFT: Image capture / upload panel */}
          <div className="space-y-4">
            {/* Camera / Upload zone */}
            {mode === 'camera' ? (
              <div className="relative rounded-2xl overflow-hidden shadow-xl bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full aspect-[4/3] object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
                  <button
                    onClick={capture}
                    className="flex items-center gap-2 bg-white text-gray-900 font-semibold px-5 py-2.5 rounded-full shadow-lg hover:bg-rose-50 transition-colors"
                  >
                    <Camera className="w-4 h-4 text-rose-500" /> Capture
                  </button>
                  <button
                    onClick={reset}
                    className="flex items-center gap-2 bg-gray-800/80 text-white px-4 py-2.5 rounded-full hover:bg-gray-900 transition-colors"
                  >
                    <X className="w-4 h-4" /> Cancel
                  </button>
                </div>
              </div>
            ) : hasImage && capturedImage ? (
              <div className="relative rounded-2xl overflow-hidden shadow-xl">
                <img
                  src={capturedImage}
                  alt="Your photo for analysis"
                  className="w-full aspect-[4/3] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <button
                  onClick={reset}
                  className="absolute top-3 right-3 w-8 h-8 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium text-gray-700">
                  {mode === 'captured' ? '📸 Captured' : '📁 Uploaded'}
                </div>
              </div>
            ) : (
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                  dragging ? 'border-violet-400 bg-violet-50' : 'border-violet-200 bg-white/60 hover:border-violet-300'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ImageIcon className="w-8 h-8 text-violet-400" />
                </div>
                <p className="font-semibold text-gray-700 text-lg mb-1">Drop your selfie here</p>
                <p className="text-sm text-gray-400 mb-5">or choose an option below · JPEG/PNG · max 5MB</p>
                <div className="flex justify-center gap-3 flex-wrap">
                  <button
                    onClick={startCamera}
                    className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white font-semibold px-5 py-2.5 rounded-full transition-colors shadow-sm"
                  >
                    <Camera className="w-4 h-4" /> Use Camera
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 bg-white border border-violet-200 text-violet-600 hover:bg-violet-50 font-semibold px-5 py-2.5 rounded-full transition-colors"
                  >
                    <Upload className="w-4 h-4" /> Upload Photo
                  </button>
                </div>
              </div>
            )}

            {/* Preferred treatment selector */}
            {(hasImage || mode === 'idle') && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-100">
                <p className="text-sm font-semibold text-gray-700 mb-3">Preferred treatment approach:</p>
                <div className="flex flex-wrap gap-2">
                  {PREF_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setPreferredType(opt.value)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                        preferredType === opt.value
                          ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-violet-300 hover:text-violet-600'
                      }`}
                    >
                      {opt.icon}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Analyse button */}
            {hasImage && (
              <button
                onClick={analyse}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-rose-500 hover:from-violet-700 hover:to-rose-600 text-white font-bold py-3.5 rounded-2xl shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Analysing with Gemini AI…
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4" />
                    Analyse My Skin
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}

            {error && (
              <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {/* How it works */}
            {!hasImage && !loading && (
              <div className="bg-white/60 rounded-2xl p-4 border border-gray-100">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">How it works</p>
                <div className="space-y-2.5">
                  {[
                    { step: '1', text: 'Take a selfie or upload a clear face photo' },
                    { step: '2', text: 'Choose your preferred treatment approach' },
                    { step: '3', text: 'Gemini AI analyses skin type, concerns & health score' },
                    { step: '4', text: 'Get personalised treatment & salon recommendations' },
                  ].map((s) => (
                    <div key={s.step} className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-600 text-xs font-bold flex items-center justify-center shrink-0">
                        {s.step}
                      </span>
                      <span className="text-sm text-gray-600">{s.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Results panel */}
          <div className="space-y-4">
            {loading && (
              <div className="bg-white rounded-2xl p-8 border border-gray-100 flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-violet-100 to-rose-100 rounded-full flex items-center justify-center">
                  <Brain className="w-8 h-8 text-violet-500 animate-pulse" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800 mb-1">Analysing your skin…</p>
                  <p className="text-sm text-gray-400">Gemini AI is checking skin type, concerns, hydration levels and more</p>
                </div>
                <div className="w-full space-y-2">
                  {['Detecting skin type', 'Identifying concerns', 'Building recommendations'].map((s) => (
                    <div key={s} className="flex items-center gap-2 text-sm text-gray-500">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-violet-400" />
                      {s}…
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result && !loading && (
              <>
                {/* Skin overview card */}
                <div className={`rounded-2xl border p-5 ${SCORE_BG(result.overallScore)}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Skin Health Score</p>
                      <div className="flex items-end gap-2">
                        <span className={`text-5xl font-extrabold ${SCORE_COLOR(result.overallScore)}`}>
                          {result.overallScore}
                        </span>
                        <span className="text-gray-400 text-lg mb-1">/10</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <div
                            key={i}
                            className={`h-1.5 flex-1 rounded-full ${
                              i < result.overallScore
                                ? result.overallScore >= 8 ? 'bg-green-400' : result.overallScore >= 6 ? 'bg-amber-400' : 'bg-rose-400'
                                : 'bg-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge className="bg-white/80 text-gray-700 border border-gray-200 text-xs mb-1">
                        {result.skinType}
                      </Badge>
                      <p className="text-xs text-gray-400">
                        {Math.round(result.confidence * 100)}% confidence
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-gray-700 mt-3 leading-relaxed">{result.analysisSummary}</p>

                  {result.concerns.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-gray-500 mb-1.5">Detected concerns:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {result.concerns.map((c) => (
                          <span key={c} className="bg-white/80 border border-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Glow tip */}
                <div className="bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-100 rounded-2xl p-4 flex gap-3">
                  <Star className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-rose-600 uppercase tracking-wide mb-0.5">✨ Glow Tip</p>
                    <p className="text-sm text-gray-700">{result.glowTip}</p>
                  </div>
                </div>

                {/* Treatment recommendations */}
                <div className="space-y-3">
                  <p className="font-semibold text-gray-800 text-sm px-1">Recommended treatments for you:</p>
                  {result.recommendations
                    .filter((r) => !preferredType || r.type === preferredType || !preferredType)
                    .sort((a, b) => preferredType
                      ? (a.type === preferredType ? -1 : b.type === preferredType ? 1 : 0)
                      : 0
                    )
                    .map((rec) => (
                      <div
                        key={rec.type}
                        className={`rounded-2xl border bg-gradient-to-br p-4 ${TREATMENT_COLORS[rec.type]} ${
                          preferredType === rec.type ? 'ring-2 ring-violet-400 ring-offset-1' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${TREATMENT_ACCENT[rec.type]}`}>
                            {TREATMENT_ICONS[rec.type]}
                            {rec.label}
                          </span>
                          {preferredType === rec.type && (
                            <span className="text-xs bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full font-medium">
                              Your preference
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mb-2.5 italic">{rec.reason}</p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {rec.services.map((svc) => (
                            <Link
                              key={svc}
                              href={`/salons?q=${encodeURIComponent(svc)}`}
                              className="flex items-center gap-1.5 bg-white/70 hover:bg-white rounded-lg px-2.5 py-1.5 text-xs text-gray-700 hover:text-violet-600 transition-colors group"
                            >
                              <ChevronRight className="w-3 h-3 text-gray-300 group-hover:text-violet-400" />
                              {svc}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>

                {/* CTA to find salons */}
                <Link
                  href="/salons"
                  className="block w-full text-center bg-gradient-to-r from-violet-600 to-rose-500 hover:from-violet-700 hover:to-rose-600 text-white font-bold py-3.5 rounded-2xl shadow-lg transition-all"
                >
                  Find Salons Near Me →
                </Link>

                {/* Re-analyse with different photo */}
                <button
                  onClick={reset}
                  className="w-full text-center text-sm text-gray-500 hover:text-violet-600 py-2 transition-colors"
                >
                  ↺ Analyse a different photo
                </button>
              </>
            )}

            {/* Empty state when no analysis yet */}
            {!loading && !result && (
              <div className="bg-white/60 rounded-2xl border border-dashed border-gray-200 p-8 text-center">
                <Brain className="w-12 h-12 text-violet-200 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Your skin analysis will appear here</p>
                <p className="text-sm text-gray-400 mt-1">Take a photo or upload one, then tap &ldquo;Analyse My Skin&rdquo;</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
