import 'server-only';

import { count, eq, ilike } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { getDb } from './index';
import { products, type SelectProduct } from './schema';

export { products, type SelectProduct };
export const insertProductSchema = createInsertSchema(products);

export async function getProducts(
  search: string,
  offset: number
): Promise<{
  products: SelectProduct[];
  newOffset: number | null;
  totalProducts: number;
}> {
  const db = getDb();

  if (search) {
    return {
      products: await db
        .select()
        .from(products)
        .where(ilike(products.name, `%${search}%`))
        .limit(1000),
      newOffset: null,
      totalProducts: 0
    };
  }

  if (offset === null) {
    return { products: [], newOffset: null, totalProducts: 0 };
  }

  const totalProducts = await db.select({ count: count() }).from(products);
  const moreProducts = await db
    .select()
    .from(products)
    .limit(5)
    .offset(offset);
  const newOffset = moreProducts.length >= 5 ? offset + 5 : null;

  return {
    products: moreProducts,
    newOffset,
    totalProducts: totalProducts[0].count
  };
}

export async function deleteProductById(id: number) {
  const db = getDb();
  await db.delete(products).where(eq(products.id, id));
}
