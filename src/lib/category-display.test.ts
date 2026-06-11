import assert from 'node:assert/strict';
import test from 'node:test';
import type { Mod } from './data';
import { getCategoryModDisplay, MOD_PREVIEW_LIMIT } from './category-display';

function mod(id: number): Mod {
  return {
    id,
    categoryId: 1,
    sortOrder: id,
    name: `Mod ${id}`,
    statusKey: 'added',
    statusKeys: ['added'],
    source: 'manual',
    url: '',
  };
}

test('shows all mods when the category has ten or fewer mods', () => {
  const mods = Array.from({ length: MOD_PREVIEW_LIMIT }, (_, index) => mod(index + 1));
  const display = getCategoryModDisplay(mods, false);

  assert.equal(display.canExpand, false);
  assert.equal(display.hiddenCount, 0);
  assert.deepEqual(display.visibleMods.map((item) => item.id), mods.map((item) => item.id));
});

test('limits collapsed categories to ten mods and reports hidden count', () => {
  const mods = Array.from({ length: MOD_PREVIEW_LIMIT + 2 }, (_, index) => mod(index + 1));
  const display = getCategoryModDisplay(mods, false);

  assert.equal(display.canExpand, true);
  assert.equal(display.hiddenCount, 2);
  assert.deepEqual(display.visibleMods.map((item) => item.id), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test('shows all mods when an oversized category is expanded', () => {
  const mods = Array.from({ length: MOD_PREVIEW_LIMIT + 2 }, (_, index) => mod(index + 1));
  const display = getCategoryModDisplay(mods, true);

  assert.equal(display.canExpand, true);
  assert.equal(display.hiddenCount, 0);
  assert.deepEqual(display.visibleMods.map((item) => item.id), mods.map((item) => item.id));
});
