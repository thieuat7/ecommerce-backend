import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartItem } from './entities/cart-item.entity';
import { CartsService } from '@modules/carts/carts.service';

@Injectable()
export class CartItemsService {
  constructor(
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    private readonly cartsService: CartsService,
  ) {}

  async create(
    userId: number,
    createCartItemDto: CreateCartItemDto,
  ): Promise<CartItem> {
    const { productId, variantId, quantity } = createCartItemDto;
    const cart = await this.cartsService.getMyCart(userId);

    // Check if item already exists
    const query: any = {
      cart: { id: cart.id },
      product: { id: productId },
    };
    if (variantId) {
      query.variant = { id: variantId };
    } else {
      query.variant = null;
    }

    let cartItem = await this.cartItemRepository.findOne({ where: query });

    if (cartItem) {
      // Just increase quantity
      cartItem.quantity += quantity;
      return this.cartItemRepository.save(cartItem);
    }

    // Create new
    const createdItem = this.cartItemRepository.create({
      cart: { id: cart.id },
      product: { id: productId },
      quantity,
    } as Partial<CartItem>);

    if (variantId) {
      createdItem.variant = { id: variantId } as any;
    }

    return this.cartItemRepository.save(createdItem);
  }

  async updateItemQuantity(
    userId: number,
    id: number,
    updateCartItemDto: UpdateCartItemDto,
  ): Promise<CartItem> {
    const cart = await this.cartsService.getMyCart(userId);
    const cartItem = await this.cartItemRepository.findOne({
      where: { id, cart: { id: cart.id } },
    });

    if (!cartItem) {
      throw new NotFoundException(
        `CartItem with ID ${id} not found in your cart`,
      );
    }

    cartItem.quantity = updateCartItemDto.quantity;
    return this.cartItemRepository.save(cartItem);
  }

  async remove(userId: number, id: number): Promise<void> {
    const cart = await this.cartsService.getMyCart(userId);
    const cartItem = await this.cartItemRepository.findOne({
      where: { id, cart: { id: cart.id } },
    });

    if (!cartItem) {
      throw new NotFoundException(
        `CartItem with ID ${id} not found in your cart`,
      );
    }

    await this.cartItemRepository.remove(cartItem);
  }
}
