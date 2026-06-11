import assert from 'node:assert/strict';
import test from 'node:test';
import { CATEGORY_HEADER_COLORS } from './category-colors';

test('category header palette has exactly sixteen unique pastel colors', () => {
  assert.equal(CATEGORY_HEADER_COLORS.length, 16);
  assert.equal(new Set(CATEGORY_HEADER_COLORS).size, 16);

  for (const color of CATEGORY_HEADER_COLORS) {
    assert.match(color, /^#[0-9a-f]{6}$/);
    const channels = color
      .slice(1)
      .match(/.{2}/g)
      ?.map((value) => parseInt(value, 16)) ?? [];

    assert.equal(channels.length, 3);
    assert.ok(channels.every((channel) => channel >= 185), `${color} should stay in the pastel range`);
  }
});

test('category header palette includes the default green', () => {
  assert.ok(CATEGORY_HEADER_COLORS.includes('#e8f5e9'));
});
