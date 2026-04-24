// Types derived from Prisma models for use in client components

export interface StatusInfo {
  id: number;
  key: string;
  label: string;
  color: string;
  textColor: string;
  sortOrder: number;
}

export interface Mod {
  id: number;
  name: string;
  statusKey: string;
  source: string;
  url: string;
  sortOrder: number;
  categoryId: number;
}

export interface Category {
  id: number;
  name: string;
  icon: string;
  headerBg: string;
  sortOrder: number;
  mods: Mod[];
}

export interface PackInfo {
  id: number;
  name: string;
  mcVersion: string;
  loader: string;
}

export interface AppData {
  statuses: StatusInfo[];
  categories: Category[];
  packInfo: PackInfo | null;
}
