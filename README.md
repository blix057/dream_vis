# Dream Visualizer

Turn dreams into images and share them.

- Next.js 14 app router
- Tailwind CSS
- API route calling OpenAI Images API

Setup

1) Install deps
   npm install

2) Configure environment
   cp .env.local.example .env.local
   # add your OpenAI key
   OPENAI_API_KEY=sk-... (or set it in Vercel project settings)

3) Dev
   npm run dev

Deploy (Vercel)

- Push to GitHub
- Import into Vercel dashboard
- Set environment variable OPENAI_API_KEY
- Deploy
