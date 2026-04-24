import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastAppDataUpdated } from '@/server/realtime';

// GET all statuses
export async function GET() {
  const statuses = await prisma.status.findMany({ orderBy: { sortOrder: 'asc' } });
  return NextResponse.json(statuses);
}

// POST create a new status
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { key, label, color, textColor } = body;

    if (!key || !label || !color || !textColor) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const maxSort = await prisma.status.aggregate({ _max: { sortOrder: true } });
    const status = await prisma.status.create({
      data: {
        key,
        label,
        color,
        textColor,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
    });

    broadcastAppDataUpdated();
    return NextResponse.json(status, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
