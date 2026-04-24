import {
  Wheat, Palette, Cog, Wrench, Sparkles, Puzzle,
  Rocket, BookOpen, Globe, Sword, Shield, Flame,
  Zap, Heart, Star, Package, Blocks, Mountain,
  TreePine, Pickaxe, Gem, FlaskConical, Anvil,
  Compass, Map, Cpu, Server, Hammer, Crown, Skull,
  type LucideIcon,
} from 'lucide-react';

// Registry mapping icon key names to Lucide components
export const ICON_REGISTRY: Record<string, LucideIcon> = {
  wheat: Wheat,
  palette: Palette,
  cog: Cog,
  wrench: Wrench,
  sparkles: Sparkles,
  puzzle: Puzzle,
  rocket: Rocket,
  'book-open': BookOpen,
  globe: Globe,
  sword: Sword,
  shield: Shield,
  flame: Flame,
  zap: Zap,
  heart: Heart,
  star: Star,
  package: Package,
  blocks: Blocks,
  mountain: Mountain,
  'tree-pine': TreePine,
  pickaxe: Pickaxe,
  gem: Gem,
  'flask-conical': FlaskConical,
  anvil: Anvil,
  compass: Compass,
  map: Map,
  cpu: Cpu,
  server: Server,
  hammer: Hammer,
  crown: Crown,
  skull: Skull,
};

// Get a Lucide component by key, fallback to Package
export function getIcon(key: string): LucideIcon {
  return ICON_REGISTRY[key] || Package;
}

// All available icon keys for the picker
export const ICON_KEYS = Object.keys(ICON_REGISTRY);
