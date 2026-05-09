import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const CURSEFORGE_API_KEY_NAME = 'CURSEFORGE_API_KEY';

export function parseRawEnvValue(envContents: string, key: string): string | null {
  const line = envContents
    .split(/\r?\n/)
    .find((item) => item.trim().startsWith(`${key}=`));

  if (!line) return null;

  const rawValue = line.slice(line.indexOf('=') + 1).trim();
  const unquoted = stripMatchingQuotes(rawValue);

  return unquoted.replaceAll('\\$', '$');
}

export function selectCurseForgeApiKey(expandedValue: string | undefined, rawValue: string | null): string | undefined {
  const expanded = expandedValue?.trim();
  const raw = rawValue?.trim();

  if (raw?.includes('$') && expanded !== raw) {
    return raw;
  }

  return expanded || raw || undefined;
}

export function getCurseForgeApiKey(): string | undefined {
  return selectCurseForgeApiKey(process.env[CURSEFORGE_API_KEY_NAME], readRawEnvFileValue());
}

export function describeCurseForgeApiKey(value: string | undefined) {
  const key = value || '';

  return {
    present: key.length > 0,
    length: key.length,
    prefix: key.slice(0, 4),
    suffix: key.slice(-4),
    containsDollar: key.includes('$'),
    containsBackslash: key.includes('\\'),
    containsWhitespace: /\s/.test(key),
  };
}

function readRawEnvFileValue(): string | null {
  try {
    return parseRawEnvValue(readFileSync(join(process.cwd(), '.env'), 'utf8'), CURSEFORGE_API_KEY_NAME);
  } catch {
    return null;
  }
}

function stripMatchingQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}
