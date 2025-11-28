import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { Product } from '../products/entities/product.entity';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private cartItemRepository: Repository<CartItem>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async getCart(userId: string): Promise<Cart> {
    let cart = await this.cartRepository.findOne({
      where: { userId },
      relations: ['items', 'items.product', 'items.product.images'],
    });

    if (!cart) {
      cart = this.cartRepository.create({ userId });
      cart = await this.cartRepository.save(cart);
      cart.items = [];
    }

    return cart;
  }

  async addToCart(userId: string, dto: AddToCartDto): Promise<Cart> {
    const product = await this.validateStock(dto.productId, dto.quantity);

    const cart = await this.getCart(userId);

    const existingItem = cart.items?.find(
      (item) => item.productId === dto.productId,
    );

    if (existingItem) {
      const newQuantity = existingItem.quantity + dto.quantity;
      await this.validateStock(dto.productId, newQuantity);

      existingItem.quantity = newQuantity;
      existingItem.priceSnapshot = product.price;
      await this.cartItemRepository.save(existingItem);
    } else {
      const cartItem = this.cartItemRepository.create({
        cartId: cart.id,
        productId: dto.productId,
        quantity: dto.quantity,
        priceSnapshot: product.price,
      });
      await this.cartItemRepository.save(cartItem);
    }

    return this.getCart(userId);
  }

  async updateCartItem(
    userId: string,
    productId: string,
    dto: UpdateCartItemDto,
  ): Promise<Cart> {
    await this.validateStock(productId, dto.quantity);

    const cart = await this.getCart(userId);

    const existingItem = cart.items?.find(
      (item) => item.productId === productId,
    );

    if (!existingItem) {
      throw new NotFoundException('Product not found in cart');
    }

    existingItem.quantity = dto.quantity;
    await this.cartItemRepository.save(existingItem);

    return this.getCart(userId);
  }

  async removeCartItem(userId: string, productId: string): Promise<Cart> {
    const cart = await this.getCart(userId);

    const existingItem = cart.items?.find(
      (item) => item.productId === productId,
    );

    if (!existingItem) {
      throw new NotFoundException('Product not found in cart');
    }

    await this.cartItemRepository.remove(existingItem);

    return this.getCart(userId);
  }

  async clearCart(userId: string): Promise<void> {
    const cart = await this.getCart(userId);

    if (cart.items && cart.items.length > 0) {
      await this.cartItemRepository.remove(cart.items);
    }
  }

  private async validateStock(
    productId: string,
    quantity: number,
  ): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.stock < quantity) {
      throw new BadRequestException(
        `Only ${product.stock} units available for ${product.nameEn}`,
      );
    }

    return product;
  }
}
