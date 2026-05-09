import assert from 'node:assert/strict';
import test from 'node:test';
import { describeCurseForgeApiKey, parseRawEnvValue, selectCurseForgeApiKey } from './curseforge-env';

test('parses quoted raw env values without expanding dollar signs', () => {
  assert.equal(
    parseRawEnvValue('DATABASE_URL="postgresql://db"\nCURSEFORGE_API_KEY="$2a$10$abcdef"\n', 'CURSEFORGE_API_KEY'),
    '$2a$10$abcdef',
  );
});

test('unescapes escaped dollar signs in raw env values', () => {
  assert.equal(
    parseRawEnvValue('CURSEFORGE_API_KEY="\\$2a\\$10\\$abcdef"\n', 'CURSEFORGE_API_KEY'),
    '$2a$10$abcdef',
  );
});

test('prefers raw dotenv value when Next expanded a dollar-sign key incorrectly', () => {
  assert.equal(selectCurseForgeApiKey('', '$2a$10$abcdef'), '$2a$10$abcdef');
  assert.equal(selectCurseForgeApiKey('abcdef', '$2a$10$abcdef'), '$2a$10$abcdef');
});

test('keeps process env when there is no raw dotenv override', () => {
  assert.equal(selectCurseForgeApiKey('plain-api-key', null), 'plain-api-key');
});

test('describes curseforge api key without exposing the secret', () => {
  assert.deepEqual(describeCurseForgeApiKey('$2a$10$abcdef'), {
    present: true,
    length: 13,
    prefix: '$2a$',
    suffix: 'cdef',
    containsDollar: true,
    containsBackslash: false,
    containsWhitespace: false,
  });
});

test('describes missing curseforge api key without secret fields', () => {
  assert.deepEqual(describeCurseForgeApiKey(undefined), {
    present: false,
    length: 0,
    prefix: '',
    suffix: '',
    containsDollar: false,
    containsBackslash: false,
    containsWhitespace: false,
  });
});
