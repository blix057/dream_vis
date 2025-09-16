export type GeneratedImage = {
  url: string
  seed?: string
}

export type GenerateRequest = {
  prompt: string
  count?: number
  model?: 'gpt-image-1' | 'dall-e-3'
  size?: '1024x1024' | '512x512' | '256x256'
}

export type GenerateResponse = {
  images: GeneratedImage[]
}
