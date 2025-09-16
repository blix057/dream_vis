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

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null)
  const parse = bodySchema.safeParse(json)
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.flatten() }, { status: 400 })
  }
  const { prompt, count, provider, model, size, style } = parse.data

  // Free default: Pollinations (no API key needed)
  if (provider === 'pollinations' || !process.env.OPENAI_API_KEY) {
    const { width, height } = parseSize(size)

    const styleSuffix = style === 'comic'
      ? 'vintage superhero comic book aesthetic, Ben-Day dots, bold ink lines, halftone shading, limited retro color palette, dynamic heroic composition'
      : style === 'ghibli'
      ? 'Studio Ghibli-inspired, whimsical hand-painted backgrounds, soft pastel color palette, gentle lighting, expressive characters, anime film style'
      : 'photorealistic, detailed textures, natural lighting, 35mm film look, high dynamic range'

    const styledPrompt = `${prompt}, ${styleSuffix}`

    const out = Array.from({ length: count }).map((_, i) => {
      const seed = String(Date.now() + i)
      const m = model === 'flux' ? 'flux' : 'flux'
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(styledPrompt)}?width=${width}&height=${height}&seed=${seed}&model=${m}`
      return { url, seed }
    })
    return NextResponse.json({ images: out })
  }

  // Paid: OpenAI
  const apiKey = process.env.OPENAI_API_KEY!
  const openai = new OpenAI({ apiKey })

  try {
    const styleSuffix = style === 'comic'
      ? 'vintage superhero comic book aesthetic, Ben-Day dots, bold ink lines, halftone shading, limited retro color palette, dynamic heroic composition'
      : style === 'ghibli'
      ? 'Studio Ghibli-inspired, whimsical hand-painted backgrounds, soft pastel color palette, gentle lighting, expressive characters, anime film style'
      : 'photorealistic, detailed textures, natural lighting, 35mm film look, high dynamic range'

    const result = await openai.images.generate({
      model: model === 'flux' ? 'gpt-image-1' : model,
      prompt: `${prompt}, ${styleSuffix}`,
      n: count,
      size
    })

    const images = (result.data || []).map((d) => ({ url: d.url! }))
    return NextResponse.json({ images })
  } catch (err: any) {
    console.error('Image generation error', err)
    // Fallback to pollinations on OpenAI failure (e.g., billing cap)
    try {
      const { width, height } = parseSize(size)

      const styleSuffix = style === 'comic'
        ? 'vintage superhero comic book aesthetic, Ben-Day dots, bold ink lines, halftone shading, limited retro color palette, dynamic heroic composition'
        : style === 'ghibli'
        ? 'Studio Ghibli-inspired, whimsical hand-painted backgrounds, soft pastel color palette, gentle lighting, expressive characters, anime film style'
        : 'photorealistic, detailed textures, natural lighting, 35mm film look, high dynamic range'

      const styledPrompt = `${prompt}, ${styleSuffix}`

      const out = Array.from({ length: count }).map((_, i) => {
        const seed = String(Date.now() + i)
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(styledPrompt)}?width=${width}&height=${height}&seed=${seed}&model=flux`
        return { url, seed }
      })
      return NextResponse.json({ images: out })
    } catch (e) {
      return NextResponse.json({ error: err?.message ?? 'Generation failed' }, { status: 500 })
    }
  }
}
