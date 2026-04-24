import assert from 'node:assert/strict';
import test from 'node:test';
import type { Category, Mod } from './data';
import { upsertModInCategory } from './mod-list';

function mod(id: number, categoryId: number, sortOrder: number): Mod {
  return {
    id,
    categoryId,
    sortOrder,
    name: `Mod ${id}`,
    statusKey: 'added',
    source: 'manual',
    url: '',
  };
}

function category(id: number, mods: Mod[] = []): Category {
  return {
    id,
    mods,
    name: `Category ${id}`,
    icon: 'package',
    headerBg: '#e8f5e9',
    sortOrder: id,
  };
}

test('adds a created mod to an empty category', () => {
  const categories = [category(1, [mod(10, 1, 0)]), category(2)];

  const next = upsertModInCategory(categories, 2, mod(20, 2, 0));

  assert.deepEqual(next[1].mods.map((item) => item.id), [20]);
});

test('moves an existing mod instance into the target category without duplicating it', () => {
  const categories = [category(1, [mod(10, 1, 0), mod(20, 1, 1)]), category(2)];

  const next = upsertModInCategory(categories, 2, mod(20, 2, 0));

  assert.deepEqual(next[0].mods.map((item) => item.id), [10]);
  assert.deepEqual(next[1].mods.map((item) => item.id), [20]);
  assert.equal(next[1].mods[0].categoryId, 2);
});
