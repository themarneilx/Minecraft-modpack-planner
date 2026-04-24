import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastAppDataUpdated } from '@/server/realtime';

// GET all categories (with mods)
export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { mods: { orderBy: { sortOrder: 'asc' } } },
  });
  return NextResponse.json(categories);
}

// POST create a new category
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, icon, headerBg } = body;

    if (!name || !icon || !headerBg) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const maxSort = await prisma.category.aggregate({ _max: { sortOrder: true } });
    const category = await prisma.category.create({
      data: {
        name,
        icon,
        headerBg,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
      include: { mods: true },
    });

    broadcastAppDataUpdated();
    return NextResponse.json(category, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
