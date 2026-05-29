'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronRight, Sparkles } from 'lucide-react'

interface RecapSummary {
  id: string
  week_start: string
  week_end: string
  headline: string
  apex_score: number
  highlights: string[]
  generated_at: string
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? '#00D4AA' : score >= 60 ? '#6C63FF' : score >= 40 ? '#FECB02' : '#E63312'
  return (
    <div className="flex items-center justify-center w-12 h-12 rounded-full shrink-0"
      style={{ border: `2px solid ${color}`, color }}>
      <span className="text-sm font-black">{score}</span>
    </div>
  )
}

function formatWeekRange(start: string, end: string) {
  const s = new Date(start + 'T12:00:00')
  const e = new Date(end + 'T12:00:00')
  const monthDay = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${monthDay(s)} – ${monthDay(e)}, ${e.getFullYear()}`
}

function timeAgo(dateStr: string) {
  const ms = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(ms / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

export default function RecapsListPage() {
  const router = useRouter()
  const [recaps, setRecaps] = useState<RecapSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const loadRecaps = useCallback(async (pageNum: number, append = false) => {
    try {
      const res = await fetch(`/api/progress/recap?page=${pageNum}`)
      const data = await res.json()
      if (!Array.isArray(data) || data.length === 0) {
        setHasMore(false)
      } else {
        setRecaps(prev => append ? [...prev, ...data] : data)
        if (data.length < 10) setHasMore(false)
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => { loadRecaps(0) }, [loadRecaps])

  const loadMore = () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const next = page + 1
    setPage(next)
    loadRecaps(next, true)
  }

  return (
    <div className="min-h-screen bg-[#0D0D14] text-white pb-20">
      <div className="sticky top-0 z-10 bg-[#0D0D14]/90 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 active:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold">Weekly Recaps</h1>
      </div>

      <div className="px-4 pt-4 max-w-lg mx-auto">
        {loading ? (
          <div className="space-y-3 mt-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-white/5 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : recaps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center">
              <Sparkles size={28} className="text-violet-400" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-white">No recaps yet</p>
              <p className="text-sm text-gray-500 mt-1">Generate your first weekly recap from the Progress tab</p>
            </div>
            <button
              onClick={() => router.push('/progress')}
              className="px-6 py-3 rounded-2xl bg-violet-600 text-white text-sm font-semibold"
            >
              Go to Progress
            </button>
          </div>
        ) : (
          <div className="space-y-3 mt-2">
            {recaps.map((recap) => (
              <button
                key={recap.id}
                onClick={() => router.push(`/progress/recap/${recap.week_start}`)}
                className="w-full bg-white/5 border border-white/8 rounded-2xl p-4 flex items-center gap-4 active:bg-white/8 transition-colors text-left"
              >
                <ScoreBadge score={recap.apex_score} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 mb-0.5">
                    {recap.week_start && recap.week_end
                      ? formatWeekRange(recap.week_start, recap.week_end)
                      : recap.week_start}
                  </p>
                  <p className="text-sm font-semibold text-white leading-tight truncate">{recap.headline}</p>
                  {recap.highlights?.[0] && (
                    <p className="text-xs text-gray-500 mt-1 truncate">{recap.highlights[0]}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <ChevronRight size={16} className="text-gray-600" />
                  {recap.generated_at && (
                    <span className="text-xs text-gray-600">{timeAgo(recap.generated_at)}</span>
                  )}
                </div>
              </button>
            ))}

            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full py-4 text-sm text-gray-400 active:text-white transition-colors"
              >
                {loadingMore ? 'Loading...' : 'Load more'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
