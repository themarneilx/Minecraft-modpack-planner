import { NextResponse } from 'next/server';
import { normalizeModStatusKeys } from '@/lib/mod-statuses';
import { prisma } from '@/lib/prisma';

// GET all data in one call (statuses, categories with mods, pack info)
export async function GET() {
  try {
    const [statuses, categories, packInfo] = await Promise.all([
      prisma.status.findMany({
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          key: true,
          label: true,
          color: true,
          textColor: true,
          sortOrder: true,
        },
      }),
      prisma.category.findMany({
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          name: true,
          icon: true,
          headerBg: true,
          sortOrder: true,
          mods: {
            orderBy: { sortOrder: 'asc' },
            select: {
              id: true,
              name: true,
              statusKey: true,
              source: true,
              url: true,
              sortOrder: true,
              categoryId: true,
              statusIndicators: {
                orderBy: { sortOrder: 'asc' },
                select: { statusKey: true },
              },
            },
          },
        },
      }),
      prisma.packInfo.findFirst({
        select: {
          id: true,
          name: true,
          mcVersion: true,
          loader: true,
          updatedAt: true,
        },
      }),
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
