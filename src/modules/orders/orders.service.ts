import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderStatus } from './enums/order-status.enum';
import { Product } from '@modules/products/entities/product.entity';

const MAX_RETRY = 3;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly dataSource: DataSource,

    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
  ) {}

  // ─── Tạo đơn hàng ─────────────────────────────────────────────────────────
  async create(
    createOrderDto: CreateOrderDto & { userId: number },
  ): Promise<Order> {
    const { userId, items } = createOrderDto;

    // Loại bỏ trùng lặp productId
    const mergedItems = this.mergeItems(items);
    let attempt = 0;

    while (attempt < MAX_RETRY) {
      attempt++;
      try {
        const order = await this.dataSource.transaction(async (manager) => {
          let totalPrice = 0;
          const orderItemsToCreate: Partial<OrderItem>[] = [];

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

            const availableStock = product.stock - product.locked_stock;
            if (availableStock < item.quantity) {
              throw new BadRequestException(
                `Sản phẩm "${product.name}" không đủ tồn kho. Còn lại: ${availableStock}`,
              );
            }

            // ── Bước 2: Trừ stock, tăng locked_stock (Optimistic Locking hỗ trợ thêm) ──
            product.stock -= item.quantity;
            product.locked_stock += item.quantity;
            await manager.save(Product, product);

            // ── Bước 3: Chuẩn bị order item ──────────────────────────────────
            totalPrice += Number(product.price) * item.quantity;
            orderItemsToCreate.push({
              productId: product.id,
              quantity: item.quantity,
              price: Number(product.price),
            });
          }

          // ── Bước 4: Tạo Order ─────────────────────────────────────────────
          const newOrder = manager.create(Order, {
            userId,
            status: OrderStatus.PENDING,
            totalPrice,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000), // Hết hạn sau 15p
          });
          const savedOrder = await manager.save(Order, newOrder);

          // ── Bước 5: Tạo OrderItems gắn với Order ──────────────────────────
          const orderItems = orderItemsToCreate.map((item) =>
            manager.create(OrderItem, { ...item, orderId: savedOrder.id }),
          );
          await manager.save(OrderItem, orderItems);

          // Trả về order kèm items
          return await manager.findOne(Order, {
            where: { id: savedOrder.id },
            relations: ['items', 'items.product'],
          });
        });

        // GIẢI QUYẾT LỖI TS18047 (Possibly null):
        if (!order) {
          throw new BadRequestException(
            'Lỗi hệ thống: Không thể khởi tạo dữ liệu đơn hàng',
          );
        }

        this.logger.log(
          `Tạo đơn hàng thành công: orderId=${order.id}, userId=${userId}`,
        );
        return order;
      } catch (error: unknown) {
        // Xử lý lỗi an toàn theo chuẩn TypeScript (Tránh lỗi Unsafe member access)
        if (error instanceof Error) {
          const isLockConflict =
            error.name === 'OptimisticLockVersionMismatchError' ||
            error.message.includes('optimistic lock');

          if (isLockConflict) {
            this.logger.warn(
              `[RETRY] Xung đột dữ liệu lần ${attempt}/${MAX_RETRY}. Đang thử lại...`,
            );

            if (attempt >= MAX_RETRY) {
              throw new ConflictException(
                'Hệ thống đang bận do nhiều người mua cùng lúc. Vui lòng thử lại sau.',
              );
            }

            // Tránh "thundering herd" bằng cách đợi ngẫu nhiên
            await this.sleep(50 + Math.random() * 100);
            continue;
          }
        }

        // Chuyển tiếp các lỗi nghiệp vụ đã được định nghĩa
        if (
          error instanceof NotFoundException ||
          error instanceof BadRequestException ||
          error instanceof ForbiddenException ||
          error instanceof ConflictException
        ) {
          throw error;
        }

        // Lỗi không xác định
        this.logger.error(
          `[ERROR] Lỗi không xác định khi tạo đơn hàng:`,
          error,
        );
        throw new BadRequestException(
          'Đã có lỗi xảy ra trong quá trình tạo đơn hàng.',
        );
      }
    }
    throw new BadRequestException(
      'Không thể thực hiện yêu cầu sau nhiều lần thử.',
    );
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

  // ─── Helper: sleep (ms) ───────────────────────────────────────────────────
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ─── Lấy tất cả đơn hàng của một user ────────────────────────────────────
  async findAllByUserId(userId: number): Promise<Order[]> {
    try {
      return await this.ordersRepository.find({
        where: { userId },
        relations: ['items', 'items.product'],
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      this.logger.error(
        `Lỗi khi lấy danh sách đơn hàng của user ${userId}:`,
        error,
      );
      throw new BadRequestException('Không thể lấy danh sách đơn hàng');
    }
  }

  // ─── Lấy chi tiết đơn hàng theo id và userId ─────────────────────────────
  async findOneByIdAndUserId(id: number, userId: number): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id, userId },
      relations: ['items', 'items.product', 'user'],
    });

    if (!order) {
      throw new NotFoundException(
        'Không tìm thấy đơn hàng hoặc bạn không có quyền truy cập',
      );
    }

    return order;
  }

  // ─── Cập nhật đơn hàng ────────────────────────────────────────────────────
  async updateByIdAndUserId(
    id: number,
    userId: number,
    updateOrderDto: UpdateOrderDto,
  ): Promise<Order> {
    try {
      const order = await this.findOneByIdAndUserId(id, userId);

      const finalStatuses = [
        OrderStatus.COMPLETED,
        OrderStatus.CANCELLED,
        OrderStatus.FAILED,
      ];
      if (finalStatuses.includes(order.status)) {
        throw new ForbiddenException(
          `Không thể cập nhật đơn hàng đã ${order.status}`,
        );
      }

      Object.assign(order, updateOrderDto);
      return await this.ordersRepository.save(order);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error(`Lỗi cập nhật đơn hàng ${id}:`, error);
      throw new BadRequestException('Lỗi khi cập nhật đơn hàng');
    }
  }

  // ─── Xóa đơn hàng ────────────────────────────────────────────────────────
  async removeByIdAndUserId(
    id: number,
    userId: number,
  ): Promise<{ message: string }> {
    try {
      const order = await this.findOneByIdAndUserId(id, userId);

      if (order.status !== OrderStatus.PENDING) {
        throw new ForbiddenException(
          'Chỉ có thể xóa đơn hàng khi đang ở trạng thái PENDING',
        );
      }

      await this.ordersRepository.remove(order);
      return { message: 'Đơn hàng đã được xóa thành công' };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error(`Lỗi khi xóa đơn hàng ${id}:`, error);
      throw new BadRequestException('Lỗi khi xóa đơn hàng');
    }
  }
}
