import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { z } from 'zod'

const bodySchema = z.object({
  prompt: z.string().min(5, 'Prompt too short').max(2000, 'Prompt too long'),
  count: z.number().int().min(1).max(4).default(4),
  provider: z.enum(['openai', 'pollinations']).default('pollinations'),
  model: z.enum(['gpt-image-1', 'dall-e-3', 'flux']).default('flux'),
  size: z.enum(['1024x1024', '512x512', '256x256']).default('1024x1024'),
  style: z.enum(['realistic', 'comic', 'ghibli']).default('realistic')
})

export const maxDuration = 60
export const runtime = 'edge'

function parseSize(size: '1024x1024' | '512x512' | '256x256') {
  const [w, h] = size.split('x').map((n) => parseInt(n, 10))
  return { width: w, height: h }
}

function splitIntoSentences(text: string): string[] {
  const matches = text.match(/[^.!?]+[.!?]?/g)
  return (matches || [text]).map((s) => s.trim()).filter(Boolean)
}

function derivePanelTexts(story: string, panels: number): string[] {
  const sentences = splitIntoSentences(story)
  if (sentences.length === 0) return Array.from({ length: panels }, () => story)

  // Distribute sentences roughly evenly across panels
  const out: string[] = []
  for (let i = 0; i < panels; i++) {
    const start = Math.floor((i * sentences.length) / panels)
    const end = Math.floor(((i + 1) * sentences.length) / panels)
    const chunk = sentences.slice(start, Math.max(end, start + 1)).join(' ')
    out.push(chunk)
  }

  // If there are fewer sentences than panels, fill remaining with guided phases
  const phasesByCount: Record<number, string[]> = {
    1: ['single scene'],
    2: ['setup', 'payoff'],
    3: ['beginning', 'middle', 'ending'],
    4: ['beginning', 'rising action', 'climax', 'resolution']
  }
  const phases = phasesByCount[Math.max(1, Math.min(4, panels))]
  for (let i = 0; i < panels; i++) {
    if (!out[i] || out[i].length < 10) {
      out[i] = `${story} — ${phases[i] || `part ${i + 1}`}`
    }
  }
  return out
}

function styleSuffixFor(style: 'realistic' | 'comic' | 'ghibli') {
  return style === 'comic'
    ? 'vintage superhero comic book aesthetic, Ben-Day dots, bold ink lines, halftone shading, limited retro color palette, dynamic heroic composition'
    : style === 'ghibli'
    ? 'Studio Ghibli-inspired, whimsical hand-painted backgrounds, soft pastel color palette, gentle lighting, expressive characters, anime film style'
    : 'photorealistic, detailed textures, natural lighting, 35mm film look, high dynamic range'
}

function buildPanelPrompts(baseStory: string, count: number, style: 'realistic' | 'comic' | 'ghibli') {
  const parts = derivePanelTexts(baseStory, count)
  const suffix = styleSuffixFor(style)
  return parts.map((p, i) =>
    `${p}. Panel ${i + 1} of ${count}. Maintain narrative and character continuity across panels; same protagonist(s), outfit, setting, and visual style; camera framing can change to show progression. ${suffix}`
  )
}

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null)
  const parse = bodySchema.safeParse(json)
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.flatten() }, { status: 400 })
  }
  const { prompt, count, provider, model, size, style } = parse.data

  const panelPrompts = buildPanelPrompts(prompt, count, style)

  // Free default: Pollinations (no API key needed)
  if (provider === 'pollinations' || !process.env.OPENAI_API_KEY) {
    const { width, height } = parseSize(size)

    const out = panelPrompts.map((panelPrompt, i) => {
      const seed = String(Date.now() + i)
      const m = model === 'flux' ? 'flux' : 'flux'
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(panelPrompt)}?width=${width}&height=${height}&seed=${seed}&model=${m}`
      return { url, seed }
    })
    return NextResponse.json({ images: out })
  }

  // Paid: OpenAI
  const apiKey = process.env.OPENAI_API_KEY!
  const openai = new OpenAI({ apiKey })

  try {
    // Generate one image per panel to ensure distinct scenes
    const results = await Promise.all(
      panelPrompts.map((pp) =>
        openai.images.generate({
          model: model === 'flux' ? 'gpt-image-1' : model,
          prompt: pp,
          n: 1,
          size
        })
      )
    )

    const images = results.map((r) => {
      const first = r.data?.[0]?.url
      if (!first) throw new Error('OpenAI returned no image URL')
      return { url: first }
    })
    return NextResponse.json({ images })
  } catch (err: any) {
    console.error('Image generation error', err)
    // Fallback to pollinations on OpenAI failure (e.g., billing cap)
    try {
      const { width, height } = parseSize(size)
      const out = panelPrompts.map((panelPrompt, i) => {
        const seed = String(Date.now() + i)
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(panelPrompt)}?width=${width}&height=${height}&seed=${seed}&model=flux`
        return { url, seed }
      })
      return NextResponse.json({ images: out })
    } catch (e) {
      return NextResponse.json({ error: err?.message ?? 'Generation failed' }, { status: 500 })
    }
  }
}
