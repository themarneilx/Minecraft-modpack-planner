import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildModStatusUpdate,
  normalizeModStatusKeys,
  orderSelectedStatusKeys,
} from './mod-statuses';

test('normalizes legacy single-status mods into one status indicator', () => {
  assert.deepEqual(
    normalizeModStatusKeys({ statusKey: 'added', statusKeys: [] }),
    ['added'],
  );
});

test('keeps the primary status first and removes duplicate indicators', () => {
  assert.deepEqual(
    normalizeModStatusKeys({
      statusKey: 'curseforge',
      statusKeys: ['added', 'curseforge', 'added', 'fabric'],
    }),
    ['curseforge', 'added', 'fabric'],
  );
});

test('orders selected statuses with the explicit primary first', () => {
  assert.deepEqual(
    orderSelectedStatusKeys({
      selectedKeys: ['fabric', 'added', 'curseforge'],
      primaryKey: 'added',
      availableKeys: ['curseforge', 'fabric', 'added', 'removed'],
    }),
    ['added', 'curseforge', 'fabric'],
  );
});

test('builds a mod update payload with a primary status and ordered indicators', () => {
  assert.deepEqual(
    buildModStatusUpdate({
      selectedKeys: ['fabric', 'added'],
      primaryKey: 'fabric',
      availableKeys: ['added', 'fabric'],
      fallbackStatusKey: 'added',
    }),
    {
      statusKey: 'fabric',
      statusKeys: ['fabric', 'added'],
    },
  );
});
