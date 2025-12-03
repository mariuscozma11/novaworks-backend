import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductImage } from './entities/product-image.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FilterProductsDto, SortBy, SortOrder } from './dto/filter-products.dto';
import { ProductsResponseDto } from './dto/products-response.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
    @InjectRepository(ProductImage)
    private productImagesRepository: Repository<ProductImage>,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const existing = await this.productsRepository.findOne({
      where: { slug: createProductDto.slug },
    });

    if (existing) {
      throw new ConflictException('Product with this slug already exists');
    }

    const { images, ...productData } = createProductDto;
    const product = this.productsRepository.create(productData);
    const savedProduct = await this.productsRepository.save(product);

    if (images && images.length > 0) {
      const productImages = images.map((img, index) =>
        this.productImagesRepository.create({
          url: img.url,
          order: img.order ?? index,
          productId: savedProduct.id,
        }),
      );
      await this.productImagesRepository.save(productImages);
    }

    return this.findOne(savedProduct.id);
  }

  async findAll(): Promise<Product[]> {
    return this.productsRepository.find({
      relations: ['category', 'images'],
      order: {
        createdAt: 'DESC',
        images: {
          order: 'ASC',
        },
      },
    });
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { id },
      relations: ['category', 'images'],
      order: {
        images: {
          order: 'ASC',
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  async findBySlug(slug: string): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { slug },
      relations: ['category', 'images'],
      order: {
        images: {
          order: 'ASC',
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with slug "${slug}" not found`);
    }

    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);

    if (updateProductDto.slug && updateProductDto.slug !== product.slug) {
      const existing = await this.productsRepository.findOne({
        where: { slug: updateProductDto.slug },
      });

      if (existing) {
        throw new ConflictException('Product with this slug already exists');
      }
    }

    const { images, ...productData } = updateProductDto;

    if (images !== undefined) {
      await this.productImagesRepository.delete({ productId: id });

      if (images.length > 0) {
        const productImages = images.map((img, index) =>
          this.productImagesRepository.create({
            url: img.url,
            order: img.order ?? index,
            productId: id,
          }),
        );
        await this.productImagesRepository.save(productImages);
      }
    }

    Object.assign(product, productData);
    await this.productsRepository.save(product);

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const product = await this.findOne(id);
    await this.productsRepository.remove(product);
  }

  async updateBySlug(slug: string, updateProductDto: UpdateProductDto): Promise<Product> {
    // Fetch product without relations to avoid TypeORM trying to update related entities
    const product = await this.productsRepository.findOne({
      where: { slug },
    });

    if (!product) {
      throw new NotFoundException(`Product with slug "${slug}" not found`);
    }

    if (updateProductDto.slug && updateProductDto.slug !== product.slug) {
      const existing = await this.productsRepository.findOne({
        where: { slug: updateProductDto.slug },
      });

      if (existing) {
        throw new ConflictException('Product with this slug already exists');
      }
    }

    const { images, ...productData } = updateProductDto;

    if (images !== undefined) {
      await this.productImagesRepository.delete({ productId: product.id });

      if (images.length > 0) {
        const productImages = images.map((img, index) =>
          this.productImagesRepository.create({
            url: img.url,
            order: img.order ?? index,
            productId: product.id,
          }),
        );
        await this.productImagesRepository.save(productImages);
      }
    }

    Object.assign(product, productData);
    await this.productsRepository.save(product);

    // Return the updated product with all relations
    return this.findBySlug(product.slug);
  }

  async removeBySlug(slug: string): Promise<void> {
    const product = await this.findBySlug(slug);
    await this.productsRepository.remove(product);
  }

  async searchProducts(filters: FilterProductsDto): Promise<ProductsResponseDto> {
    const {
      categoryId,
      minPrice,
      maxPrice,
      search,
      inStock,
      sortBy = SortBy.DATE,
      sortOrder = SortOrder.DESC,
      limit = 20,
      offset = 0,
    } = filters;

    const queryBuilder = this.productsRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.images', 'images');

    if (categoryId) {
      queryBuilder.andWhere('product.categoryId = :categoryId', { categoryId });
    }

    if (minPrice !== undefined) {
      queryBuilder.andWhere('product.price >= :minPrice', { minPrice });
    }

    if (maxPrice !== undefined) {
      queryBuilder.andWhere('product.price <= :maxPrice', { maxPrice });
    }

    if (search) {
      queryBuilder.andWhere(
        '(product.nameEn ILIKE :search OR product.nameRo ILIKE :search OR product.descriptionEn ILIKE :search OR product.descriptionRo ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (inStock === true) {
      queryBuilder.andWhere('product.stock > 0');
    }

    const total = await queryBuilder.getCount();

    queryBuilder.orderBy(`product.${sortBy}`, sortOrder);
    queryBuilder.addOrderBy('images.order', 'ASC');

    queryBuilder.skip(offset).take(limit);

    const products = await queryBuilder.getMany();

    return {
      products,
      total,
      limit,
      offset,
      hasMore: offset + products.length < total,
    };
  }
}
