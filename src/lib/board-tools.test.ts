import assert from 'node:assert/strict';
import test from 'node:test';
import type { Category, Mod } from './data';
import {
  buildBoardSortPayload,
  searchBoardMods,
  sortBoardAlphabetically,
  type BoardModSearchResult,
  type BoardSortPayload,
  type BoardSortScope,
} from './board-tools';

function mod(
  id: number,
  categoryId: number,
  name: string,
  sortOrder: number,
): Mod {
  return {
    id,
    categoryId,
    name,
    sortOrder,
    statusKey: 'added',
    statusKeys: ['added'],
    source: 'manual',
    url: '',
  };
}

function category(
  id: number,
  name: string,
  sortOrder: number,
  mods: Mod[],
): Category {
  return {
    id,
    name,
    sortOrder,
    mods,
    icon: 'wheat',
    headerBg: '#fff',
  };
}

test('category sorting uses natural case-insensitive order and preserves mod positions', () => {
  const categories = [
    category(20, 'WORLD 2', 8, [
      mod(201, 20, 'Zulu', 12),
      mod(202, 20, 'Alpha', 4),
    ]),
    category(30, 'World 10', 3, []),
    category(10, 'world 2', 6, []),
  ];
  const original = structuredClone(categories);

  const result = sortBoardAlphabetically(categories, 'categories');

  assert.deepEqual(result.map((item) => [item.id, item.sortOrder]), [
    [10, 0],
    [20, 1],
    [30, 2],
  ]);
  assert.deepEqual(result[1].mods.map((item) => [item.id, item.sortOrder]), [
    [201, 12],
    [202, 4],
  ]);
  assert.deepEqual(categories, original);
  assert.notStrictEqual(result, categories);
});

test('mod sorting preserves category positions and normalizes only mod sort orders', () => {
  const categories = [
    category(2, 'Second', 9, [
      mod(40, 2, 'World 10', 6),
      mod(30, 2, 'World 2', 2),
      mod(20, 2, 'world 2', 8),
      mod(50, 2, 'Alpha', 4),
    ]),
    category(1, 'First', 3, [mod(10, 1, 'Beta', 11)]),
  ];

  const result = sortBoardAlphabetically(categories, 'mods');

  assert.deepEqual(result.map((item) => [item.id, item.sortOrder]), [
    [2, 9],
    [1, 3],
  ]);
  assert.deepEqual(result[0].mods.map((item) => [item.id, item.sortOrder]), [
    [50, 0],
    [20, 1],
    [30, 2],
    [40, 3],
  ]);
  assert.deepEqual(result[1].mods.map((item) => [item.id, item.sortOrder]), [[10, 0]]);
});

test('all sorting normalizes category and mod positions together', () => {
  const categories = [
    category(2, 'Group 10', 14, [
      mod(22, 2, 'Option 10', 18),
      mod(21, 2, 'Option 2', 15),
    ]),
    category(1, 'group 2', 11, [
      mod(12, 1, 'Beta', 21),
      mod(11, 1, 'alpha', 24),
    ]),
  ];
  const scope: BoardSortScope = 'all';

  const result = sortBoardAlphabetically(categories, scope);

  assert.deepEqual(
    result.map((item) => [
      item.id,
      item.sortOrder,
      item.mods.map((modItem) => [modItem.id, modItem.sortOrder]),
    ]),
    [
      [1, 0, [[11, 0], [12, 1]]],
      [2, 1, [[21, 0], [22, 1]]],
    ],
  );
});

test('sort payload includes only the fields required by each scope', () => {
  const categories = [
    category(3, 'Third', 0, [
      mod(31, 3, 'Persisted', 0),
      mod(-1, 3, 'Optimistic', 1),
    ]),
    category(2, 'Second', 1, [mod(0, 2, 'Temporary', 0)]),
    category(1, 'First', 2, [
      mod(12, 1, 'Twelve', 0),
      mod(11, 1, 'Eleven', 1),
    ]),
  ];

  const categoryPayload: BoardSortPayload = buildBoardSortPayload(categories, 'categories');
  const modPayload: BoardSortPayload = buildBoardSortPayload(categories, 'mods');
  const allPayload: BoardSortPayload = buildBoardSortPayload(categories, 'all');

  assert.deepEqual(categoryPayload, { categoryIds: [3, 2, 1] });
  assert.deepEqual(modPayload, {
    categories: [
      { categoryId: 3, modIds: [31] },
      { categoryId: 2, modIds: [] },
      { categoryId: 1, modIds: [12, 11] },
    ],
  });
  assert.deepEqual(allPayload, {
    categoryIds: [3, 2, 1],
    categories: [
      { categoryId: 3, modIds: [31] },
      { categoryId: 2, modIds: [] },
      { categoryId: 1, modIds: [12, 11] },
    ],
  });
});

test('mod search returns duplicate names with category context in deterministic order', () => {
  const categories = [
    category(30, 'Zeta', 0, [mod(30, 30, 'Storage Drawers', 0)]),
    category(20, 'Alpha 10', 1, [mod(20, 20, 'storage drawers', 0)]),
    category(10, 'Alpha 2', 2, [
      mod(10, 10, 'STORAGE DRAWERS', 0),
      mod(5, 10, 'Storage Drawers', 1),
    ]),
  ];
  const expected: BoardModSearchResult[] = [
    { modId: 5, categoryId: 10, modName: 'Storage Drawers', categoryName: 'Alpha 2' },
    { modId: 10, categoryId: 10, modName: 'STORAGE DRAWERS', categoryName: 'Alpha 2' },
    { modId: 20, categoryId: 20, modName: 'storage drawers', categoryName: 'Alpha 10' },
    { modId: 30, categoryId: 30, modName: 'Storage Drawers', categoryName: 'Zeta' },
  ];

  assert.deepEqual(searchBoardMods(categories, 'DrAwEr'), expected);
});

test('mod search returns no results for blank queries', () => {
  const categories = [category(1, 'Utilities', 0, [mod(1, 1, 'JEI', 0)])];

  assert.deepEqual(searchBoardMods(categories, ''), []);
  assert.deepEqual(searchBoardMods(categories, '   \n\t'), []);
});

test('mod search applies the default and requested limits after sorting', () => {
  const categories = [
    category(
      1,
      'Utilities',
      0,
      Array.from({ length: 10 }, (_, index) =>
        mod(index + 1, 1, `Match ${10 - index}`, index),
      ),
    ),
  ];

  assert.deepEqual(
    searchBoardMods(categories, 'match').map((result) => result.modName),
    ['Match 1', 'Match 2', 'Match 3', 'Match 4', 'Match 5', 'Match 6', 'Match 7', 'Match 8'],
  );
  assert.deepEqual(
    searchBoardMods(categories, 'match', 3).map((result) => result.modName),
    ['Match 1', 'Match 2', 'Match 3'],
  );
});
