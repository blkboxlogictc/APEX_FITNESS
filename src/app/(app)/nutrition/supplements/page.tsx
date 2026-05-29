'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, Plus, X, ChevronDown, ChevronUp, Loader2,
  Sparkles, Trash2, Clock, Pill, AlertTriangle, CheckCircle2,
  Info, Zap,
} from 'lucide-react'
import type { SupplementItem, SupplementAIAnalysis, SupplementIngredient } from '@/types/nutrition'

const SUPPLEMENT_TYPES = [
  { value: 'protein', label: 'Protein', emoji: '💪' },
  { value: 'creatine', label: 'Creatine', emoji: '⚡' },
  { value: 'pre_workout', label: 'Pre-Workout', emoji: '🔥' },
  { value: 'bcaa', label: 'BCAA / EAA', emoji: '🧬' },
  { value: 'omega3', label: 'Omega-3', emoji: '🐟' },
  { value: 'vitamin', label: 'Vitamin', emoji: '💊' },
  { value: 'mineral', label: 'Mineral', emoji: '🪨' },
  { value: 'probiotic', label: 'Probiotic', emoji: '🦠' },
  { value: 'greens', label: 'Greens / Superfoods', emoji: '🥦' },
  { value: 'collagen', label: 'Collagen', emoji: '✨' },
  { value: 'fat_burner', label: 'Fat Burner', emoji: '🔥' },
  { value: 'sleep', label: 'Sleep / Recovery', emoji: '🌙' },
  { value: 'other', label: 'Other', emoji: '💊' },
]

const TIMING_OPTIONS = [
  'Morning', 'Pre-workout', 'Intra-workout', 'Post-workout', 'With meals', 'Evening', 'Before bed'
]

const EVIDENCE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  strong: { bg: '#038141', text: '#fff', label: 'Strong Evidence' },
  moderate: { bg: '#85BB2F', text: '#fff', label: 'Moderate Evidence' },
  limited: { bg: '#EE8100', text: '#fff', label: 'Limited Evidence' },
  none: { bg: '#E63312', text: '#fff', label: 'No Evidence' },
}

interface AddFormState {
  step: 1 | 2 | 3 | 4
  name: string
  brand: string
  supplement_type: string
  serving_size: string
  calories_per_serving: string
  protein_g_per_serving: string
  ingredients: string
  timing_recommendation: string
  daily_timing: string[]
  ai_notes: string
  ai_analysis: SupplementAIAnalysis | null
  analyzing: boolean
  saving: boolean
}

const EMPTY_FORM: AddFormState = {
  step: 1,
  name: '',
  brand: '',
  supplement_type: '',
  serving_size: '1 scoop',
  calories_per_serving: '',
  protein_g_per_serving: '',
  ingredients: '',
  timing_recommendation: '',
  daily_timing: [],
  ai_notes: '',
  ai_analysis: null,
  analyzing: false,
  saving: false,
}

