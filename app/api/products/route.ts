import { NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { buildCatalogQuery, catalogPage, parseCatalogQuery } from '@/lib/catalog';

export async function GET(req: Request) {
  let query;
  try {
    query = parseCatalogQuery(new URL(req.url).searchParams);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid filters.' }, { status: 400 });
  }
  try {
    const rows = await prisma.product.findMany(buildCatalogQuery(query));
    return NextResponse.json(catalogPage(rows));
  } catch (error) {
    console.error('Catalog query failed:', error);
    return NextResponse.json({ error: 'Products could not be loaded. Please try again.' }, { status: 500 });
  }
}
