export const MOD_PREVIEW_LIMIT = 10;

export function isCategoryModHidden<TMod extends { id: number }>(
  mods: TMod[],
  modId: number | null,
) {
  if (modId === null) return false;

  return mods.findIndex((mod) => mod.id === modId) >= MOD_PREVIEW_LIMIT;
}

export function getCategoryModHighlightPulseKey(
  modId: number,
  revealedModId: number | null,
  revealRequestId: number | null,
) {
  return modId === revealedModId && revealRequestId !== null
    ? `${modId}:reveal-pulse:${revealRequestId}`
    : null;
}

export function getCategoryModDisplay<TMod extends { id: number }>(
  mods: TMod[],
  expanded: boolean,
  revealedModId: number | null = null,
) {
  const canExpand = mods.length > MOD_PREVIEW_LIMIT;
  const revealsHiddenMod = isCategoryModHidden(mods, revealedModId);
  const visibleMods = canExpand && !expanded && !revealsHiddenMod
    ? mods.slice(0, MOD_PREVIEW_LIMIT)
    : mods;

  return {
    canExpand,
    hiddenCount: mods.length - visibleMods.length,
    visibleMods,
  };
}
