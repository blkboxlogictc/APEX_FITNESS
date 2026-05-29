'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { X, Check, Loader2, ChevronRight, Search, AlertCircle } from 'lucide-react'

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'pre_workout' | 'post_workout'

interface FoodProduct {
  id: string
  name: string
  brand: string | null
  barcode: string
  servingSize: string
  servingQuantity: number
  nutrition: {
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber: number
    sugar: number
    sodium: number
    saturatedFat: number
  }
  nutriscoreGrade: string | null
  novaGroup: number | null
}

interface Props {
  defaultMeal?: MealType
  onLogged?: () => void
  onClose: () => void
}

type Phase = 'SCANNING' | 'PROCESSING' | 'FOUND' | 'NOT_FOUND' | 'LOGGING' | 'DONE'

const NUTRISCORE_COLORS: Record<string, string> = {
  A: '#038141', B: '#85BB2F', C: '#FECB02', D: '#EE8100', E: '#E63312',
}
const NOVA_LABELS: Record<number, string> = {
  1: 'Unprocessed', 2: 'Culinary', 3: 'Processed', 4: 'Ultra-processed',
}

declare global {
  interface Window {
    BarcodeDetector: new (opts: { formats: string[] }) => {
      detect: (img: HTMLVideoElement | HTMLImageElement) => Promise<Array<{ rawValue: string }>>
    }
  }
}

