import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const STATUSES = [
  { key: 'modrinth',          label: 'Modrinth',         color: '#a8e6cf', textColor: '#1b5e3b', sortOrder: 0 },
  { key: 'curseforge',        label: 'CurseForge',       color: '#ffcc80', textColor: '#7a4a00', sortOrder: 1 },
  { key: 'fabric',            label: 'Fabric',           color: '#d4a5ff', textColor: '#4a1a7a', sortOrder: 2 },
  { key: 'added',             label: 'Added',            color: '#fff9c4', textColor: '#6d6200', sortOrder: 3 },
  { key: 'removed',           label: 'Removed',          color: '#ff8a80', textColor: '#7a1a10', sortOrder: 4 },
  { key: 'unused',            label: 'Unused????',       color: '#ffe0b2', textColor: '#7a5200', sortOrder: 5 },
  { key: 'pending-addition',  label: 'Pending Addition', color: '#b2ebf2', textColor: '#00626e', sortOrder: 6 },
  { key: 'fabric-added',      label: 'Fabric Added',     color: '#c5e1a5', textColor: '#3a5e1a', sortOrder: 7 },
  { key: 'dans-picks',        label: "Dan's Picks",      color: '#90caf9', textColor: '#0d3c6e', sortOrder: 8 },
  { key: 'pending-removal',   label: 'Pending Removal',  color: '#ffab91', textColor: '#6e2a10', sortOrder: 9 },
  { key: 'install-own',       label: 'Install Your Own', color: '#9fa8da', textColor: '#1a237e', sortOrder: 10 },
];

const CATEGORIES = [
  { name: 'Vanilla+ / Farm Mods',        icon: 'wheat',          headerBg: '#e8f5e9', sortOrder: 0 },
  { name: 'Decoration Mods',             icon: 'palette',        headerBg: '#fce4ec', sortOrder: 1 },
  { name: 'Tech / Science / Automation', icon: 'cog',            headerBg: '#e3f2fd', sortOrder: 2 },
  { name: 'Create Add-Ons',             icon: 'wrench',         headerBg: '#fff3e0', sortOrder: 3 },
  { name: 'Magic Mods',                 icon: 'sparkles',       headerBg: '#f3e5f5', sortOrder: 4 },
  { name: 'Add-ons',                    icon: 'puzzle',         headerBg: '#e0f7fa', sortOrder: 5 },
  { name: 'Optimization Mods',          icon: 'rocket',         headerBg: '#fff8e1', sortOrder: 6 },
  { name: 'Dependencies / Library Mods', icon: 'book-open',      headerBg: '#fbe9e7', sortOrder: 7 },
  { name: 'World Generation Mods',      icon: 'globe',          headerBg: '#e8eaf6', sortOrder: 8 },
];

const SAMPLE_MODS: Record<number, { name: string; statusKey: string; source: string; url: string }[]> = {
  0: [
    { name: 'Item Displayed', statusKey: 'added', source: 'modrinth', url: 'https://modrinth.com/mod/item-displays' },
    { name: "Farmer's Delight", statusKey: 'fabric', source: 'curseforge', url: 'https://www.curseforge.com/minecraft/mc-mods/farmers-delight-fabric' },
    { name: "Nature's Compass", statusKey: 'added', source: 'modrinth', url: '' },
    { name: 'Better Advancements', statusKey: 'added', source: 'modrinth', url: '' },
    { name: 'AppleSkin', statusKey: 'added', source: 'modrinth', url: '' },
  ],
  1: [
    { name: 'Domum Ornamentum', statusKey: 'added', source: 'modrinth', url: '' },
    { name: 'Handcrafted', statusKey: 'fabric-added', source: 'modrinth', url: '' },
    { name: "Macaw's Doors", statusKey: 'added', source: 'modrinth', url: '' },
  ],
  2: [
    { name: 'Create', statusKey: 'added', source: 'curseforge', url: '' },
    { name: 'Mekanism', statusKey: 'pending-addition', source: 'curseforge', url: '' },
    { name: 'Applied Energistics 2', statusKey: 'added', source: 'modrinth', url: '' },
  ],
  6: [
    { name: 'Ferrite Core', statusKey: 'added', source: 'modrinth', url: '' },
    { name: 'Sodium', statusKey: 'added', source: 'modrinth', url: 'https://modrinth.com/mod/sodium' },
    { name: 'Entity Culling', statusKey: 'pending-addition', source: 'modrinth', url: '' },
  ],
  7: [
    { name: 'Fabric API', statusKey: 'added', source: 'modrinth', url: '' },
    { name: 'Architectury API', statusKey: 'added', source: 'modrinth', url: '' },
  ],
  8: [
    { name: 'Deeper and Darker', statusKey: 'added', source: 'modrinth', url: '' },
    { name: 'Terralith', statusKey: 'fabric-added', source: 'modrinth', url: '' },
    { name: 'Dungeons and Taverns', statusKey: 'added', source: 'modrinth', url: '' },
  ],
};

async function main() {
  console.log('Seeding database...');

  // Clear existing data
  await prisma.mod.deleteMany();
  await prisma.category.deleteMany();
  await prisma.status.deleteMany();
  await prisma.packInfo.deleteMany();

  // Seed pack info
  await prisma.packInfo.create({
    data: { name: 'Vanilla+ Farm Modpack', mcVersion: '26.1.2', loader: 'Fabric' },
  });

  // Seed statuses
  for (const s of STATUSES) {
    await prisma.status.create({ data: s });
  }

  // Seed categories
  const createdCategories = [];
  for (const c of CATEGORIES) {
    const cat = await prisma.category.create({ data: c });
    createdCategories.push(cat);
  }

  // Seed mods
  for (const [catIndex, mods] of Object.entries(SAMPLE_MODS)) {
    const category = createdCategories[parseInt(catIndex)];
    if (!category) continue;
    for (let i = 0; i < mods.length; i++) {
      await prisma.mod.create({
        data: {
          name: mods[i].name,
          statusKey: mods[i].statusKey,
          source: mods[i].source,
          url: mods[i].url,
          categoryId: category.id,
          sortOrder: i,
        },
      });
    }
  }

  console.log('Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
