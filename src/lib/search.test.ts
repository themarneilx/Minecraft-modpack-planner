import assert from 'node:assert/strict';
import test from 'node:test';
import { buildModrinthSearchUrl, shouldAutoSearch } from './search';

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
