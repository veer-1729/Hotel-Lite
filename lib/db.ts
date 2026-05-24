export {
  getProducts,
  deleteProductById,
  insertProductSchema,
  products,
  type SelectProduct
} from './db/products';

export * from './db/schema';
export { getDb, pingDatabase } from './db/index';
