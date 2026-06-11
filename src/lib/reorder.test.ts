import assert from 'node:assert/strict';
import test from 'node:test';
import type { Category, Mod } from './data';
import { isSameCategoryDropPosition, moveCategoryInList, moveModInCategories } from './reorder';

function mod(id: number, categoryId: number, sortOrder: number): Mod {
  return {
    id,
    categoryId,
    sortOrder,
    name: `Mod ${id}`,
    statusKey: 'added',
    statusKeys: ['added'],
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

test('moves a category before another category and preserves its mods', () => {
  const result = moveCategoryInList(
    [
      category(1, [mod(10, 1, 0)]),
      category(2, [mod(20, 2, 0)]),
      category(3, [mod(30, 3, 0)]),
    ],
    3,
    1,
  );

  assert.deepEqual(
    result.categories.map((item) => [item.id, item.sortOrder, item.mods.map((modItem) => modItem.id)]),
    [
      [3, 0, [30]],
      [1, 1, [10]],
      [2, 2, [20]],
    ],
  );
  assert.deepEqual(result.categoryIds, [3, 1, 2]);
});

test('moves a category to the end of the list', () => {
  const result = moveCategoryInList(
    [
      category(1, []),
      category(2, []),
      category(3, []),
    ],
    1,
    null,
  );

  assert.deepEqual(result.categories.map((item) => [item.id, item.sortOrder]), [
    [2, 0],
    [3, 1],
    [1, 2],
  ]);
  assert.deepEqual(result.categoryIds, [2, 3, 1]);
});

test('detects when a category drop would keep the same order', () => {
  const categories = [
    category(1, []),
    category(2, []),
    category(3, []),
  ];

  assert.equal(isSameCategoryDropPosition(categories, 2, 2), true);
  assert.equal(isSameCategoryDropPosition(categories, 2, 3), true);
  assert.equal(isSameCategoryDropPosition(categories, 3, null), true);
  assert.equal(isSameCategoryDropPosition(categories, 2, 1), false);
  assert.equal(isSameCategoryDropPosition(categories, 1, null), false);
});
