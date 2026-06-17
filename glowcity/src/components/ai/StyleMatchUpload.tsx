'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Upload, ImageIcon, X } from 'lucide-react'

interface StyleMatchUploadProps {
  onUploadComplete: (base64Data: string, mimeType: string, previewUrl: string) => void
  loading?: boolean
}

export function StyleMatchUpload({ onUploadComplete, loading }: StyleMatchUploadProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function processFile(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (JPEG or PNG)')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      setPreview(dataUrl)
      // Extract base64 and mimeType from data URL
      const [header, base64Data] = dataUrl.split(',')
      const mimeType = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
      onUploadComplete(base64Data, mimeType, dataUrl)
    }
    reader.readAsDataURL(file)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  function reset() {
    setPreview(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onClick={() => !preview && inputRef.current?.click()}
      className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
        dragging ? 'border-rose-400 bg-rose-50' :
        preview ? 'border-rose-200 bg-white cursor-default' :
        'border-rose-200 hover:border-rose-400 hover:bg-rose-50/50 cursor-pointer'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleChange}
        className="hidden"
      />

      {preview ? (
        <div className="space-y-3">
          <div className="relative inline-block">
            <img
              src={preview}
              alt="Your inspiration"
              className="max-h-56 mx-auto rounded-xl object-cover shadow-md"
            />
            <button
              onClick={(e) => { e.stopPropagation(); reset() }}
              className="absolute -top-2 -right-2 w-6 h-6 bg-gray-800 text-white rounded-full flex items-center justify-center hover:bg-gray-900"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <p className="text-sm text-gray-500">
            {loading ? '✨ Analysing your style with AI…' : '✅ Image ready'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto">
            <ImageIcon className="w-8 h-8 text-rose-400" />
          </div>
          <div>
            <p className="font-semibold text-gray-700 text-lg">Drop your inspiration photo here</p>
            <p className="text-sm text-gray-400 mt-1">or click to browse · JPEG/PNG · max 5MB</p>
          </div>
          <Button variant="outline" className="border-rose-200 text-rose-500 hover:bg-rose-50 pointer-events-none">
            <Upload className="w-4 h-4 mr-2" /> Choose Photo
          </Button>
        </div>
      )}
    </div>
  )
}
