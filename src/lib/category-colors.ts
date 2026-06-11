export const DEFAULT_CATEGORY_HEADER_COLOR = '#e8f5e9';

export const CATEGORY_HEADER_COLORS: readonly string[] = [
  DEFAULT_CATEGORY_HEADER_COLOR,
  '#d8f3dc',
  '#d0f4de',
  '#cde7f0',
  '#dbeafe',
  '#e0e7ff',
  '#ede9fe',
  '#f3e8ff',
  '#fce7f3',
  '#fde2e4',
  '#ffe5d9',
  '#fff1cc',
  '#fef9c3',
  '#ecfccb',
  '#ccfbf1',
  '#e5e7eb',
];

export function normalizeCategoryHeaderColor(color: string) {
  const normalized = color.toLowerCase();
  return CATEGORY_HEADER_COLORS.includes(normalized) ? normalized : DEFAULT_CATEGORY_HEADER_COLOR;
}
