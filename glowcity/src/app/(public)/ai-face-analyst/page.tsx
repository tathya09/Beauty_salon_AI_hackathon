'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { Camera, RefreshCw, Sparkles, Leaf, FlaskConical, Stethoscope, Flower2, ArrowRight, X } from 'lucide-react'
import Link from 'next/link'
import { MegaNav } from '@/components/discovery/MegaNav'

type TreatmentType = 'natural' | 'ayurvedic' | 'chemical' | 'dermat'

interface AnalysisResult {
  skinType: string
  concerns: string[]
  recommendations: {
    type: TreatmentType
    label: string
    services: string[]
    reason: string
  }[]
  overallScore: number
  glowTip: string
}

const TREATMENT_META: Record<TreatmentType, { icon: React.ReactNode; color: string; bg: string; border: string }> = {
  natural:  { icon: <Leaf className="w-5 h-5" />,        color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200' },
  ayurvedic:{ icon: <Flower2 className="w-5 h-5" />,     color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200' },
  chemical: { icon: <FlaskConical className="w-5 h-5" />, color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200'  },
  dermat:   { icon: <Stethoscope className="w-5 h-5" />,  color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200'},
}

export default function AIFaceAnalystPage() {
  const videoRef    = useRef<HTMLVideoElement>(null)
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const streamRef   = useRef<MediaStream | null>(null)   // always-current ref

  const [cameraOn,       setCameraOn]       = useState(false)
  const [capturedImage,  setCapturedImage]  = useState<string | null>(null)
  const [analysing,      setAnalysing]      = useState(false)
  const [result,         setResult]         = useState<AnalysisResult | null>(null)
  const [error,          setError]          = useState('')
  const [selectedType,   setSelectedType]   = useState<TreatmentType | null>(null)
  const [cameraError,    setCameraError]    = useState('')

  // ── KEY FIX: assign srcObject via effect so video element is always mounted ──
  useEffect(() => {
    if (cameraOn && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {/* autoplay policy — handled by playsInline */})
    }
  }, [cameraOn])

  const startCamera = useCallback(async () => {
    setCameraError('')
    setError('')
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = s
      setCapturedImage(null)
      setResult(null)
      setCameraOn(true)   // triggers the useEffect above to wire srcObject
    } catch (e: unknown) {
      const msg = e instanceof DOMException
        ? (e.name === 'NotAllowedError'
            ? 'Camera permission denied. Click the camera icon in your browser address bar to allow access.'
            : e.name === 'NotFoundError'
            ? 'No camera found on this device.'
            : `Camera error: ${e.message}`)
        : 'Could not start camera.'
      setCameraError(msg)
    }
  }, [])

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCameraOn(false)
  }, [])

  const capture = useCallback(() => {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    if (video.videoWidth === 0) {
      setCameraError('Video not ready yet — wait a moment then try again.')
      return
    }
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')!
    // mirror the capture to match the mirrored preview
    ctx.save()
    ctx.scale(-1, 1)
    ctx.drawImage(video, -canvas.width, 0)
    ctx.restore()
    const dataUrl = canvas.toDataURL('image/jpeg', 0.90)
    setCapturedImage(dataUrl)
    stopStream()
  }, [stopStream])

  const analyse = useCallback(async () => {
    if (!capturedImage) return
    setAnalysing(true)
    setError('')
    try {
      const res = await fetch('/api/ai/face-analyst', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: capturedImage.split(',')[1], preferredType: selectedType }),
      })
      if (!res.ok) throw new Error('Analysis failed')
      const data = await res.json()
      setResult(data)
    } catch {
      setError('Analysis failed. Please try again.')
    } finally {
      setAnalysing(false)
    }
  }, [capturedImage, selectedType])

  const reset = useCallback(() => {
    stopStream()
    setCapturedImage(null)
    setResult(null)
    setError('')
    setCameraError('')
  }, [stopStream])

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-rose-50">
      <MegaNav />

      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-violet-100 text-violet-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            AI-Powered Face &amp; Skin Analysis
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Discover Your{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-rose-500">
              Perfect Treatment
            </span>
          </h1>
          <p className="text-gray-500 max-w-xl mx-auto">
            Our AI analyses your skin type, tone, and concerns — then recommends the right approach:
            natural, ayurvedic, chemical, or dermat-grade treatments.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* ── Left: Camera ── */}
          <div className="space-y-4">
            {/* Video / captured frame */}
            <div className="relative bg-gray-900 rounded-2xl overflow-hidden aspect-[4/3]">
              {/* Video is ALWAYS rendered; we hide it when not needed via CSS */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover scale-x-[-1] ${cameraOn ? 'block' : 'hidden'}`}
              />

              {capturedImage && !cameraOn && (
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full h-full object-cover"
                />
              )}

              {!cameraOn && !capturedImage && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-8">
                  <Camera className="w-16 h-16 mb-3 opacity-30" />
                  <p className="text-sm">Click &ldquo;Start Camera&rdquo; to begin</p>
                  <p className="text-xs mt-1 opacity-60">Good lighting = better results</p>
                </div>
              )}

              {/* Face guide overlay */}
              {cameraOn && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  <div
                    className="border-2 border-white/40 rounded-full"
                    style={{ width: '55%', paddingBottom: '70%', position: 'absolute', top: '5%' }}
                  />
                  <p className="absolute bottom-4 text-white text-xs bg-black/40 px-3 py-1 rounded-full">
                    Center your face in the oval
                  </p>
                </div>
              )}
            </div>

            {/* Hidden canvas for capture */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Camera error */}
            {cameraError && (
              <div className="bg-orange-50 border border-orange-200 text-orange-700 text-sm px-4 py-3 rounded-xl">
                {cameraError}
              </div>
            )}

            {/* Controls */}
            <div className="flex gap-3">
              {!cameraOn && !capturedImage && (
                <button
                  onClick={startCamera}
                  className="flex-1 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-xl font-medium transition-colors"
                >
                  <Camera className="w-4 h-4" /> Start Camera
                </button>
              )}

              {cameraOn && (
                <>
                  <button
                    onClick={stopStream}
                    className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={capture}
                    className="flex-1 flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 text-white py-3 rounded-xl font-medium transition-colors"
                  >
                    📸 Capture Photo
                  </button>
                </>
              )}

              {capturedImage && !result && !analysing && (
                <>
                  <button
                    onClick={reset}
                    className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50"
                  >
                    <RefreshCw className="w-4 h-4" /> Retake
                  </button>
                  <button
                    onClick={analyse}
                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-rose-500 text-white py-3 rounded-xl font-medium hover:opacity-90"
                  >
                    <Sparkles className="w-4 h-4" /> Analyse My Skin
                  </button>
                </>
              )}

              {analysing && (
                <button disabled className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-rose-500 text-white py-3 rounded-xl font-medium opacity-70">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Analysing…
                </button>
              )}

              {result && (
                <button
                  onClick={reset}
                  className="flex-1 flex items-center justify-center gap-2 border border-gray-200 rounded-xl py-3 text-gray-600 hover:bg-gray-50"
                >
                  <RefreshCw className="w-4 h-4" /> Analyse Again
                </button>
              )}
            </div>

            {/* Treatment preference */}
            {!result && (
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Preferred approach (optional)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(['natural', 'ayurvedic', 'chemical', 'dermat'] as TreatmentType[]).map((type) => {
                    const meta = TREATMENT_META[type]
                    return (
                      <button
                        key={type}
                        onClick={() => setSelectedType(selectedType === type ? null : type)}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-all
                          ${selectedType === type
                            ? `${meta.bg} ${meta.border} ${meta.color} border-2`
                            : 'border-gray-100 text-gray-600 hover:bg-gray-50'}`}
                      >
                        <span className={meta.color}>{meta.icon}</span>
                        <span className="capitalize">{type}</span>
                        {selectedType === type && <X className="w-3 h-3 ml-auto" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}
          </div>

          {/* ── Right: Results ── */}
          <div className="space-y-4">
            {!result && !analysing && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col justify-center h-full">
                <h3 className="font-semibold text-gray-800 mb-4">What we analyse:</h3>
                <ul className="space-y-3 text-sm text-gray-600">
                  {[
                    ['🎨', 'Skin tone & undertone'],
                    ['💧', 'Hydration & oiliness level'],
                    ['⚡', 'Visible concerns (acne, pigmentation…)'],
                    ['🌿', 'Best treatment approach for your skin'],
                    ['💅', 'Recommended services across categories'],
                    ['⭐', 'Salon matching based on your profile'],
                  ].map(([icon, text]) => (
                    <li key={String(text)} className="flex items-start gap-3">
                      <span className="text-lg">{icon}</span>
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 p-3 bg-violet-50 rounded-lg text-xs text-violet-600">
                  💡 Your photo is processed in real-time and never stored.
                </div>
              </div>
            )}

            {analysing && (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-400 to-rose-400 mx-auto mb-4 flex items-center justify-center animate-pulse">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <p className="font-semibold text-gray-800">Analysing your skin…</p>
                <p className="text-sm text-gray-400 mt-1">Powered by Gemini Vision AI</p>
                <div className="mt-4 space-y-1.5 text-xs text-gray-400">
                  {['Detecting skin tone', 'Identifying concerns', 'Matching treatment approach', 'Generating recommendations'].map((s) => (
                    <p key={s} className="flex items-center justify-center gap-1">
                      <span className="w-3 h-3 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin inline-block" />
                      {s}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {result && (
              <div className="space-y-4 overflow-y-auto max-h-[80vh] pr-1">
                {/* Score banner */}
                <div className="bg-gradient-to-r from-violet-600 to-rose-500 rounded-2xl p-5 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-80">Skin Health Score</p>
                      <p className="text-4xl font-bold">
                        {result.overallScore}
                        <span className="text-lg opacity-70">/10</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm opacity-80">Skin Type</p>
                      <p className="font-semibold text-lg">{result.skinType}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm opacity-90 italic">&ldquo;{result.glowTip}&rdquo;</p>
                </div>

                {result.concerns.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Detected concerns
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {result.concerns.map((c) => (
                        <span key={c} className="px-2.5 py-1 bg-orange-50 text-orange-700 text-xs rounded-full border border-orange-100">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {result.recommendations.map((rec) => {
                  const meta = TREATMENT_META[rec.type]
                  return (
                    <div key={rec.type} className={`${meta.bg} ${meta.border} border rounded-xl p-4`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={meta.color}>{meta.icon}</span>
                        <span className={`font-semibold text-sm ${meta.color}`}>{rec.label}</span>
                      </div>
                      <p className="text-xs text-gray-600 mb-3">{rec.reason}</p>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {rec.services.map((s) => (
                          <span key={s} className="px-2 py-0.5 bg-white/70 text-gray-700 text-xs rounded-full border border-white">
                            {s}
                          </span>
                        ))}
                      </div>
                      <Link
                        href={`/salons?q=${encodeURIComponent(rec.services[0])}`}
                        className={`inline-flex items-center gap-1 text-xs font-semibold ${meta.color} hover:underline`}
                      >
                        Find {rec.label} salons <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
