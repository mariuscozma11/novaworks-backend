import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  async getCart(@GetUser() user: any) {
    return this.cartService.getCart(user.id);
  }

  @Post('items')
  async addToCart(@GetUser() user: any, @Body() dto: AddToCartDto) {
    return this.cartService.addToCart(user.id, dto);
  }

  @Patch('items/:productId')
  async updateCartItem(
    @GetUser() user: any,
    @Param('productId') productId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateCartItem(user.id, productId, dto);
  }

  @Delete('items/:productId')
  async removeCartItem(
    @GetUser() user: any,
    @Param('productId') productId: string,
  ) {
    return this.cartService.removeCartItem(user.id, productId);
  }

  @Delete()
  async clearCart(@GetUser() user: any) {
    await this.cartService.clearCart(user.id);
    return { message: 'Cart cleared successfully' };
  }
}
