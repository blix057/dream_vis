export type GeneratedImage = {
  url: string
  seed?: string
}

export type GenerateRequest = {
  prompt: string
  count?: number
  provider?: 'openai' | 'pollinations'
  model?: 'gpt-image-1' | 'dall-e-3' | 'flux'
  size?: '1024x1024' | '512x512' | '256x256'
  style?: 'realistic' | 'comic' | 'ghibli'
}

export type GenerateResponse = {
  images: GeneratedImage[]
}
