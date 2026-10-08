import { cacheGet, cacheSet } from './cache';

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  symbol?: string;
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  event_type: 'EARNINGS' | 'M&A' | 'REGULATORY' | 'MACRO';
  published_at: string;
}

function analyzeSentiment(title: string): 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' {
  const t = title.toLowerCase();
  const positiveWords = ['profit', 'surge', 'gain', 'growth', 'rally', 'soar', 'record', 'high', 'jump', 'up', 'beat', 'bullish', 'outperform', 'order', 'rise'];
  const negativeWords = ['loss', 'fall', 'drop', 'decline', 'plunge', 'warn', 'slump', 'down', 'miss', 'bearish', 'cut', 'penalty', 'probe', 'crisis', 'crash', 'tank', 'dives'];

  let score = 0;
  for (const w of positiveWords) {
    if (t.includes(w)) score++;
  }
  for (const w of negativeWords) {
    if (t.includes(w)) score--;
  }

  if (score > 0) return 'POSITIVE';
  if (score < 0) return 'NEGATIVE';
  return 'NEUTRAL';
}

function classifyEventType(title: string): 'EARNINGS' | 'M&A' | 'REGULATORY' | 'MACRO' {
  const t = title.toLowerCase();
  if (t.includes('q1') || t.includes('q2') || t.includes('q3') || t.includes('q4') || t.includes('profit') || t.includes('revenue') || t.includes('earnings')) {
    return 'EARNINGS';
  }
  if (t.includes('buy') || t.includes('acquire') || t.includes('stake') || t.includes('merger') || t.includes('acquisition')) {
    return 'M&A';
  }
  if (t.includes('rbi') || t.includes('sebi') || t.includes('court') || t.includes('tax') || t.includes('gov') || t.includes('govt')) {
    return 'REGULATORY';
  }
  return 'MACRO';
}

export async function fetchLiveNews(symbol?: string, limit: number = 25): Promise<NewsItem[]> {
  const cleanSymbol = symbol ? symbol.toUpperCase().trim() : '';
  const cacheKey = `live_news:${cleanSymbol || 'MACRO'}:${limit}`;

  const cached = await cacheGet<NewsItem[]>(cacheKey);
  if (cached && cached.length > 0) {
    return cached;
  }

  try {
    const query = cleanSymbol ? `${cleanSymbol} NSE BSE stock` : 'NSE BSE Indian stock market RBI Sensex Nifty';
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;

    const res = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      next: { revalidate: 300 }, // 5 min cache
    });

    if (!res.ok) {
      return [];
    }

    const xml = await res.text();
    const items: NewsItem[] = [];
    const itemRegex = /<item>[\s\S]*?<\/item>/g;
    const itemMatches = xml.match(itemRegex) || [];

    for (let i = 0; i < Math.min(itemMatches.length, limit); i++) {
      const match = itemMatches[i];

      const titleMatch = match.match(/<title>(.*?)<\/title>/);
      const linkMatch = match.match(/<link>(.*?)<\/link>/);
      const pubDateMatch = match.match(/<pubDate>(.*?)<\/pubDate>/);
      const sourceMatch = match.match(/<source[^>]*>(.*?)<\/source>/);

      let fullTitle = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : '';
      const url = linkMatch ? linkMatch[1].trim() : '#';
      const pubDateStr = pubDateMatch ? pubDateMatch[1].trim() : new Date().toISOString();
      let source = sourceMatch ? sourceMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : 'Google News';

      if (fullTitle.includes(' - ')) {
        const parts = fullTitle.split(' - ');
        if (!source || source === 'Google News') {
          source = parts.pop() || 'Financial Media';
        } else {
          parts.pop();
        }
        fullTitle = parts.join(' - ');
      }

      if (!fullTitle) continue;

      const pubDate = new Date(pubDateStr);
      const published_at = isNaN(pubDate.getTime()) ? new Date().toISOString() : pubDate.toISOString();

      items.push({
        id: `news-${cleanSymbol || 'macro'}-${i}-${Date.now()}`,
        title: fullTitle,
        summary: `Live financial headline reported by ${source}.`,
        source,
        url,
        symbol: cleanSymbol || undefined,
        sentiment: analyzeSentiment(fullTitle),
        event_type: classifyEventType(fullTitle),
        published_at,
      });
    }

    if (items.length > 0) {
      await cacheSet(cacheKey, items, 300_000);
    }

    return items;
  } catch (err) {
    console.error('Live news fetch failed:', err);
    return [];
  }
}
