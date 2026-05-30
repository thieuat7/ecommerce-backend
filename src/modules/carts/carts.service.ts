import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Cart } from './entities/cart.entity';

@Injectable()
export class CartsService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    private readonly dataSource: DataSource,
  ) {}

  async getMyCart(userId: number): Promise<Cart> {
    const cart = await this.cartRepository.findOne({
      where: { user: { id: userId } },
      relations: ['items', 'items.product', 'items.variant'],
    });

    if (!cart) {
      // Create cart if not exists
      const newCart = this.cartRepository.create({
        user: { id: userId },
      });
      await this.cartRepository.save(newCart);
      const savedCart = await this.cartRepository.findOne({
        where: { id: newCart.id },
        relations: ['items'],
      });
      if (savedCart) {
        return savedCart;
      }
    }

    return cart!;
  }

  async clearMyCart(userId: number): Promise<void> {
    const cart = await this.getMyCart(userId);
    if (cart.items && cart.items.length > 0) {
      // We can remove items
      await this.dataSource.getRepository('CartItem').delete({ cart: { id: cart.id } });
    }
  }
}
