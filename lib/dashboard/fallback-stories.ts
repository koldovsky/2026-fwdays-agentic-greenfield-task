export interface FallbackStory {
  id: string
  content: string
  cta: string
}

export const FALLBACK_STORIES: [FallbackStory, FallbackStory, FallbackStory] = [
  {
    id: 'fallback-1',
    content:
      'Last Tuesday I felt the urge hit hard after a stressful call. Instead of heading to the kitchen, I grabbed my shoes and walked around the block. By the time I got back, the wave had passed. It was the first time I had chosen movement over food in months.',
    cta: 'You have a story like this too — write it down.',
  },
  {
    id: 'fallback-2',
    content:
      'I used to think one slip meant the whole streak was ruined. Then I logged a difficult day honestly instead of hiding it. Seeing it there, named and acknowledged, made it feel smaller. The next morning I checked in again. Small wins add up.',
    cta: 'Write your own moment of strength — even a small one counts.',
  },
  {
    id: 'fallback-3',
    content:
      'The hardest part was telling a friend what I was working on. The first conversation was awkward. But having one person who knew changed everything — knowing someone was quietly rooting for me made the next hard moment easier to push through.',
    cta: 'Ready to log your own story? It only takes a minute.',
  },
]