export default function BarcodeScanner({ defaultMeal = 'snack', onLogged, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('SCANNING')
  const [product, setProduct] = useState<FoodProduct | null>(null)
  const [servings, setServings] = useState(1)
  const [meal, setMeal] = useState<MealType>(defaultMeal)
  const [manualCode, setManualCode] = useState('')
  const [showManual, setShowManual] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanningRef = useRef(false)

  const lookupBarcode = useCallback(async (code: string) => {
    setPhase('PROCESSING')
    try {
      const fd = new FormData()
      fd.append('barcode', code)
      const res = await fetch('/api/vision/barcode', { method: 'POST', body: fd })
      const data = await res.json() as { found: boolean; product?: FoodProduct; error?: string }
      if (data.found && data.product) {
        setProduct(data.product)
        setPhase('FOUND')
      } else {
        setPhase('NOT_FOUND')
      }
    } catch {
      setPhase('NOT_FOUND')
    }
  }, [])

  const startNativeScanning = useCallback(async () => {
    if (!('BarcodeDetector' in window)) return false
    try {
      const detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'qr_code'] })
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      scanningRef.current = true
      const scan = async () => {
        if (!scanningRef.current || !videoRef.current) return
        try {
          const results = await detector.detect(videoRef.current)
          if (results.length > 0) {
            scanningRef.current = false
            streamRef.current?.getTracks().forEach(t => t.stop())
            await lookupBarcode(results[0].rawValue)
            return
          }
        } catch { /* ignore frame errors */ }
        if (scanningRef.current) requestAnimationFrame(scan)
      }
      requestAnimationFrame(scan)
      return true
    } catch {
      return false
    }
  }, [lookupBarcode])

  useEffect(() => {
    startNativeScanning().then(started => {
      if (!started) setShowManual(true)
    })
    return () => {
      scanningRef.current = false
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [startNativeScanning])

  const logFood = async () => {
    if (!product) return
    setPhase('LOGGING')
    const n = product.nutrition
    const today = new Date().toISOString().split('T')[0]
    try {
      await fetch('/api/nutrition/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          food_id: product.id,
          food_name: product.name,
          brand: product.brand,
          meal_type: meal,
          servings,
          serving_size_label: product.servingSize,
          calories: Math.round(n.calories * servings),
          protein_g: n.protein * servings,
          carbs_g: n.carbs * servings,
          fat_g: n.fat * servings,
          fiber_g: n.fiber * servings,
          sugar_g: n.sugar * servings,
          sodium_mg: n.sodium * servings,
          saturated_fat_g: n.saturatedFat * servings,
          logged_at: today,
        }),
      })
      setPhase('DONE')
      onLogged?.()
    } catch {
      setError('Failed to log. Please try again.')
      setPhase('FOUND')
    }
  }

  if (phase === 'DONE') {
    return (
      <div className="fixed inset-0 z-50 bg-[#0A0A0F] flex flex-col items-center justify-center gap-4">
        <div className="w-20 h-20 rounded-full bg-[#00D4AA]/20 flex items-center justify-center">
          <Check size={36} className="text-[#00D4AA]" />
        </div>
        <p className="text-white text-xl font-bold">Logged!</p>
        <button onClick={onClose} className="mt-4 px-6 py-2.5 bg-[#6C63FF] rounded-xl text-white font-medium">Done</button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0A0F] flex flex-col">
      <div className="flex items-center gap-3 px-4 pt-safe-top pb-3 border-b border-white/5">
        <button onClick={onClose} className="p-2 -ml-2"><X size={22} className="text-white/60" /></button>
        <p className="text-white font-semibold text-sm flex-1">Barcode Scanner</p>
      </div>

      {phase === 'SCANNING' && (
        <div className="flex-1 flex flex-col">
          {/* Video preview */}
          <div className="relative flex-1 overflow-hidden">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-32 border-2 border-white rounded-xl relative">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-[#00D4AA] rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-[#00D4AA] rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-[#00D4AA] rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-[#00D4AA] rounded-br-lg" />
                <div className="absolute inset-x-0 top-1/2 h-0.5 bg-[#00D4AA]/60 animate-pulse" />
              </div>
            </div>
            <p className="absolute bottom-4 left-0 right-0 text-center text-white/60 text-sm">
              Align barcode within the frame
            </p>
          </div>
          <div className="px-4 py-4 space-y-3">
            {showManual && (
              <div className="flex gap-2">
                <input
                  value={manualCode}
                  onChange={e => setManualCode(e.target.value.replace(/\D/g, '').slice(0, 14))}
                  placeholder="Enter barcode number…"
                  inputMode="numeric"
                  className="flex-1 bg-[#1E1E2E] rounded-xl px-4 py-3 text-white text-sm outline-none placeholder:text-white/30"
                />
                <button
                  onClick={() => manualCode.length >= 8 && lookupBarcode(manualCode)}
                  disabled={manualCode.length < 8}
                  className="px-4 py-3 bg-[#6C63FF] rounded-xl text-white disabled:opacity-40"
                >
                  <Search size={18} />
                </button>
              </div>
            )}
            <button
              onClick={() => setShowManual(s => !s)}
              className="w-full py-3 bg-[#1E1E2E] rounded-xl text-white/60 text-sm flex items-center justify-center gap-2"
            >
              {showManual ? 'Hide manual entry' : 'Enter code manually'}
            </button>
          </div>
        </div>
      )}

      {phase === 'PROCESSING' && (
        <div className="flex-1 flex items-center justify-center gap-3">
          <Loader2 size={24} className="text-[#6C63FF] animate-spin" />
          <p className="text-white/60 text-sm">Looking up product…</p>
        </div>
      )}

      {phase === 'NOT_FOUND' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
          <AlertCircle size={40} className="text-[#EE8100]" />
          <p className="text-white font-semibold">Product not found</p>
          <p className="text-white/40 text-sm">This barcode isn't in our database yet.</p>
          <div className="flex gap-3 mt-2">
            <button onClick={() => { setPhase('SCANNING'); startNativeScanning() }} className="px-4 py-2.5 bg-[#1E1E2E] rounded-xl text-white text-sm">Scan Again</button>
          </div>
        </div>
      )}

      {(phase === 'FOUND' || phase === 'LOGGING') && product && (
        <div className="flex-1 overflow-y-auto pb-36 px-4">
          {error && <p className="text-red-400 text-sm text-center py-2">{error}</p>}
          <div className="mt-4 bg-[#1E1E2E] rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-white font-bold text-base leading-tight">{product.name}</p>
                {product.brand && <p className="text-white/50 text-sm mt-0.5">{product.brand}</p>}
                <p className="text-white/30 text-xs mt-1">Serving: {product.servingSize}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {product.nutriscoreGrade && (
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-white text-sm"
                    style={{ background: NUTRISCORE_COLORS[product.nutriscoreGrade] ?? '#555' }}>
                    {product.nutriscoreGrade}
                  </div>
                )}
                {product.novaGroup && (
                  <div className="px-2 h-8 rounded-lg flex items-center text-white text-xs font-bold"
                    style={{ background: product.novaGroup === 1 ? '#038141' : product.novaGroup === 2 ? '#85BB2F' : product.novaGroup === 3 ? '#EE8100' : '#E63312' }}>
                    NOVA {product.novaGroup}
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'kcal', val: Math.round(product.nutrition.calories * servings) },
                { label: 'protein', val: `${(product.nutrition.protein * servings).toFixed(1)}g` },
                { label: 'carbs', val: `${(product.nutrition.carbs * servings).toFixed(1)}g` },
                { label: 'fat', val: `${(product.nutrition.fat * servings).toFixed(1)}g` },
              ].map(m => (
                <div key={m.label} className="bg-[#0A0A0F] rounded-xl p-2 text-center">
                  <p className="text-white font-bold text-sm">{m.val}</p>
                  <p className="text-white/40 text-xs">{m.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between bg-[#1E1E2E] rounded-2xl px-4 py-3">
            <p className="text-white/60 text-sm">Servings</p>
            <div className="flex items-center gap-3">
              <button onClick={() => setServings(s => Math.max(0.25, Math.round((s - 0.25) * 4) / 4))}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white">−</button>
              <span className="text-white font-bold w-8 text-center">{servings}</span>
              <button onClick={() => setServings(s => Math.round((s + 0.25) * 4) / 4)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white">+</button>
            </div>
          </div>

          <div className="mt-3 flex gap-2 flex-wrap">
            {(['breakfast', 'lunch', 'dinner', 'snack', 'pre_workout', 'post_workout'] as MealType[]).map(m => (
              <button key={m} onClick={() => setMeal(m)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${meal === m ? 'bg-[#6C63FF] text-white' : 'bg-[#1E1E2E] text-white/50'}`}>
                {m.replace('_', '-')}
              </button>
            ))}
          </div>

          {product.novaGroup && (
            <div className="mt-3 px-3 py-2 rounded-xl" style={{ background: product.novaGroup >= 3 ? '#EE8100/10' : '#038141/10' }}>
              <p className="text-white/60 text-xs">
                {NOVA_LABELS[product.novaGroup]} food — {product.novaGroup >= 4 ? 'minimise consumption' : product.novaGroup >= 3 ? 'eat in moderation' : 'good choice'}
              </p>
            </div>
          )}
        </div>
      )}

      {(phase === 'FOUND' || phase === 'LOGGING') && product && (
        <div className="absolute bottom-0 left-0 right-0 pb-safe-bottom px-4 pt-4 bg-gradient-to-t from-[#0A0A0F] to-transparent">
          <button onClick={logFood} disabled={phase === 'LOGGING'}
            className="w-full py-4 rounded-2xl font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}>
            {phase === 'LOGGING' ? <Loader2 size={18} className="animate-spin" /> : (
              <>Log Food <ChevronRight size={18} /></>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
