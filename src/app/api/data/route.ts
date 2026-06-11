import { NextResponse } from 'next/server';
import { normalizeModStatusKeys } from '@/lib/mod-statuses';
import { prisma } from '@/lib/prisma';

// GET all data in one call (statuses, categories with mods, pack info)
export async function GET() {
  try {
    const [statuses, categories, packInfo] = await Promise.all([
      prisma.status.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.category.findMany({
        orderBy: { sortOrder: 'asc' },
        include: {
          mods: {
            orderBy: { sortOrder: 'asc' },
            include: {
              statusIndicators: {
                orderBy: { sortOrder: 'asc' },
                select: { statusKey: true },
              },
            },
          },
        },
      }),
      prisma.packInfo.findFirst(),
    ]);

    const serializedCategories = categories.map((category) => ({
      ...category,
      mods: category.mods.map((mod) => {
        const { statusIndicators, ...modData } = mod;
        return {
          ...modData,
          statusKeys: normalizeModStatusKeys({
            statusKey: mod.statusKey,
            statusKeys: statusIndicators.map((indicator) => indicator.statusKey),
          }),
        };
      }),
    }));

    return NextResponse.json({ statuses, categories: serializedCategories, packInfo });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
