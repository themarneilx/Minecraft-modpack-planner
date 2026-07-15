import type { BoardSortScope } from './board-tools';

export const BOARD_SORT_OPTIONS = [
  { value: 'categories', label: 'Categories A-Z' },
  { value: 'mods', label: 'Mods A-Z in every category' },
  { value: 'all', label: 'Everything A-Z' },
] as const satisfies ReadonlyArray<{ value: BoardSortScope; label: string }>;

export function parseBoardSortSelection(value: string): BoardSortScope | null {
  return BOARD_SORT_OPTIONS.some((option) => option.value === value)
    ? value as BoardSortScope
    : null;
}

export function getBoardSortStatus(scope: BoardSortScope) {
  switch (scope) {
    case 'categories':
      return 'Categories sorted A-Z and saved.';
    case 'mods':
      return 'Mods sorted A-Z in every category and saved.';
    case 'all':
      return 'Categories and mods sorted A-Z and saved.';
  }
}
