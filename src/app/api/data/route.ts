import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET all data in one call (statuses, categories with mods, pack info)
export async function GET() {
  try {
    const [statuses, categories, packInfo] = await Promise.all([
      prisma.status.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.category.findMany({
        orderBy: { sortOrder: 'asc' },
        include: {
          mods: { orderBy: { sortOrder: 'asc' } },
        },
      }),
      prisma.packInfo.findFirst(),
    ]);

    return NextResponse.json({ statuses, categories, packInfo });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
