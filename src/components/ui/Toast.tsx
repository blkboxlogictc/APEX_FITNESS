'use client'

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react'
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, duration?: number) => void
  success: (message: string) => void
  error: (message: string) => void
  warning: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const ICONS: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const COLORS: Record<ToastType, { border: string; bg: string; icon: string }> = {
  success: { border: '#00D4AA', bg: 'rgba(0,212,170,0.08)', icon: '#00D4AA' },
  error: { border: '#E63312', bg: 'rgba(230,51,18,0.08)', icon: '#E63312' },
  warning: { border: '#FECB02', bg: 'rgba(254,203,2,0.08)', icon: '#FECB02' },
  info: { border: '#6C63FF', bg: 'rgba(108,99,255,0.08)', icon: '#6C63FF' },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) { clearTimeout(timer); timers.current.delete(id) }
  }, [])

  const toast = useCallback((message: string, type: ToastType = 'info', duration = 4000) => {
    const id = crypto.randomUUID()
    setToasts((prev) => {
      const updated = [...prev, { id, type, message, duration }]
      return updated.slice(-3) // max 3
    })
    const timer = setTimeout(() => dismiss(id), duration)
    timers.current.set(id, timer)
  }, [dismiss])

  const value: ToastContextValue = {
    toast,
    success: (msg) => toast(msg, 'success'),
    error: (msg) => toast(msg, 'error'),
    warning: (msg) => toast(msg, 'warning'),
    info: (msg) => toast(msg, 'info'),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast container */}
      <div className="fixed top-0 left-0 right-0 z-[100] flex flex-col items-center gap-2 pt-safe px-4 pt-4 pointer-events-none">
        {toasts.map((t) => {
          const Icon = ICONS[t.type]
          const colors = COLORS[t.type]
          return (
            <div
              key={t.id}
              className="w-full max-w-[390px] animate-slide-down pointer-events-auto"
            >
              <div
                className="flex items-center gap-3 rounded-2xl px-4 py-3 shadow-xl border"
                style={{ background: colors.bg, borderColor: colors.border + '50', backdropFilter: 'blur(16px)' }}
              >
                <Icon size={18} style={{ color: colors.icon }} className="shrink-0" />
                <p className="flex-1 text-sm text-white font-medium">{t.message}</p>
                <button
                  onClick={() => dismiss(t.id)}
                  className="text-gray-500 active:text-white transition-colors shrink-0"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
