export {
  getProducts,
  deleteProductById,
  insertProductSchema,
  products,
  type SelectProduct
} from './db/products';

export * from './db/schema';
export { getDb, getPoolStats, pingDatabase } from './db/index';
