import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  buildCurseForgeApiSearchUrl,
  mapCurseForgeModToSearchResult,
  type CurseForgeMod,
} from '@/lib/search';
import { describeCurseForgeApiKey, getCurseForgeApiKey } from '@/server/curseforge-env';

interface CurseForgeSearchResponse {
  data?: CurseForgeMod[];
}

export async function GET(request: NextRequest) {
  const apiKey = getCurseForgeApiKey();
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query') || '';
  const version = searchParams.get('version') || '';
  const loader = searchParams.get('loader') || '';

  if (!query.trim()) {
    return NextResponse.json({ hits: [] });
  }

  if (!apiKey) {
    return NextResponse.json(
      { error: 'CURSEFORGE_API_KEY is not configured. Add it to .env and restart the server.' },
      { status: 500 },
    );
  }

  try {
    const res = await fetch(buildCurseForgeApiSearchUrl(query, version, loader), {
      headers: {
        Accept: 'application/json',
        'x-api-key': apiKey,
      },
    });

    if (!res.ok) {
      const body = await res.text();
      const error = res.status === 401 || res.status === 403
        ? 'CurseForge API key was rejected. Check CURSEFORGE_API_KEY in .env and make sure it is a Core API key.'
        : 'CurseForge API error';

      console.warn('CurseForge search failed', {
        status: res.status,
        statusText: res.statusText,
        body: body.slice(0, 500),
        key: describeCurseForgeApiKey(apiKey),
      });

      return NextResponse.json({ error }, { status: res.status });
    }

    const data = await res.json() as CurseForgeSearchResponse;
    const hits = (data.data || []).map(mapCurseForgeModToSearchResult);

    return NextResponse.json({ hits });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
