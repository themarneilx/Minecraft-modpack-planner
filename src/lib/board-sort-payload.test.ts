import assert from 'node:assert/strict';
import test from 'node:test';
import { parseBoardSortPayload } from './board-sort-payload';

test('parses a combined category and mod order', () => {
  assert.deepEqual(
    parseBoardSortPayload({
      categoryIds: [2, 1],
      categories: [
        { categoryId: 2, modIds: [] },
        { categoryId: 1, modIds: [12, 11] },
      ],
    }),
    {
      categoryIds: [2, 1],
      categories: [
        { categoryId: 2, modIds: [] },
        { categoryId: 1, modIds: [12, 11] },
      ],
    },
  );
});

test('parses a category-only order', () => {
  assert.deepEqual(parseBoardSortPayload({ categoryIds: [3, 1, 2] }), {
    categoryIds: [3, 1, 2],
    categories: null,
  });
});

test('parses a mod-only order including an empty category', () => {
  assert.deepEqual(
    parseBoardSortPayload({
      categories: [
        { categoryId: 1, modIds: [12, 11] },
        { categoryId: 2, modIds: [] },
      ],
    }),
    {
      categoryIds: null,
      categories: [
        { categoryId: 1, modIds: [12, 11] },
        { categoryId: 2, modIds: [] },
      ],
    },
  );
});

const invalidPayloads: Array<{ name: string; value: unknown }> = [
  { name: 'null payload', value: null },
  { name: 'undefined payload', value: undefined },
  { name: 'primitive payload', value: 'invalid' },
  { name: 'array payload', value: [] },
  { name: 'payload without an order', value: {} },
  { name: 'empty category order', value: { categoryIds: [] } },
  { name: 'empty mod order', value: { categories: [] } },
  { name: 'two empty orders', value: { categoryIds: [], categories: [] } },
  {
    name: 'null category order alongside a valid mod order',
    value: { categoryIds: null, categories: [{ categoryId: 1, modIds: [] }] },
  },
  {
    name: 'null mod order alongside a valid category order',
    value: { categoryIds: [1], categories: null },
  },
  { name: 'non-array category order', value: { categoryIds: 1 } },
  { name: 'zero category ID', value: { categoryIds: [0] } },
  { name: 'negative category ID', value: { categoryIds: [-1] } },
  { name: 'fractional category ID', value: { categoryIds: [1.5] } },
  { name: 'non-number category ID', value: { categoryIds: ['1'] } },
  { name: 'duplicate category order ID', value: { categoryIds: [1, 1] } },
  { name: 'non-array mod order', value: { categories: {} } },
  { name: 'null category entry', value: { categories: [null] } },
  { name: 'array category entry', value: { categories: [[]] } },
  { name: 'category entry without an ID', value: { categories: [{ modIds: [] }] } },
  { name: 'category entry with a zero ID', value: { categories: [{ categoryId: 0, modIds: [] }] } },
  { name: 'category entry with a negative ID', value: { categories: [{ categoryId: -1, modIds: [] }] } },
  { name: 'category entry with a fractional ID', value: { categories: [{ categoryId: 1.5, modIds: [] }] } },
  { name: 'category entry with a non-number ID', value: { categories: [{ categoryId: '1', modIds: [] }] } },
  { name: 'duplicate category entry ID', value: { categories: [{ categoryId: 1, modIds: [] }, { categoryId: 1, modIds: [] }] } },
  { name: 'category entry without mod IDs', value: { categories: [{ categoryId: 1 }] } },
  { name: 'category entry with null mod IDs', value: { categories: [{ categoryId: 1, modIds: null }] } },
  { name: 'category entry with non-array mod IDs', value: { categories: [{ categoryId: 1, modIds: 2 }] } },
  { name: 'zero mod ID', value: { categories: [{ categoryId: 1, modIds: [0] }] } },
  { name: 'negative mod ID', value: { categories: [{ categoryId: 1, modIds: [-1] }] } },
  { name: 'fractional mod ID', value: { categories: [{ categoryId: 1, modIds: [1.5] }] } },
  { name: 'non-number mod ID', value: { categories: [{ categoryId: 1, modIds: ['1'] }] } },
  { name: 'duplicate mod ID within a category', value: { categories: [{ categoryId: 1, modIds: [1, 1] }] } },
  {
    name: 'duplicate mod ID across categories',
    value: {
      categories: [
        { categoryId: 1, modIds: [10] },
        { categoryId: 2, modIds: [10] },
      ],
    },
  },
];

for (const { name, value } of invalidPayloads) {
  test(`rejects ${name}`, () => {
    assert.equal(parseBoardSortPayload(value), null);
  });
}
