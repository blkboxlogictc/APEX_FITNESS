import React from 'react'

function Base({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`skeleton ${className}`} style={style} />
}

export function SkeletonText({ lines = 1, width = '100%' }: { lines?: number; width?: string }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Base key={i} className="h-4 rounded-lg" style={{ width: i === lines - 1 && lines > 1 ? '60%' : width } as React.CSSProperties} />
      ))}
    </div>
  )
}

export function SkeletonCard({ height = 80 }: { height?: number }) {
  return <Base className="rounded-2xl w-full" style={{ height } as React.CSSProperties} />
}

export function SkeletonChart({ height = 160 }: { height?: number }) {
  return <Base className="rounded-2xl w-full" style={{ height } as React.CSSProperties} />
}

export function SkeletonAvatar({ size = 40 }: { size?: number }) {
  return <Base className="rounded-full shrink-0" style={{ width: size, height: size } as React.CSSProperties} />
}

export function SkeletonList({ items = 3, gap = 12 }: { items?: number; gap?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: items }).map((_, i) => (
        <SkeletonCard key={i} height={72} />
      ))}
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3">
      <SkeletonAvatar size={44} />
      <div className="flex-1 space-y-2">
        <Base className="h-4 rounded-lg w-3/4" />
        <Base className="h-3 rounded-lg w-1/2" />
      </div>
    </div>
  )
}
