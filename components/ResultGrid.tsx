"use client"

import { useEffect, useState } from 'react'

export default function ResultGrid() {
  const [images, setImages] = useState<{ url: string }[]>([])

  useEffect(() => {
    // Try reading from sessionStorage first
    const raw = typeof window !== 'undefined' ? sessionStorage.getItem('dream_results') : null
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        if (parsed?.images) setImages(parsed.images)
      } catch {}
    }

    // If not available, try fetch using query params (in case of a shared link without prior session)
    if (!raw) {
      const url = new URL(window.location.href)
      const q = url.searchParams.get('q')
      const n = url.searchParams.get('n')
      const s = url.searchParams.get('s')
      const st = url.searchParams.get('style')
      if (q) {
        fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: q, count: n ? parseInt(n) : 4, size: (s as any) || '1024x1024', provider: 'pollinations', model: 'flux', style: st === 'comic' ? 'comic' : 'realistic' })
        })
          .then(async (r) => {
            const data = await r.json()
            if (r.ok) setImages(data.images || [])
          })
          .catch(() => {})
      }
    }
  }, [])

  if (!images.length) return null

  return (
    <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
      {images.map((img, i) => (
        <a key={i} href={img.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-md border border-zinc-700">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.url} alt="Generated dream" className="w-full h-auto object-cover" />
        </a>
      ))}
    </div>
  )
}
