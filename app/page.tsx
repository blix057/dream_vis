import Image from 'next/image'
import { Suspense } from 'react'
import DreamForm from '../components/DreamForm'
import ResultGrid from '../components/ResultGrid'

export default function Page() {
  return (
    <main className="container py-10">
      <h1 className="text-3xl font-bold mb-2">Dream Visualizer</h1>
      <p className="text-zinc-300 mb-6">Describe your dream and generate 1–4 images to share.</p>
      <DreamForm />
      <Suspense fallback={<div className="mt-8">Loading…</div>}>
        <ResultGrid />
      </Suspense>
    </main>
  )
}
