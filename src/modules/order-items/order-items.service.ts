import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderItem } from './entities/order-item.entity';

/**
 * OrderItemsService — chỉ cung cấp các phương thức READ.
 * Việc tạo/xóa order items được quản lý hoàn toàn bởi OrdersService thông qua transaction.
 */
@Injectable()
export class OrderItemsService {
  constructor(
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
  ) {}

  /**
   * Lấy tất cả items của một đơn hàng (dùng cho admin hoặc internal).
   */
  async findByOrderId(orderId: number): Promise<OrderItem[]> {
    return this.orderItemRepository.find({
      where: { order: { id: orderId } },
      relations: [
        'product',
        'product.images',
        'variant',
        'variant.options',
        'variant.options.attributeValue',
        'variant.options.attributeValue.attribute',
        'variant.images',
      ],
    });
  }

  /**
   * Lấy chi tiết một order item theo id.
   */
  async findOne(id: number): Promise<OrderItem> {
    const item = await this.orderItemRepository.findOne({
      where: { id },
      relations: [
        'order',
        'product',
        'product.images',
        'variant',
        'variant.options',
        'variant.options.attributeValue',
        'variant.options.attributeValue.attribute',
        'variant.images',
      ],
    });

    if (!item) {
      throw new NotFoundException(`Không tìm thấy order item id=${id}`);
    }

    return item;
  }
}
