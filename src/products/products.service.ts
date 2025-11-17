import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductImage } from './entities/product-image.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

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
}
