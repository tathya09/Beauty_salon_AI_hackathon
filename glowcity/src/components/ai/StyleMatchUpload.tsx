'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '@/lib/firebase/client'
import { useAuth } from '@/hooks/useAuth'
import { Upload, ImageIcon } from 'lucide-react'

interface StyleMatchUploadProps {
  onUploadComplete: (url: string) => void
  loading?: boolean
}

export function StyleMatchUpload({ onUploadComplete, loading }: StyleMatchUploadProps) {
  const { firebaseUser } = useAuth()
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (JPEG or PNG)')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB. Please compress and try again.')
      return
    }

    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    setUploading(true)

    try {
      const uid = firebaseUser?.uid ?? 'anonymous'
      const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`
      const storageRef = ref(storage, `uploads/${uid}/${filename}`)
      await uploadBytes(storageRef, file)
      const downloadUrl = await getDownloadURL(storageRef)
      onUploadComplete(downloadUrl)
    } catch {
      toast.error('Upload failed. Please try again.')
      setPreview(null)
    } finally {
      setUploading(false)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => inputRef.current?.click()}
      className="border-2 border-dashed border-rose-200 rounded-2xl p-8 text-center cursor-pointer hover:border-rose-400 hover:bg-rose-50/50 transition-all"
    >
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleChange} className="hidden" />
      {preview ? (
        <div className="space-y-3">
          <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-xl object-cover" />
          <p className="text-sm text-gray-500">{uploading ? 'Uploading…' : loading ? 'Analysing with AI…' : 'Image ready — results loading'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto">
            <ImageIcon className="w-8 h-8 text-rose-400" />
          </div>
          <div>
            <p className="font-semibold text-gray-700">Drop your inspiration photo here</p>
            <p className="text-sm text-gray-400 mt-1">or click to browse · JPEG/PNG · max 5MB</p>
          </div>
          <Button variant="outline" className="border-rose-200 text-rose-500 hover:bg-rose-50">
            <Upload className="w-4 h-4 mr-2" /> Choose Photo
          </Button>
        </div>
      )}
    </div>
  )
}
