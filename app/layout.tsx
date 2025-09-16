import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dream Visualizer',
  description: 'Turn dreams into images and share them.'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen bg-bg text-white antialiased">{children}</body>
    </html>
  )
}
