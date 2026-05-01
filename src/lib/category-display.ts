export const MOD_PREVIEW_LIMIT = 10;

export function getCategoryModDisplay<TMod>(mods: TMod[], expanded: boolean) {
  const canExpand = mods.length > MOD_PREVIEW_LIMIT;
  const visibleMods = canExpand && !expanded ? mods.slice(0, MOD_PREVIEW_LIMIT) : mods;

  return {
    canExpand,
    hiddenCount: mods.length - visibleMods.length,
    visibleMods,
  };
}
