'use client'

import { useEffect } from 'react'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex flex-col items-center justify-center gap-6 px-6 text-center">
      <div
        className="w-20 h-20 rounded-[22px] flex items-center justify-center text-4xl font-black text-white"
        style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}
      >
        A
      </div>
      <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
        <AlertCircle size={24} className="text-red-400" />
      </div>
      <div>
        <h1 className="text-xl font-bold text-white mb-2">Something went wrong</h1>
        {process.env.NODE_ENV === 'development' ? (
          <p className="text-sm text-gray-500 font-mono max-w-sm">{error.message}</p>
        ) : (
          <p className="text-sm text-gray-500">An unexpected error occurred. Please try again.</p>
        )}
      </div>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#6C63FF] text-white text-sm font-semibold"
        >
          <RefreshCw size={16} />
          Try Again
        </button>
        <Link
          href="/home"
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#1E1E2E] text-gray-400 text-sm font-medium"
        >
          <Home size={16} />
          Go Home
        </Link>
      </div>
    </div>
  )
}
