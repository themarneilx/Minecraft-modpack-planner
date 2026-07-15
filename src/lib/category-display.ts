export const MOD_PREVIEW_LIMIT = 10;

export function getCategoryModDisplay<TMod extends { id: number }>(
  mods: TMod[],
  expanded: boolean,
  revealedModId: number | null = null,
) {
  const canExpand = mods.length > MOD_PREVIEW_LIMIT;
  const containsRevealedMod = revealedModId !== null && mods.some((mod) => mod.id === revealedModId);
  const visibleMods = canExpand && !expanded && !containsRevealedMod
    ? mods.slice(0, MOD_PREVIEW_LIMIT)
    : mods;

  return {
    canExpand,
    hiddenCount: mods.length - visibleMods.length,
    visibleMods,
  };
}
