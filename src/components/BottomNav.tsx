'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Dumbbell, Apple, MessageSquare, Activity } from 'lucide-react'
import { useOfflineSync } from '@/hooks/useOfflineSync'

const TABS = [
  { href: '/home', icon: Home, label: 'Home' },
  { href: '/train', icon: Dumbbell, label: 'Train' },
  { href: '/nutrition', icon: Apple, label: 'Nutrition' },
  { href: '/activity', icon: Activity, label: 'Activity' },
  { href: '/coach', icon: MessageSquare, label: 'Coach' },
]

export default function BottomNav() {
  const pathname = usePathname()
  const { isOnline, pendingCount, syncing } = useOfflineSync()

  return (
    <>
      {/* Offline / sync indicator */}
      {(!isOnline || syncing || pendingCount > 0) && (
        <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
          <div className="max-w-[430px] mx-auto">
            <div className={`mx-4 mt-2 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
              !isOnline ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
              : syncing ? 'bg-[#6C63FF]/15 text-[#6C63FF] border border-[#6C63FF]/25'
              : 'bg-[#00D4AA]/15 text-[#00D4AA] border border-[#00D4AA]/25'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${
                !isOnline ? 'bg-amber-400' : syncing ? 'bg-[#6C63FF] animate-pulse' : 'bg-[#00D4AA]'
              }`} />
              {!isOnline ? `Offline${pendingCount > 0 ? ` · ${pendingCount} queued` : ''}` :
               syncing ? `Syncing ${pendingCount} items...` :
               `All synced ✓`}
            </div>
          </div>
        </div>
      )}

      <nav
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] border-t border-[#1E1E2E]"
        style={{
          background: 'rgba(10, 10, 15, 0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="flex items-center justify-around px-2 py-2">
          {TABS.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || (pathname.startsWith(href) && href !== '/home')
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[52px] active:scale-[0.92]"
              >
                {/* Active indicator bar */}
                <div className="relative flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-200">
                  {active && (
                    <span
                      className="absolute -top-1 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full"
                      style={{ background: 'linear-gradient(90deg, #6C63FF, #00D4AA)' }}
                    />
                  )}
                  <div
                    className={`absolute inset-0 rounded-xl transition-all duration-200 ${active ? 'opacity-100' : 'opacity-0'}`}
                    style={{ background: 'linear-gradient(135deg, rgba(108,99,255,0.15), rgba(0,212,170,0.08))' }}
                  />
                  <Icon
                    size={20}
                    strokeWidth={active ? 2.5 : 2}
                    className={`relative z-10 transition-colors duration-200 ${active ? 'text-[#6C63FF]' : 'text-[#6B7280]'}`}
                  />
                </div>
                <span
                  className={`text-[10px] font-medium leading-none transition-colors duration-200 ${
                    active ? 'text-[#6C63FF]' : 'text-[#6B7280]'
                  }`}
                >
                  {label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
