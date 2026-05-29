'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'

interface LazyImageProps {
  src: string
  alt: string
  width: number
  height: number
  className?: string
  fallbackSrc?: string
  priority?: boolean
}

export default function LazyImage({ src, alt, width, height, className = '', fallbackSrc, priority = false }: LazyImageProps) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const [inView, setInView] = useState(priority)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (priority || inView) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect() } },
      { rootMargin: '200px' }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [priority, inView])

  const imgSrc = error && fallbackSrc ? fallbackSrc : src

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`} style={{ width, height }}>
      {/* Skeleton while loading */}
      {!loaded && <div className="absolute inset-0 skeleton" />}

      {inView && !error && (
        <Image
          src={imgSrc}
          alt={alt}
          width={width}
          height={height}
          className={`transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
          onError={() => { setError(true); setLoaded(true) }}
          priority={priority}
        />
      )}

      {/* Fallback placeholder on error with no fallbackSrc */}
      {error && !fallbackSrc && (
        <div className="absolute inset-0 bg-[#1E1E2E] flex items-center justify-center">
          <span className="text-gray-600 text-xs">{alt[0]?.toUpperCase()}</span>
        </div>
      )}
    </div>
  )
}
