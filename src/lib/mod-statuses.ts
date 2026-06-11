interface ModStatusInput {
  statusKey?: string | null;
  statusKeys?: readonly string[] | null;
}

interface StatusSelectionInput {
  selectedKeys: readonly string[];
  primaryKey: string;
  availableKeys: readonly string[];
}

interface ModStatusUpdateInput extends StatusSelectionInput {
  fallbackStatusKey: string;
}

function cleanStatusKey(key: string | null | undefined) {
  const trimmed = key?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

function uniqueStatusKeys(keys: readonly (string | null | undefined)[]) {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const key of keys) {
    const cleanKey = cleanStatusKey(key);
    if (!cleanKey || seen.has(cleanKey)) continue;
    seen.add(cleanKey);
    unique.push(cleanKey);
  }

  return unique;
}

export function normalizeModStatusKeys(mod: ModStatusInput, fallbackStatusKey = 'added') {
  const statusKeys = uniqueStatusKeys(mod.statusKeys ?? []);
  const primaryKey = cleanStatusKey(mod.statusKey) ?? statusKeys[0] ?? fallbackStatusKey;

  return uniqueStatusKeys([primaryKey, ...statusKeys]);
}

export function orderSelectedStatusKeys({ selectedKeys, primaryKey, availableKeys }: StatusSelectionInput) {
  const selected = new Set(uniqueStatusKeys(selectedKeys));
  const primary = selected.has(primaryKey) ? primaryKey : selected.values().next().value;

  if (!primary) return [];

  const orderedByLegend = availableKeys.filter((key) => selected.has(key) && key !== primary);
  const unknownSelectedKeys = [...selected].filter((key) => key !== primary && !availableKeys.includes(key));

  return [primary, ...orderedByLegend, ...unknownSelectedKeys];
}

export function buildModStatusUpdate({
  selectedKeys,
  primaryKey,
  availableKeys,
  fallbackStatusKey,
}: ModStatusUpdateInput) {
  const orderedStatusKeys = orderSelectedStatusKeys({ selectedKeys, primaryKey, availableKeys });
  const statusKeys = orderedStatusKeys.length > 0 ? orderedStatusKeys : [fallbackStatusKey];

  return {
    statusKey: statusKeys[0],
    statusKeys,
  };
}
