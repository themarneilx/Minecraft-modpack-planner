import assert from 'node:assert/strict';
import test from 'node:test';
import type { Category, Mod } from './data';
import { moveModInCategories } from './reorder';

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

function category(id: number, mods: Mod[]): Category {
  return {
    id,
    mods,
    name: `Category ${id}`,
    icon: 'wheat',
    headerBg: '#fff',
    sortOrder: id,
  };
}

test('moves a mod before another mod in the same category', () => {
  const result = moveModInCategories(
    [category(1, [mod(10, 1, 0), mod(11, 1, 1), mod(12, 1, 2)])],
    { modId: 12, sourceCategoryId: 1 },
    { targetCategoryId: 1, beforeModId: 10 },
  );

  assert.deepEqual(
    result.categories[0].mods.map((item) => [item.id, item.categoryId, item.sortOrder]),
    [
      [12, 1, 0],
      [10, 1, 1],
      [11, 1, 2],
    ],
  );
  assert.deepEqual(result.affectedCategories, [{ categoryId: 1, modIds: [12, 10, 11] }]);
});

test('moves a mod into another category at the requested position', () => {
  const result = moveModInCategories(
    [
      category(1, [mod(10, 1, 0), mod(11, 1, 1)]),
      category(2, [mod(20, 2, 0), mod(21, 2, 1)]),
    ],
    { modId: 11, sourceCategoryId: 1 },
    { targetCategoryId: 2, beforeModId: 21 },
  );

  assert.deepEqual(
    result.categories.map((group) => group.mods.map((item) => [item.id, item.categoryId, item.sortOrder])),
    [
      [[10, 1, 0]],
      [
        [20, 2, 0],
        [11, 2, 1],
        [21, 2, 2],
      ],
    ],
  );
  assert.deepEqual(result.affectedCategories, [
    { categoryId: 1, modIds: [10] },
    { categoryId: 2, modIds: [20, 11, 21] },
  ]);
});
