import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCurseForgeApiSearchUrl,
  buildCurseForgeSearchUrl,
  buildModrinthSearchUrl,
  mapCurseForgeModToSearchResult,
  shouldAutoSearch,
} from './search';

test('auto search starts only for non-empty non-manual searches', () => {
  assert.equal(shouldAutoSearch('', 'modrinth'), false);
  assert.equal(shouldAutoSearch('   ', 'modrinth'), false);
  assert.equal(shouldAutoSearch('sodium', 'manual'), false);
  assert.equal(shouldAutoSearch('sodium', 'modrinth'), true);
  assert.equal(shouldAutoSearch('sodium', 'curseforge'), true);
});

test('builds modrinth search URL with optional filters', () => {
  assert.equal(
    buildModrinthSearchUrl('sodium extra', '1.21.1', 'fabric'),
    '/api/search/modrinth?query=sodium+extra&version=1.21.1&loader=fabric',
  );
});

test('builds curseforge proxy search URL with optional filters', () => {
  assert.equal(
    buildCurseForgeSearchUrl('applied energistics', '1.21.1', 'neoforge'),
    '/api/search/curseforge?query=applied+energistics&version=1.21.1&loader=neoforge',
  );
});

test('builds curseforge upstream API search URL with Minecraft mod filters', () => {
  assert.equal(
    buildCurseForgeApiSearchUrl('applied energistics', '1.21.1', 'neoforge'),
    'https://api.curseforge.com/v1/mods/search?gameId=432&classId=6&searchFilter=applied+energistics&pageSize=15&sortField=2&sortOrder=desc&gameVersion=1.21.1&modLoaderType=6',
  );
});

test('omits curseforge mod loader type when no game version is selected', () => {
  assert.equal(
    buildCurseForgeApiSearchUrl('sodium', '', 'fabric'),
    'https://api.curseforge.com/v1/mods/search?gameId=432&classId=6&searchFilter=sodium&pageSize=15&sortField=2&sortOrder=desc',
  );
});

test('maps curseforge API mods to shared search results', () => {
  assert.deepEqual(
    mapCurseForgeModToSearchResult({
      id: 238222,
      name: 'Just Enough Items',
      slug: 'jei',
      summary: 'View Items and Recipes',
      downloadCount: 412345678,
      logo: { url: 'https://media.forgecdn.net/avatars/1/2/icon.png' },
      links: { websiteUrl: 'https://www.curseforge.com/minecraft/mc-mods/jei' },
      authors: [{ name: 'mezz' }],
    }),
    {
      name: 'Just Enough Items',
      description: 'View Items and Recipes',
      icon: 'https://media.forgecdn.net/avatars/1/2/icon.png',
      downloads: 412345678,
      url: 'https://www.curseforge.com/minecraft/mc-mods/jei',
      source: 'curseforge',
      author: 'mezz',
    },
  );
});
