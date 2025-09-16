"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function DreamForm() {
  const params = useSearchParams()
  const router = useRouter()

  const [prompt, setPrompt] = useState('')
  const [count, setCount] = useState(4)
  const [size, setSize] = useState<'1024x1024' | '512x512' | '256x256'>('1024x1024')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const q = params.get('q')
    const c = params.get('n')
    const s = params.get('s')
    if (q) setPrompt(q)
    if (c) setCount(Math.max(1, Math.min(4, parseInt(c))))
    if (s === '1024x1024' || s === '512x512' || s === '256x256') setSize(s)
  }, [params])

  const canSubmit = useMemo(() => prompt.trim().length >= 5 && !loading, [prompt, loading])

  const onSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, count, size, provider: 'pollinations', model: 'flux' })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to generate')
      // write to URL for shareable link
      const search = new URLSearchParams({ q: prompt, n: String(count), s: size })
      router.push('/?' + search.toString())
      // Write results to sessionStorage so ResultGrid can read
      sessionStorage.setItem('dream_results', JSON.stringify(data))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [prompt, count, size, router])

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <textarea
        className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-3 outline-none focus:border-zinc-500"
        placeholder="Describe your dream in vivid detail..."
        rows={4}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2">
          <span className="text-zinc-300">Images:</span>
          <select
            className="rounded-md border border-zinc-700 bg-zinc-900 p-2"
            value={count}
            onChange={(e) => setCount(parseInt(e.target.value))}
          >
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-zinc-300">Size:</span>
          <select
            className="rounded-md border border-zinc-700 bg-zinc-900 p-2"
            value={size}
            onChange={(e) => setSize(e.target.value as any)}
          >
            {['256x256', '512x512', '1024x1024'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-md bg-indigo-600 px-4 py-2 font-medium disabled:opacity-50"
        >
          {loading ? 'Generating…' : 'Generate'}
        </button>
        {error && <span className="text-red-400">{error}</span>}
      </div>
    </form>
  )
}
