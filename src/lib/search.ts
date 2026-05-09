export type SearchSource = 'modrinth' | 'curseforge' | 'manual';

const CURSEFORGE_API_BASE_URL = 'https://api.curseforge.com/v1/mods/search';
const CURSEFORGE_MINECRAFT_GAME_ID = '432';
const CURSEFORGE_MOD_CLASS_ID = '6';
const CURSEFORGE_PAGE_SIZE = '15';

const CURSEFORGE_LOADER_TYPES: Record<string, string> = {
  forge: '1',
  fabric: '4',
  quilt: '5',
  neoforge: '6',
};

export interface SearchResult {
  name: string;
  description: string;
  icon: string;
  downloads: number;
  url: string;
  source: Exclude<SearchSource, 'manual'>;
  author: string;
}

export interface CurseForgeMod {
  id: number;
  name?: string;
  slug?: string;
  summary?: string;
  downloadCount?: number;
  logo?: {
    url?: string;
  } | null;
  links?: {
    websiteUrl?: string;
  } | null;
  authors?: Array<{
    name?: string;
  }>;
}

export function shouldAutoSearch(query: string, source: SearchSource): boolean {
  return source !== 'manual' && query.trim().length > 0;
}

export function buildModrinthSearchUrl(query: string, version: string, loader: string): string {
  const params = new URLSearchParams({ query: query.trim() });

  if (version) params.set('version', version);
  if (loader) params.set('loader', loader);

  return `/api/search/modrinth?${params}`;
}

export function buildCurseForgeSearchUrl(query: string, version: string, loader: string): string {
  const params = new URLSearchParams({ query: query.trim() });

  if (version) params.set('version', version);
  if (loader) params.set('loader', loader);

  return `/api/search/curseforge?${params}`;
}

export function buildSearchUrl(source: Exclude<SearchSource, 'manual'>, query: string, version: string, loader: string): string {
  return source === 'curseforge'
    ? buildCurseForgeSearchUrl(query, version, loader)
    : buildModrinthSearchUrl(query, version, loader);
}

export function buildCurseForgeApiSearchUrl(query: string, version: string, loader: string): string {
  const params = new URLSearchParams({
    gameId: CURSEFORGE_MINECRAFT_GAME_ID,
    classId: CURSEFORGE_MOD_CLASS_ID,
    searchFilter: query.trim(),
    pageSize: CURSEFORGE_PAGE_SIZE,
    sortField: '2',
    sortOrder: 'desc',
  });
  const loaderType = CURSEFORGE_LOADER_TYPES[loader.toLowerCase()];

  if (version) {
    params.set('gameVersion', version);
    if (loaderType) {
      params.set('modLoaderType', loaderType);
    }
  }

  return `${CURSEFORGE_API_BASE_URL}?${params}`;
}

export function mapCurseForgeModToSearchResult(mod: CurseForgeMod): SearchResult {
  const slug = mod.slug || String(mod.id);

  return {
    name: mod.name || 'Untitled CurseForge Mod',
    description: mod.summary || '',
    icon: mod.logo?.url || '',
    downloads: mod.downloadCount || 0,
    url: mod.links?.websiteUrl || `https://www.curseforge.com/minecraft/mc-mods/${slug}`,
    source: 'curseforge',
    author: mod.authors?.map((author) => author.name).filter(Boolean).join(', ') || '',
  };
}
