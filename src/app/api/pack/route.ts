import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastAppDataUpdated } from '@/server/realtime';

// GET pack info
export async function GET() {
  let pack = await prisma.packInfo.findFirst();
  if (!pack) {
    pack = await prisma.packInfo.create({
      data: { name: 'Untitled Modpack', mcVersion: '26.1.2', loader: 'Fabric' },
    });
  }
  return NextResponse.json(pack);
}

// PUT update pack info
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { name, mcVersion, loader } = body;

    let pack = await prisma.packInfo.findFirst();
    if (!pack) {
      pack = await prisma.packInfo.create({
        data: {
          name: name || 'Untitled Modpack',
          mcVersion: mcVersion || '26.1.2',
          loader: loader || 'Fabric',
        },
      });
    } else {
      pack = await prisma.packInfo.update({
        where: { id: pack.id },
        data: {
          ...(name !== undefined && { name }),
          ...(mcVersion !== undefined && { mcVersion }),
          ...(loader !== undefined && { loader }),
        },
      });
    }

    broadcastAppDataUpdated();
    return NextResponse.json(pack);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
