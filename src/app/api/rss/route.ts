import { NextResponse } from 'next/server'
import type { RSSFeed, RSSItem } from '@/types'

function extractText(xmlStr: string, tag: string): string {
  const cdataMatch = xmlStr.match(new RegExp(`<${tag}(?:[^>]*)><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, 'i'))
  if (cdataMatch) return cdataMatch[1].trim()
  const match = xmlStr.match(new RegExp(`<${tag}(?:[^>]*)>([\\s\\S]*?)</${tag}>`, 'i'))
  return match ? match[1].replace(/<[^>]+>/g, '').trim() : ''
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const feedUrl = searchParams.get('url')
  const maxItems = parseInt(searchParams.get('max') || '10')

  if (!feedUrl) {
    return NextResponse.json({ error: 'url parameter required' }, { status: 400 })
  }

  // Validate URL
  let parsedUrl: URL
  try {
    parsedUrl = new URL(feedUrl)
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return NextResponse.json({ error: 'Only HTTP/HTTPS URLs are allowed' }, { status: 400 })
  }

  try {
    const res = await fetch(feedUrl, {
      headers: { 'User-Agent': 'EzeDash/1.0 RSS Reader' },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 300 },
    })

    if (!res.ok) throw new Error(`RSS fetch returned ${res.status}`)

    const xml = await res.text()

    // Parse channel info
    const channelMatch = xml.match(/<channel[^>]*>([\s\S]*?)<\/channel>/)
    const channelXml = channelMatch ? channelMatch[1] : xml

    const feedTitle = extractText(channelXml.split('<item')[0], 'title') || 'RSS Feed'
    const feedLink = extractText(channelXml.split('<item')[0], 'link') || feedUrl
    const feedDescription = extractText(channelXml.split('<item')[0], 'description')

    // Parse items
    const itemMatches = xml.match(/<item[^>]*>[\s\S]*?<\/item>/gi) || []
    const items: RSSItem[] = itemMatches.slice(0, maxItems).map((item) => ({
      title: extractText(item, 'title') || 'Untitled',
      link: extractText(item, 'link') || feedUrl,
      description: extractText(item, 'description'),
      pubDate: extractText(item, 'pubDate') || extractText(item, 'dc:date'),
      author: extractText(item, 'author') || extractText(item, 'dc:creator'),
    }))

    const feed: RSSFeed = {
      title: feedTitle,
      link: feedLink,
      description: feedDescription,
      items,
      fetchedAt: new Date().toISOString(),
    }

    return NextResponse.json(feed)
  } catch (error) {
    console.error('GET /api/rss', error)
    return NextResponse.json({ error: 'Failed to fetch RSS feed' }, { status: 500 })
  }
}
