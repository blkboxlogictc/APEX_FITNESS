'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, X, ChevronLeft, ChevronRight, Scale, Info, Loader2, Camera } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { processImageForVision } from '@/lib/vision/imageUtils'
import CameraCapture from '@/components/vision/CameraCapture'
import type { ProcessedImage } from '@/lib/vision/imageUtils'

interface ProgressPhoto {
  id: string
  storage_path: string
  public_url: string | null
  photo_date: string
  weight_kg: number | null
  body_fat_pct: number | null
  notes: string | null
  tags: string[]
  signedUrl?: string
}

type UploadPhase = 'IDLE' | 'CAMERA' | 'UPLOADING' | 'DETAILS'

export default function ProgressPhotosPage() {
  const [photos, setPhotos] = useState<ProgressPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>('IDLE')
  const [pendingFile, setPendingFile] = useState<{ blob: Blob; dataURL: string } | null>(null)
  const [detailForm, setDetailForm] = useState({ weight: '', bodyFat: '', notes: '', date: new Date().toISOString().split('T')[0] })
  const [uploading, setUploading] = useState(false)
  const [compareMode, setCompareMode] = useState(false)
  const [compareA, setCompareA] = useState<string | null>(null)
  const [compareB, setCompareB] = useState<string | null>(null)
  const [sliderPos, setSliderPos] = useState(50)
  const [selectedPhoto, setSelectedPhoto] = useState<ProgressPhoto | null>(null)
  const [signingUrls, setSigningUrls] = useState<Record<string, string>>({})
  const sliderRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const loadPhotos = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data } = await supabase
      .from('progress_photos')
      .select('*')
      .eq('user_id', user.id)
      .order('photo_date', { ascending: false })
    if (data) setPhotos(data as ProgressPhoto[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { loadPhotos() }, [loadPhotos])

  // Sign URLs for private bucket
  useEffect(() => {
    const unsigned = photos.filter(p => !signingUrls[p.id] && p.storage_path)
    if (unsigned.length === 0) return
    Promise.all(
      unsigned.map(async p => {
        const { data } = await supabase.storage
          .from('progress-photos')
          .createSignedUrl(p.storage_path, 3600)
        return { id: p.id, url: data?.signedUrl ?? '' }
      })
    ).then(results => {
      const map: Record<string, string> = {}
      results.forEach(r => { if (r.url) map[r.id] = r.url })
      setSigningUrls(prev => ({ ...prev, ...map }))
    })
  }, [photos, supabase, signingUrls])

  const handleCapture = async (image: ProcessedImage, dataURL: string) => {
    setPendingFile({ blob: new Blob([Uint8Array.from(atob(image.base64), c => c.charCodeAt(0))], { type: image.mimeType }), dataURL })
    setUploadPhase('DETAILS')
  }

  const uploadPhoto = async () => {
    if (!pendingFile) return
    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setUploading(false); return }

    const fileName = `${user.id}/${detailForm.date}_${Date.now()}.jpg`
    const { error: uploadError } = await supabase.storage
      .from('progress-photos')
      .upload(fileName, pendingFile.blob, { contentType: 'image/jpeg', upsert: false })

    if (uploadError) { setUploading(false); return }

    await supabase.from('progress_photos').insert({
      user_id: user.id,
      storage_path: fileName,
      photo_date: detailForm.date,
      weight_kg: detailForm.weight ? parseFloat(detailForm.weight) : null,
      body_fat_pct: detailForm.bodyFat ? parseFloat(detailForm.bodyFat) : null,
      notes: detailForm.notes || null,
      tags: [],
    })

    setUploading(false)
    setUploadPhase('IDLE')
    setPendingFile(null)
    setDetailForm({ weight: '', bodyFat: '', notes: '', date: new Date().toISOString().split('T')[0] })
    await loadPhotos()
  }

  const deletePhoto = async (photo: ProgressPhoto) => {
    await supabase.storage.from('progress-photos').remove([photo.storage_path])
    await supabase.from('progress_photos').delete().eq('id', photo.id)
    setPhotos(prev => prev.filter(p => p.id !== photo.id))
    setSelectedPhoto(null)
  }

  // Slider drag
  const onSliderDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = sliderRef.current?.getBoundingClientRect()
    if (!rect) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const move = (ev: PointerEvent) => {
      const pct = Math.max(5, Math.min(95, ((ev.clientX - rect.left) / rect.width) * 100))
      setSliderPos(pct)
    }
    document.addEventListener('pointermove', move)
    document.addEventListener('pointerup', () => document.removeEventListener('pointermove', move), { once: true })
  }

  if (uploadPhase === 'CAMERA') {
    return <CameraCapture mode="progress" onCapture={handleCapture} onClose={() => setUploadPhase('IDLE')} />
  }

  const photoUrl = (p: ProgressPhoto) => signingUrls[p.id] ?? p.public_url ?? ''

  const comparePhotoA = photos.find(p => p.id === compareA)
  const comparePhotoB = photos.find(p => p.id === compareB)

  return (
    <div className="min-h-screen bg-[#0A0A0F] pb-28">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0A0A0F]/90 backdrop-blur-sm px-4 pt-safe-top pb-3 border-b border-white/5">
        <div className="flex items-center justify-between">
          <h1 className="text-white font-bold text-xl">Progress Photos</h1>
          <div className="flex gap-2">
            {photos.length >= 2 && (
              <button
                onClick={() => { setCompareMode(m => !m); setCompareA(null); setCompareB(null) }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${compareMode ? 'bg-[#6C63FF] text-white' : 'bg-[#1E1E2E] text-white/60'}`}
              >
                Compare
              </button>
            )}
            <button
              onClick={() => setUploadPhase('CAMERA')}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}
            >
              <Plus size={20} className="text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Details form overlay */}
      {uploadPhase === 'DETAILS' && pendingFile && (
        <div className="fixed inset-0 z-50 bg-[#0A0A0F] flex flex-col">
          <div className="flex items-center gap-3 px-4 pt-safe-top pb-3 border-b border-white/5">
            <button onClick={() => setUploadPhase('IDLE')} className="p-2 -ml-2"><X size={22} className="text-white/60" /></button>
            <p className="text-white font-semibold text-sm flex-1">Add Details</p>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pendingFile.dataURL} alt="Preview" className="w-full max-h-64 object-cover rounded-2xl" />
            <div className="space-y-3">
              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider">Date</label>
                <input type="date" value={detailForm.date} onChange={e => setDetailForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full mt-1 bg-[#1E1E2E] rounded-xl px-4 py-3 text-white outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider">Weight (kg)</label>
                  <input type="number" value={detailForm.weight} onChange={e => setDetailForm(f => ({ ...f, weight: e.target.value }))}
                    placeholder="e.g. 75.5" className="w-full mt-1 bg-[#1E1E2E] rounded-xl px-4 py-3 text-white outline-none placeholder:text-white/20" />
                </div>
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider">Body Fat %</label>
                  <input type="number" value={detailForm.bodyFat} onChange={e => setDetailForm(f => ({ ...f, bodyFat: e.target.value }))}
                    placeholder="e.g. 18.5" className="w-full mt-1 bg-[#1E1E2E] rounded-xl px-4 py-3 text-white outline-none placeholder:text-white/20" />
                </div>
              </div>
              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider">Notes</label>
                <textarea value={detailForm.notes} onChange={e => setDetailForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="How are you feeling? Any measurements?" rows={3}
                  className="w-full mt-1 bg-[#1E1E2E] rounded-xl px-4 py-3 text-white outline-none placeholder:text-white/20 resize-none" />
              </div>
            </div>
          </div>
          <div className="px-4 pb-safe-bottom pt-4">
            <button onClick={uploadPhoto} disabled={uploading}
              className="w-full py-4 rounded-2xl font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}>
              {uploading ? <Loader2 size={18} className="animate-spin" /> : 'Save Progress Photo'}
            </button>
          </div>
        </div>
      )}

      {/* Compare mode */}
      {compareMode && compareA && compareB && comparePhotoA && comparePhotoB && (
        <div className="fixed inset-0 z-40 bg-black flex flex-col">
          <div className="flex items-center px-4 pt-safe-top pb-3">
            <button onClick={() => setCompareMode(false)} className="p-2 -ml-2 text-white">
              <X size={22} />
            </button>
            <p className="text-white font-semibold ml-2">Before / After</p>
          </div>
          <div ref={sliderRef} className="flex-1 relative overflow-hidden select-none" onPointerDown={onSliderDrag}>
            {/* Before (left/bottom) */}
            <div className="absolute inset-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl(comparePhotoB)} alt="After" className="w-full h-full object-cover" />
            </div>
            {/* After (right/top) with clip */}
            <div className="absolute inset-0 overflow-hidden" style={{ width: `${sliderPos}%` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl(comparePhotoA)} alt="Before" className="absolute inset-0 w-full h-full object-cover"
                style={{ width: `${10000 / sliderPos}%` }} />
            </div>
            {/* Divider */}
            <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg" style={{ left: `${sliderPos}%` }}>
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center">
                <ChevronLeft size={14} className="text-black -mr-1" />
                <ChevronRight size={14} className="text-black -ml-1" />
              </div>
            </div>
            {/* Labels */}
            <div className="absolute top-4 left-4 bg-black/50 rounded-full px-3 py-1 text-white text-xs">{comparePhotoA.photo_date}</div>
            <div className="absolute top-4 right-4 bg-black/50 rounded-full px-3 py-1 text-white text-xs">{comparePhotoB.photo_date}</div>
          </div>
          <div className="pb-safe-bottom px-4 py-3 bg-black/80">
            <button onClick={() => { setCompareA(null); setCompareB(null) }}
              className="w-full py-3 bg-[#1E1E2E] rounded-xl text-white/60 text-sm">
              Choose Different Photos
            </button>
          </div>
        </div>
      )}

      {/* Compare selection */}
      {compareMode && !(compareA && compareB) && (
        <div className="px-4 py-3 bg-[#6C63FF]/10 border-b border-[#6C63FF]/20">
          <p className="text-[#6C63FF] text-sm">
            {!compareA ? 'Tap a photo to select "Before"' : 'Tap another photo to select "After"'}
          </p>
        </div>
      )}

      {/* Photo grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="text-[#6C63FF] animate-spin" />
        </div>
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-8 text-center gap-4">
          <div className="w-20 h-20 rounded-full bg-[#1E1E2E] flex items-center justify-center">
            <Camera size={32} className="text-white/30" />
          </div>
          <p className="text-white/50 text-sm">Track your visual progress over time with photos</p>
          <button onClick={() => setUploadPhase('CAMERA')}
            className="px-5 py-2.5 rounded-xl text-white text-sm font-medium"
            style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}>
            Add First Photo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-0.5 mt-0.5">
          {photos.map(photo => (
            <button
              key={photo.id}
              onClick={() => {
                if (compareMode) {
                  if (!compareA) setCompareA(photo.id)
                  else if (photo.id !== compareA) setCompareB(photo.id)
                } else {
                  setSelectedPhoto(photo)
                }
              }}
              className={`relative aspect-square overflow-hidden ${
                compareMode && (compareA === photo.id || compareB === photo.id)
                  ? 'ring-2 ring-[#6C63FF]' : ''
              }`}
            >
              {photoUrl(photo) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl(photo)} alt={photo.photo_date} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[#1E1E2E] flex items-center justify-center">
                  <Loader2 size={20} className="text-white/20 animate-spin" />
                </div>
              )}
              {photo.weight_kg && (
                <div className="absolute bottom-1 left-1 flex items-center gap-0.5 bg-black/60 rounded-full px-1.5 py-0.5">
                  <Scale size={9} className="text-white/70" />
                  <span className="text-white/70 text-xs">{photo.weight_kg}kg</span>
                </div>
              )}
              {compareMode && compareA === photo.id && (
                <div className="absolute top-1 right-1 bg-[#6C63FF] rounded-full w-5 h-5 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">A</span>
                </div>
              )}
              {compareMode && compareB === photo.id && (
                <div className="absolute top-1 right-1 bg-[#00D4AA] rounded-full w-5 h-5 flex items-center justify-center">
                  <span className="text-black text-xs font-bold">B</span>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Photo detail modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="flex items-center px-4 pt-safe-top pb-3 bg-black/80">
            <button onClick={() => setSelectedPhoto(null)} className="p-2 -ml-2 text-white"><X size={22} /></button>
            <p className="text-white font-semibold ml-2 flex-1">{selectedPhoto.photo_date}</p>
            <button
              onClick={() => { if (confirm('Delete this photo?')) deletePhoto(selectedPhoto) }}
              className="p-2 text-red-400 text-sm"
            >
              Delete
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl(selectedPhoto)} alt="Progress" className="max-h-full max-w-full object-contain" />
          </div>
          {(selectedPhoto.weight_kg || selectedPhoto.body_fat_pct || selectedPhoto.notes) && (
            <div className="pb-safe-bottom px-4 py-4 bg-black/80 space-y-2">
              {(selectedPhoto.weight_kg || selectedPhoto.body_fat_pct) && (
                <div className="flex gap-4">
                  {selectedPhoto.weight_kg && (
                    <div className="flex items-center gap-1.5">
                      <Scale size={14} className="text-white/40" />
                      <span className="text-white font-medium text-sm">{selectedPhoto.weight_kg} kg</span>
                    </div>
                  )}
                  {selectedPhoto.body_fat_pct && (
                    <div className="flex items-center gap-1.5">
                      <Info size={14} className="text-white/40" />
                      <span className="text-white font-medium text-sm">{selectedPhoto.body_fat_pct}% BF</span>
                    </div>
                  )}
                </div>
              )}
              {selectedPhoto.notes && (
                <p className="text-white/60 text-sm">{selectedPhoto.notes}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
