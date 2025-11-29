import { Product } from '../entities/product.entity';

export class ProductsResponseDto {
  products: Product[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}
