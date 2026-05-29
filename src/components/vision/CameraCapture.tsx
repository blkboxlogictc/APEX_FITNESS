'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { X, Camera, RotateCcw, Zap, ZapOff, Image as ImageIcon, FlipHorizontal } from 'lucide-react'
import { processImageForVision, type ProcessedImage } from '@/lib/vision/imageUtils'

export type CameraMode = 'meal' | 'label' | 'barcode' | 'form-check' | 'progress'

interface Props {
  mode: CameraMode
  onCapture: (image: ProcessedImage, dataURL: string) => void
  onClose: () => void
}

const MODE_CONFIG: Record<CameraMode, { label: string; hint: string; overlayClass: string }> = {
  meal: {
    label: 'Photograph Meal',
    hint: 'Centre your meal in frame',
    overlayClass: 'border-[#00D4AA]',
  },
  label: {
    label: 'Scan Label',
    hint: 'Hold label steady — keep text sharp',
    overlayClass: 'border-[#6C63FF]',
  },
  barcode: {
    label: 'Scan Barcode',
    hint: 'Align barcode within the lines',
    overlayClass: 'border-white',
  },
  'form-check': {
    label: 'Check Form',
    hint: 'Capture full body in frame',
    overlayClass: 'border-[#FF6B35]',
  },
  progress: {
    label: 'Progress Photo',
    hint: 'Stand in good lighting',
    overlayClass: 'border-[#FECB02]',
  },
}

export default function CameraCapture({ mode, onCapture, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [torchOn, setTorchOn] = useState(false)
  const [hasTorch, setHasTorch] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  const cfg = MODE_CONFIG[mode]

  const startCamera = useCallback(async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
    }
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      // Check for torch
      const track = stream.getVideoTracks()[0]
      const caps = track.getCapabilities?.() as { torch?: boolean } | undefined
      setHasTorch(!!caps?.torch)
    } catch {
      setCameraError('Camera access denied. Please allow camera permissions and try again.')
    }
  }, [facingMode])

  useEffect(() => {
    startCamera()
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()) }
  }, [startCamera])

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    const next = !torchOn
    await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] })
    setTorchOn(next)
  }

  const capture = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')!.drawImage(video, 0, 0)
    const dataURL = canvas.toDataURL('image/jpeg', 0.9)
    setPreview(dataURL)
  }

  const retake = () => {
    setPreview(null)
    setProcessing(false)
  }

  const confirm = async () => {
    if (!preview) return
    setProcessing(true)
    const processed = await processImageForVision(preview)
    onCapture(processed, preview)
  }

  const pickFromGallery = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      setProcessing(true)
      const processed = await processImageForVision(file)
      const url = URL.createObjectURL(file)
      setPreview(url)
      onCapture(processed, url)
    }
    input.click()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 pt-safe-top pb-3 bg-gradient-to-b from-black/70 to-transparent">
        <button onClick={onClose} className="p-2 rounded-full bg-black/40 text-white">
          <X size={22} />
        </button>
        <div className="text-center">
          <p className="text-white font-semibold text-sm">{cfg.label}</p>
          <p className="text-white/60 text-xs">{cfg.hint}</p>
        </div>
        <div className="flex gap-2">
          {hasTorch && !preview && (
            <button onClick={toggleTorch} className="p-2 rounded-full bg-black/40 text-white">
              {torchOn ? <Zap size={20} className="text-[#FECB02]" /> : <ZapOff size={20} />}
            </button>
          )}
          {!preview && (
            <button onClick={() => setFacingMode(f => f === 'environment' ? 'user' : 'environment')} className="p-2 rounded-full bg-black/40 text-white">
              <FlipHorizontal size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Viewfinder / Preview */}
      <div className="flex-1 relative overflow-hidden">
        {cameraError ? (
          <div className="flex items-center justify-center h-full px-8 text-center">
            <div>
              <p className="text-white/60 text-sm mb-4">{cameraError}</p>
              <button onClick={startCamera} className="px-4 py-2 bg-[#6C63FF] rounded-xl text-white text-sm font-medium">
                Retry
              </button>
            </div>
          </div>
        ) : preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Captured" className="w-full h-full object-contain" />
        ) : (
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
        )}

        {/* Mode overlay */}
        {!preview && !cameraError && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {mode === 'barcode' ? (
              <div className="w-64 h-32 border-2 border-white rounded-xl relative">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-lg" />
              </div>
            ) : mode === 'label' ? (
              <div className={`w-72 h-96 border-2 ${cfg.overlayClass} rounded-xl opacity-70`} />
            ) : mode === 'form-check' || mode === 'progress' ? (
              <div className={`w-48 h-80 border-2 ${cfg.overlayClass} rounded-full opacity-50`} />
            ) : (
              <div className={`w-72 h-56 border-2 ${cfg.overlayClass} rounded-xl opacity-60`} />
            )}
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* Controls */}
      <div className="pb-safe-bottom bg-gradient-to-t from-black/80 to-transparent pt-6 pb-8">
        {preview ? (
          <div className="flex items-center justify-center gap-8 px-8">
            <button onClick={retake} className="flex flex-col items-center gap-1">
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                <RotateCcw size={24} className="text-white" />
              </div>
              <span className="text-white/70 text-xs">Retake</span>
            </button>
            <button
              onClick={confirm}
              disabled={processing}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#6C63FF] to-[#00D4AA] flex items-center justify-center shadow-lg shadow-[#6C63FF]/40">
                {processing ? (
                  <div className="w-7 h-7 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Camera size={28} className="text-white" />
                )}
              </div>
              <span className="text-white/70 text-xs">{processing ? 'Processing…' : 'Use Photo'}</span>
            </button>
            <div className="w-14 h-14" /> {/* spacer */}
          </div>
        ) : (
          <div className="flex items-center justify-center gap-10 px-8">
            <button onClick={pickFromGallery} className="flex flex-col items-center gap-1">
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                <ImageIcon size={22} className="text-white" />
              </div>
              <span className="text-white/70 text-xs">Gallery</span>
            </button>
            <button onClick={capture} className="flex flex-col items-center gap-1">
              <div className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-white" />
              </div>
            </button>
            <div className="w-14 h-14" />
          </div>
        )}
      </div>
    </div>
  )
}
