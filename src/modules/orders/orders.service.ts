import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, QueryFailedError } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from '@modules/order-items/entities/order-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderStatus } from './enums/order-status.enum';
import { Product } from '../products/entities/product.entity';

const MAX_RETRY = 3;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
  ) {}

  // ─── Tạo đơn hàng ────────────────────────────────────────────────────
  async create(
    createOrderDto: CreateOrderDto & { userId: number },
  ): Promise<Order> {
    const { userId, items, shippingAddress, status, orderCode } =
      createOrderDto;

    // 1. Loại bỏ trùng lặp productId gửi lên từ client
    const mergedItems = this.mergeItems(items);
    let attempt = 0;

    while (attempt < MAX_RETRY) {
      attempt++;
      try {
        return await this.dataSource.transaction(async (manager) => {
          let totalAmount = 0;
          const orderItemsData: any[] = [];

          // ── Bước 1: Lock & validate từng sản phẩm ──────────────────────────
          for (const item of mergedItems) {
            const product = await manager.findOne(Product, {
              where: { id: item.productId },
              lock: { mode: 'pessimistic_write' },
            });

            if (!product) {
              throw new NotFoundException(
                `Không tìm thấy sản phẩm id=${item.productId}`,
              );
            }

            // Kiểm tra tồn kho (Sử dụng stockQuantity từ SQL products)
            if (product.stockQuantity < item.quantity) {
              throw new BadRequestException(
                `Sản phẩm "${product.name}" không đủ tồn kho. Còn lại: ${product.stockQuantity}`,
              );
            }

            // ── Bước 2: Cập nhật tồn kho ──────────────────────────────────────
            product.stockQuantity -= item.quantity;
            await manager.save(Product, product);

            // ── Bước 3: Tính toán giá và chuẩn bị dữ liệu item ────────────────
            const itemTotal = Number(product.price) * item.quantity;
            totalAmount += itemTotal;

            orderItemsData.push({
              product: product, // Gán object product vào quan hệ
              quantity: item.quantity,
              priceAtPurchase: Number(product.price),
            });
          }

          // ── Bước 4: Tạo Order chính ────────────────────────────────────────
          const finalOrderCode =
            orderCode ||
            `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

          const newOrder = manager.create(Order, {
            user: { id: userId },
            orderCode: finalOrderCode,
            status: status || OrderStatus.PENDING,
            totalAmount: totalAmount,
            shippingAddress: shippingAddress,
          });

          const savedOrder = await manager.save(Order, newOrder);

          // ── Bước 5: Tạo OrderItems gắn với Order ──────────────────────────
          const orderItems = orderItemsData.map((item) =>
            manager.create(OrderItem, {
              ...item,
              order: savedOrder, // Gán quan hệ với order vừa tạo
            }),
          );
          await manager.save(OrderItem, orderItems);

          // Trả về order đầy đủ thông tin
          const result = await manager.findOne(Order, {
            where: { id: savedOrder.id },
            relations: ['orderItems', 'orderItems.product'], // Khớp với camelCase trong Entity
          });

          if (!result) throw new Error('Failed to retrieve saved order');
          return result;
        });
      } catch (error: unknown) {
        // Xử lý Retry nếu bị deadlock
        if (
          error instanceof QueryFailedError &&
          error.message.includes('deadlock')
        ) {
          this.logger.warn(`[RETRY] Xung đột lần ${attempt}/${MAX_RETRY}...`);
          if (attempt >= MAX_RETRY)
            throw new ConflictException('Hệ thống bận.');
          await this.sleep(100);
          continue;
        }

        if (
          error instanceof NotFoundException ||
          error instanceof BadRequestException
        ) {
          throw error;
        }

        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Lỗi tạo đơn hàng: ${errorMessage}`);
        throw new BadRequestException('Không thể hoàn tất đơn hàng.');
      }
    }
    throw new BadRequestException('Quá số lần thử lại.');
  }

  // ─── Helper: gộp trùng productId ──────────────────────────────────────────
  private mergeItems(
    items: { productId: number; quantity: number }[],
  ): { productId: number; quantity: number }[] {
    const map = new Map<number, number>();
    for (const item of items) {
      map.set(item.productId, (map.get(item.productId) ?? 0) + item.quantity);
    }
    return Array.from(map.entries()).map(([productId, quantity]) => ({
      productId,
      quantity,
    }));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ─── Các phương thức truy vấn ──────────────────────────────────────────────
  async findAllByUserId(userId: number): Promise<Order[]> {
    return await this.ordersRepository.find({
      where: { user: { id: userId } }, // Truy vấn theo quan hệ user
      relations: ['orderItems', 'orderItems.product'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOneByIdAndUserId(id: number, userId: number): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id, user: { id: userId } },
      relations: ['orderItems', 'orderItems.product'],
    });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại.');
    return order;
  }

  async updateByIdAndUserId(
    id: number,
    userId: number,
    updateOrderDto: UpdateOrderDto,
  ): Promise<Order> {
    const order = await this.findOneByIdAndUserId(id, userId);

    const immutableStatuses = [OrderStatus.DELIVERED, OrderStatus.CANCELLED];
    if (immutableStatuses.includes(order.status)) {
      throw new ForbiddenException(
        'Không thể cập nhật đơn hàng ở trạng thái này.',
      );
    }

    Object.assign(order, updateOrderDto);
    return await this.ordersRepository.save(order);
  }

  async removeByIdAndUserId(
    id: number,
    userId: number,
  ): Promise<{ message: string }> {
    const order = await this.findOneByIdAndUserId(id, userId);
    if (order.status !== OrderStatus.PENDING) {
      throw new ForbiddenException('Chỉ có thể xóa đơn hàng đang chờ xử lý.');
    }
    await this.ordersRepository.remove(order);
    return { message: 'Đã xóa đơn hàng thành công.' };
  }
}
