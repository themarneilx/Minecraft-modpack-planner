import assert from 'node:assert/strict';
import test from 'node:test';
import {
  APPLE_TOUCH_ICON_SRC,
  FAVICON_16_SRC,
  FAVICON_32_SRC,
  FAVICON_ICO_SRC,
  SITE_MANIFEST_SRC,
  TREE_LOGO_ALT,
  TREE_LOGO_SRC,
} from './brand-assets';

test('uses the public Tree Emporium logo asset', () => {
  assert.equal(TREE_LOGO_SRC, '/tree.png');
});

test('provides accessible logo alt text for standalone logo use', () => {
  assert.equal(TREE_LOGO_ALT, 'Tree Emporium logo');
});

test('uses the favicon pack from the public directory', () => {
  assert.equal(FAVICON_ICO_SRC, '/favicon.ico');
  assert.equal(FAVICON_32_SRC, '/favicon-32x32.png');
  assert.equal(FAVICON_16_SRC, '/favicon-16x16.png');
  assert.equal(APPLE_TOUCH_ICON_SRC, '/apple-touch-icon.png');
  assert.equal(SITE_MANIFEST_SRC, '/site.webmanifest');
});
