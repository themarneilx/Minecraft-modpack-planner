import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

interface ModrinthHit {
  title: string;
  description: string;
  icon_url: string;
  downloads: number;
  slug: string;
  author: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query') || '';
  const version = searchParams.get('version') || '';
  const loader = searchParams.get('loader') || '';

  if (!query) {
    return NextResponse.json({ hits: [] });
  }

  const facets: string[][] = [['project_type:mod']];
  if (version) facets.push([`versions:${version}`]);
  if (loader) facets.push([`categories:${loader}`]);

  const url = `https://api.modrinth.com/v2/search?query=${encodeURIComponent(query)}&facets=${encodeURIComponent(JSON.stringify(facets))}&limit=15`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ModCraft/1.0.0 (modpack-builder)' },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Modrinth API error' }, { status: res.status });
    }

    const data = await res.json();
    const hits = data.hits.map((h: ModrinthHit) => ({
      name: h.title,
      description: h.description,
      icon: h.icon_url || '',
      downloads: h.downloads,
      url: `https://modrinth.com/mod/${h.slug}`,
      source: 'modrinth',
      author: h.author,
    }));

    return NextResponse.json({ hits });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
