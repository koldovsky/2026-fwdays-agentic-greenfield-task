import { NextRequest } from 'next/server'
import fs from 'node:fs/promises'
import path from 'node:path'
import { bookDir } from '@/lib/content/paths'

const TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.webp': 'image/webp',
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ slug: string; cover: string[] }> }) {
  const { slug, cover } = await ctx.params
  const filename = cover.join('/')
  if (filename.includes('..')) return new Response('Bad request', { status: 400 })
  try {
    const data = await fs.readFile(path.join(bookDir(slug), filename))
    const type = TYPES[path.extname(filename).toLowerCase()] ?? 'application/octet-stream'
    return new Response(new Uint8Array(data), { headers: { 'Content-Type': type } })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}
