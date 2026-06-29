import type { CoverColor } from '@/lib/content/types'

// Generated-cover gradients, mirroring the design system's BookCard.
const COVER_BG: Record<CoverColor, string> = {
  blue: 'linear-gradient(160deg, #3a4fe0, #242fa3)',
  coral: 'linear-gradient(160deg, #ff6f5e, #d8463a)',
  teal: 'linear-gradient(160deg, #3ccfbf, #1f8f82)',
  purple: 'linear-gradient(160deg, #b083f5, #7a4fd0)',
  amber: 'linear-gradient(160deg, #ffaf45, #d98a23)',
  green: 'linear-gradient(160deg, #7fd96f, #45a83a)',
  ink: 'linear-gradient(160deg, #4b4334, #2a2419)',
}

export function coverGradient(color?: CoverColor): string {
  return COVER_BG[color ?? 'ink'] ?? COVER_BG.ink
}

const COVER_SOLID: Record<CoverColor, string> = {
  blue: '#3a4fe0', coral: '#ff6f5e', teal: '#3ccfbf', purple: '#b083f5',
  amber: '#ffaf45', green: '#7fd96f', ink: '#6f6552',
}

export function coverSolid(color?: CoverColor): string {
  return COVER_SOLID[color ?? 'ink'] ?? COVER_SOLID.ink
}

function hash(slug: string): number {
  let h = 0
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) % 100000
  return h
}

// Deterministic spine height/width (px) from a slug, so the shelf looks organic
// but stays stable across server/client renders (no hydration drift).
export function spineHeight(slug: string, min = 150, max = 225): number {
  return min + (hash(slug) % (max - min + 1))
}

export function spineWidth(slug: string, min = 42, max = 64): number {
  return min + ((hash(slug) >> 3) % (max - min + 1))
}
