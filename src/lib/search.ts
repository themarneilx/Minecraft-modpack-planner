export type SearchSource = 'modrinth' | 'curseforge' | 'manual';

export function shouldAutoSearch(query: string, source: SearchSource): boolean {
  return source !== 'manual' && query.trim().length > 0;
}

export function buildModrinthSearchUrl(query: string, version: string, loader: string): string {
  const params = new URLSearchParams({ query: query.trim() });

  if (version) params.set('version', version);
  if (loader) params.set('loader', loader);

  return `/api/search/modrinth?${params}`;
}
