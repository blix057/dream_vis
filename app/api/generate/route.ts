import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { z } from 'zod'

const bodySchema = z.object({
  prompt: z.string().min(5, 'Prompt too short').max(2000, 'Prompt too long'),
  count: z.number().int().min(1).max(4).default(1),
  model: z.enum(['gpt-image-1', 'dall-e-3']).default('gpt-image-1'),
  size: z.enum(['1024x1024', '512x512', '256x256']).default('1024x1024')
})

export const maxDuration = 60
export const runtime = 'edge'

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null)
  const parse = bodySchema.safeParse(json)
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.flatten() }, { status: 400 })
  }
  const { prompt, count, model, size } = parse.data

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 })
  }

  const openai = new OpenAI({ apiKey })

  try {
    // OpenAI Images API
    const result = await openai.images.generate({
      model,
      prompt,
      n: count,
      size
    })

    const images = (result.data || []).map((d) => ({ url: d.url! }))
    return NextResponse.json({ images })
  } catch (err: any) {
    console.error('Image generation error', err)
    return NextResponse.json({ error: err?.message ?? 'Generation failed' }, { status: 500 })
  }
}