function SupplementCard({ supp, onDelete }: { supp: SupplementItem; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const typeInfo = SUPPLEMENT_TYPES.find(t => t.value === supp.supplement_type) ?? { emoji: '💊', label: supp.supplement_type }

  let analysis: SupplementAIAnalysis | null = null
  try {
    if (supp.ai_notes) analysis = JSON.parse(supp.ai_notes) as SupplementAIAnalysis
  } catch { /* not JSON ai notes */ }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/nutrition/supplements/${supp.id}`, { method: 'DELETE' })
      if (res.ok) onDelete(supp.id)
    } catch { /* silent */ }
    finally { setDeleting(false) }
  }

  const evidenceInfo = analysis ? EVIDENCE_COLORS[analysis.evidence_level] ?? EVIDENCE_COLORS.limited : null

  return (
    <div className="bg-[#13131A] border border-[#1E1E2E] rounded-card overflow-hidden">
      <button onClick={() => setExpanded(v => !v)} className="w-full text-left p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1E1E2E] flex items-center justify-center flex-shrink-0 text-xl">
              {typeInfo.emoji}
            </div>
            <div>
              <p className="text-sm font-semibold text-[#F0F0FF]">{supp.name}</p>
              {supp.brand && <p className="text-[10px] text-[#6B7280]">{supp.brand}</p>}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-[10px] text-[#6B7280] bg-[#1E1E2E] px-2 py-0.5 rounded-full">
                  {typeInfo.label}
                </span>
                {supp.timing_recommendation && (
                  <span className="text-[10px] text-[#6C63FF] flex items-center gap-0.5">
                    <Clock size={9} />
                    {supp.timing_recommendation}
                  </span>
                )}
                {evidenceInfo && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: evidenceInfo.bg, color: evidenceInfo.text }}>
                    {evidenceInfo.label}
                  </span>
                )}
              </div>
            </div>
          </div>
          {expanded ? <ChevronUp size={15} className="text-[#6B7280] flex-shrink-0 mt-1" /> : <ChevronDown size={15} className="text-[#6B7280] flex-shrink-0 mt-1" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-[#1E1E2E] pt-3 space-y-4">
          {/* Serving info */}
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-sm font-bold text-[#F0F0FF]">{supp.serving_size}</p>
              <p className="text-[9px] text-[#6B7280]">Serving size</p>
            </div>
            {supp.calories_per_serving > 0 && (
              <div className="text-center">
                <p className="text-sm font-bold text-[#FF6B35]">{supp.calories_per_serving}</p>
                <p className="text-[9px] text-[#6B7280]">Calories</p>
              </div>
            )}
            {supp.protein_g_per_serving > 0 && (
              <div className="text-center">
                <p className="text-sm font-bold text-[#6C63FF]">{supp.protein_g_per_serving}g</p>
                <p className="text-[9px] text-[#6B7280]">Protein</p>
              </div>
            )}
          </div>

          {/* Key ingredients */}
          {supp.key_ingredients && supp.key_ingredients.length > 0 && (
            <div>
              <p className="text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold mb-1.5">Key Ingredients</p>
              <div className="flex flex-wrap gap-1.5">
                {(supp.key_ingredients as SupplementIngredient[]).map((ing, i) => (
                  <span key={i} className="text-[10px] text-[#F0F0FF] bg-[#1E1E2E] px-2 py-0.5 rounded-full">
                    {ing.name} {ing.amount}{ing.unit}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* AI Analysis */}
          {analysis && (
            <div className="space-y-3 bg-[#0A0A0F] rounded-xl p-3">
              <div className="flex items-center gap-1.5">
                <Sparkles size={12} className="text-[#6C63FF]" />
                <p className="text-[10px] text-[#6C63FF] font-semibold uppercase tracking-wider">AI Analysis</p>
              </div>

              <p className="text-xs text-[#6B7280] leading-relaxed">{analysis.what_it_does}</p>

              {analysis.recommended_dose && (
                <div className="flex items-start gap-2">
                  <Zap size={11} className="text-[#00D4AA] mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-[#F0F0FF]">{analysis.recommended_dose}</p>
                </div>
              )}

              {analysis.recommended_timing && (
                <div className="flex items-start gap-2">
                  <Clock size={11} className="text-[#6C63FF] mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-[#F0F0FF]">{analysis.recommended_timing}</p>
                </div>
              )}

              {analysis.cautions && analysis.cautions.length > 0 && (
                <div>
                  <p className="text-[9px] text-[#EE8100] uppercase tracking-wider font-semibold mb-1">Cautions</p>
                  {analysis.cautions.map((c, i) => (
                    <div key={i} className="flex items-start gap-1.5 mb-1">
                      <AlertTriangle size={10} className="text-[#EE8100] mt-0.5 flex-shrink-0" />
                      <p className="text-[11px] text-[#6B7280]">{c}</p>
                    </div>
                  ))}
                </div>
              )}

              {analysis.synergistic_with && analysis.synergistic_with.length > 0 && (
                <div>
                  <p className="text-[9px] text-[#00D4AA] uppercase tracking-wider font-semibold mb-1">Works well with</p>
                  <div className="flex flex-wrap gap-1">
                    {analysis.synergistic_with.map((s, i) => (
                      <span key={i} className="text-[10px] text-[#00D4AA] bg-[#00D4AA]/10 px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {analysis.apex_verdict && (
                <div className="flex items-start gap-2 pt-1 border-t border-[#1E1E2E]">
                  <Info size={11} className="text-[#6C63FF] mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-[#6B7280] italic">{analysis.apex_verdict}</p>
                </div>
              )}
            </div>
          )}

          {/* Daily timing chips */}
          {supp.daily_timing && supp.daily_timing.length > 0 && (
            <div>
              <p className="text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold mb-1.5">Daily Schedule</p>
              <div className="flex flex-wrap gap-1.5">
                {supp.daily_timing.map((t, i) => (
                  <span key={i} className="text-[10px] text-[#6C63FF] bg-[#6C63FF]/10 px-2 py-0.5 rounded-full">{t}</span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="w-full py-2 rounded-xl border border-red-500/30 text-red-400 text-xs font-medium flex items-center justify-center gap-2 active:opacity-70"
          >
            {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            Remove from stack
          </button>
        </div>
      )}
    </div>
  )
}

export default function SupplementsPage() {
  const router = useRouter()
  const [supplements, setSupplements] = useState<SupplementItem[]>([])
  const [loading, setLoading] = useState(true)
  const [addSheetOpen, setAddSheetOpen] = useState(false)
  const [form, setForm] = useState<AddFormState>(EMPTY_FORM)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const loadSupplements = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/nutrition/supplements')
      if (res.ok) {
        const data = await res.json() as { supplements: SupplementItem[] }
        setSupplements(data.supplements ?? [])
      }
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadSupplements() }, [loadSupplements])

  const handleAnalyze = async () => {
    if (!form.name || !form.supplement_type) return
    setForm(prev => ({ ...prev, analyzing: true }))
    try {
      const res = await fetch('/api/nutrition/supplements/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplement_name: form.name,
          brand: form.brand || undefined,
          ingredients: form.ingredients || undefined,
          supplement_type: form.supplement_type,
        }),
      })
      if (res.ok) {
        const data = await res.json() as { analysis: SupplementAIAnalysis }
        setForm(prev => ({
          ...prev,
          ai_analysis: data.analysis,
          timing_recommendation: data.analysis.recommended_timing || prev.timing_recommendation,
          analyzing: false,
          step: 4,
        }))
      } else {
        setForm(prev => ({ ...prev, analyzing: false, step: 4 }))
        showToast('AI analysis unavailable — you can still save manually')
      }
    } catch {
      setForm(prev => ({ ...prev, analyzing: false, step: 4 }))
    }
  }

  const handleSave = async () => {
    if (!form.name || !form.supplement_type) return
    setForm(prev => ({ ...prev, saving: true }))
    try {
      const res = await fetch('/api/nutrition/supplements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          brand: form.brand || null,
          supplement_type: form.supplement_type,
          serving_size: form.serving_size,
          calories_per_serving: parseFloat(form.calories_per_serving) || 0,
          protein_g_per_serving: parseFloat(form.protein_g_per_serving) || 0,
          key_ingredients: form.ingredients
            ? form.ingredients.split(',').map(s => ({ name: s.trim(), amount: '', unit: '' }))
            : [],
          timing_recommendation: form.timing_recommendation || form.ai_analysis?.recommended_timing || '',
          daily_timing: form.daily_timing,
          ai_notes: form.ai_analysis ? JSON.stringify(form.ai_analysis) : '',
        }),
      })
      if (res.ok) {
        setAddSheetOpen(false)
        setForm(EMPTY_FORM)
        showToast(`${form.name} added to your stack!`)
        await loadSupplements()
      } else {
        showToast('Failed to save supplement')
      }
    } catch { showToast('Failed to save') }
    finally { setForm(prev => ({ ...prev, saving: false })) }
  }

  const handleDelete = (id: string) => {
    setSupplements(prev => prev.filter(s => s.id !== id))
  }

  const setField = (key: keyof AddFormState, value: string | string[] | boolean | SupplementAIAnalysis | null) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const toggleTiming = (t: string) => {
    setForm(prev => ({
      ...prev,
      daily_timing: prev.daily_timing.includes(t)
        ? prev.daily_timing.filter(x => x !== t)
        : [...prev.daily_timing, t],
    }))
  }

  return (
    <div className="pb-28">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-sm font-medium text-white shadow-lg" style={{ background: 'linear-gradient(135deg, #00D4AA, #6C63FF)', maxWidth: '90vw' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="px-5 pt-14 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => router.back()} className="p-1.5 rounded-lg bg-[#13131A] border border-[#1E1E2E] text-[#6B7280]">
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold font-space-grotesk text-[#F0F0FF]">Supplement Stack</h1>
            <p className="text-xs text-[#6B7280]">{supplements.length} active supplement{supplements.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      <div className="px-5 space-y-4">
        {loading ? (
          [...Array(3)].map((_, i) => <div key={i} className="h-20 bg-[#13131A] rounded-card animate-pulse" />)
        ) : supplements.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#13131A] border border-[#1E1E2E] flex items-center justify-center mb-4 text-3xl">
              💊
            </div>
            <p className="text-[#F0F0FF] font-semibold mb-1">No supplements yet</p>
            <p className="text-[#6B7280] text-sm max-w-xs">Add your supplements and get AI-powered analysis on efficacy, timing, and interactions.</p>
          </div>
        ) : (
          supplements.map(supp => (
            <SupplementCard key={supp.id} supp={supp} onDelete={handleDelete} />
          ))
        )}
      </div>

      {/* Add FAB */}
      <button
        onClick={() => { setForm(EMPTY_FORM); setAddSheetOpen(true) }}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl z-10 active:scale-95 transition-transform"
        style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}
      >
        <Plus size={24} className="text-white" />
      </button>

      {/* ─── Add Supplement Sheet ──────────────────────────────────────────── */}
      {addSheetOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-end justify-center" onClick={() => { if (!form.saving && !form.analyzing) setAddSheetOpen(false) }}>
          <div className="w-full max-w-[430px] bg-[#13131A] border-t border-[#1E1E2E] rounded-t-2xl overflow-y-auto" style={{ maxHeight: '92vh' }} onClick={e => e.stopPropagation()}>
            <div className="p-5">
              {/* Sheet header + step indicator */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold font-space-grotesk text-[#F0F0FF]">Add Supplement</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    {([1, 2, 3, 4] as const).map(s => (
                      <div
                        key={s}
                        className="h-1 rounded-full transition-all duration-300"
                        style={{ width: form.step >= s ? 24 : 8, background: form.step >= s ? '#6C63FF' : '#1E1E2E' }}
                      />
                    ))}
                  </div>
                </div>
                <button onClick={() => setAddSheetOpen(false)} className="text-[#6B7280]"><X size={20} /></button>
              </div>

              {/* Step 1: Name + Type */}
              {form.step === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-[#6B7280] mb-1.5 block">Supplement name *</label>
                    <input
                      autoFocus
                      type="text"
                      value={form.name}
                      onChange={e => setField('name', e.target.value)}
                      placeholder="e.g. Optimum Nutrition Whey"
                      className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl px-4 py-3 text-[#F0F0FF] text-sm outline-none focus:border-[#6C63FF]/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#6B7280] mb-1.5 block">Brand (optional)</label>
                    <input
                      type="text"
                      value={form.brand}
                      onChange={e => setField('brand', e.target.value)}
                      placeholder="e.g. Optimum Nutrition"
                      className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl px-4 py-3 text-[#F0F0FF] text-sm outline-none focus:border-[#6C63FF]/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#6B7280] mb-1.5 block">Type *</label>
                    <div className="grid grid-cols-2 gap-2">
                      {SUPPLEMENT_TYPES.map(t => (
                        <button
                          key={t.value}
                          onClick={() => setField('supplement_type', t.value)}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border transition-colors ${
                            form.supplement_type === t.value
                              ? 'border-[#6C63FF] bg-[#6C63FF]/10 text-[#F0F0FF]'
                              : 'border-[#1E1E2E] text-[#6B7280]'
                          }`}
                        >
                          <span>{t.emoji}</span>
                          <span className="text-xs">{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => setForm(prev => ({ ...prev, step: 2 }))}
                    disabled={!form.name || !form.supplement_type}
                    className="w-full py-3.5 rounded-xl text-white font-semibold text-sm disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}
                  >
                    Next
                  </button>
                </div>
              )}

              {/* Step 2: Nutrition info */}
              {form.step === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'serving_size', label: 'Serving size', placeholder: '1 scoop', type: 'text' },
                      { key: 'calories_per_serving', label: 'Calories / serving', placeholder: '120', type: 'number' },
                      { key: 'protein_g_per_serving', label: 'Protein (g)', placeholder: '25', type: 'number' },
                    ].map(({ key, label, placeholder, type }) => (
                      <div key={key} className={key === 'serving_size' ? 'col-span-2' : ''}>
                        <label className="text-xs text-[#6B7280] mb-1 block">{label}</label>
                        <input
                          type={type}
                          inputMode={type === 'number' ? 'decimal' : undefined}
                          value={form[key as keyof AddFormState] as string}
                          onChange={e => setField(key as keyof AddFormState, e.target.value)}
                          placeholder={placeholder}
                          className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl px-4 py-3 text-[#F0F0FF] text-sm outline-none focus:border-[#6C63FF]/50"
                        />
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="text-xs text-[#6B7280] mb-1.5 block">Key ingredients (optional, comma-separated)</label>
                    <textarea
                      value={form.ingredients}
                      onChange={e => setField('ingredients', e.target.value)}
                      placeholder="e.g. Whey Protein Isolate 25g, Leucine 2.3g"
                      rows={3}
                      className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl px-4 py-3 text-[#F0F0FF] text-sm outline-none focus:border-[#6C63FF]/50 resize-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setForm(prev => ({ ...prev, step: 1 }))} className="flex-1 py-3 rounded-xl border border-[#1E1E2E] text-[#6B7280] text-sm font-medium">
                      Back
                    </button>
                    <button
                      onClick={() => setForm(prev => ({ ...prev, step: 3 }))}
                      className="flex-1 py-3 rounded-xl text-white font-semibold text-sm"
                      style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Timing */}
              {form.step === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-[#6B7280] mb-1.5 block">Timing recommendation</label>
                    <input
                      type="text"
                      value={form.timing_recommendation}
                      onChange={e => setField('timing_recommendation', e.target.value)}
                      placeholder="e.g. 30 min pre-workout with water"
                      className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl px-4 py-3 text-[#F0F0FF] text-sm outline-none focus:border-[#6C63FF]/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#6B7280] mb-1.5 block">Daily schedule (select all that apply)</label>
                    <div className="flex flex-wrap gap-2">
                      {TIMING_OPTIONS.map(t => (
                        <button
                          key={t}
                          onClick={() => toggleTiming(t)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            form.daily_timing.includes(t)
                              ? 'border-[#6C63FF] bg-[#6C63FF]/10 text-[#6C63FF]'
                              : 'border-[#1E1E2E] text-[#6B7280]'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#0A0A0F] border border-[#6C63FF]/20 rounded-xl p-4">
                    <div className="flex items-start gap-2 mb-2">
                      <Sparkles size={14} className="text-[#6C63FF] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-[#6C63FF]">AI Analysis</p>
                        <p className="text-[10px] text-[#6B7280]">Get evidence-based info on this supplement&apos;s efficacy, dosing, and interactions.</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => setForm(prev => ({ ...prev, step: 2 }))} className="flex-1 py-3 rounded-xl border border-[#1E1E2E] text-[#6B7280] text-sm font-medium">
                      Back
                    </button>
                    <button
                      onClick={handleAnalyze}
                      disabled={form.analyzing}
                      className="flex-1 py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                      style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}
                    >
                      {form.analyzing ? (
                        <><Loader2 size={14} className="animate-spin" /> Analyzing...</>
                      ) : (
                        <><Sparkles size={14} /> Analyze & Next</>
                      )}
                    </button>
                  </div>
                  <button
                    onClick={() => setForm(prev => ({ ...prev, step: 4 }))}
                    className="w-full py-2 text-[#6B7280] text-xs"
                  >
                    Skip AI analysis →
                  </button>
                </div>
              )}

              {/* Step 4: Review & Save */}
              {form.step === 4 && (
                <div className="space-y-4">
                  {form.ai_analysis ? (
                    <div className="bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Sparkles size={12} className="text-[#6C63FF]" />
                          <p className="text-xs text-[#6C63FF] font-semibold uppercase tracking-wider">AI Verdict</p>
                        </div>
                        {form.ai_analysis.evidence_level && (() => {
                          const ev = EVIDENCE_COLORS[form.ai_analysis!.evidence_level]
                          return ev ? (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded" style={{ background: ev.bg, color: ev.text }}>
                              {ev.label}
                            </span>
                          ) : null
                        })()}
                      </div>
                      <p className="text-xs text-[#6B7280] leading-relaxed">{form.ai_analysis.what_it_does}</p>

                      {form.ai_analysis.apex_verdict && (
                        <div className="flex items-start gap-1.5 pt-2 border-t border-[#1E1E2E]">
                          <CheckCircle2 size={12} className="text-[#00D4AA] mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-[#F0F0FF] italic">{form.ai_analysis.apex_verdict}</p>
                        </div>
                      )}

                      {form.ai_analysis.cautions && form.ai_analysis.cautions.length > 0 && (
                        <div className="pt-2 border-t border-[#1E1E2E]">
                          <p className="text-[9px] text-[#EE8100] uppercase tracking-wider font-semibold mb-1">Cautions</p>
                          {form.ai_analysis.cautions.map((c, i) => (
                            <p key={i} className="text-[11px] text-[#6B7280]">⚠ {c}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl p-4 text-center">
                      <p className="text-xs text-[#6B7280]">No AI analysis — supplement will be saved without it</p>
                    </div>
                  )}

                  {/* Summary */}
                  <div className="bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl p-3 space-y-1.5">
                    <p className="text-sm font-semibold text-[#F0F0FF]">{form.name}</p>
                    {form.brand && <p className="text-xs text-[#6B7280]">{form.brand}</p>}
                    <p className="text-xs text-[#6B7280]">{SUPPLEMENT_TYPES.find(t => t.value === form.supplement_type)?.label} · {form.serving_size}</p>
                    {form.timing_recommendation && (
                      <p className="text-xs text-[#6C63FF]">
                        <Clock size={10} className="inline mr-1" />
                        {form.timing_recommendation}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => setForm(prev => ({ ...prev, step: 3 }))} className="flex-1 py-3 rounded-xl border border-[#1E1E2E] text-[#6B7280] text-sm font-medium">
                      Back
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={form.saving}
                      className="flex-1 py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                      style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}
                    >
                      {form.saving ? <Loader2 size={14} className="animate-spin" /> : <Pill size={14} />}
                      {form.saving ? 'Saving...' : 'Add to Stack'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
