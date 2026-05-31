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
import { ProductVariant } from '@modules/variant/entities/product-variant.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderStatus } from './enums/order-status.enum';

const MAX_RETRY = 3;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
  ) {}

  // ─── Tạo đơn hàng (Transaction + Pessimistic Lock) ──────────────────────────
  async create(
    createOrderDto: CreateOrderDto & { userId: number },
  ): Promise<Order> {
    const { userId, items, shippingAddress, orderCode } = createOrderDto;

    // Gộp các variantId trùng nhau (cộng dồn quantity)
    const mergedItems = this.mergeItems(items);
    let attempt = 0;

    while (attempt < MAX_RETRY) {
      attempt++;
      try {
        return await this.dataSource.transaction(async (manager) => {
          let totalAmount = 0;
          const orderItemsData: {
            product: ProductVariant['product'];
            variant: ProductVariant;
            quantity: number;
            priceAtPurchase: number;
          }[] = [];

          // ── Bước 1: Validate & lock từng variant ──────────────────────────
          for (const item of mergedItems) {
            const variant = await manager.findOne(ProductVariant, {
              where: { id: item.variantId },
              relations: ['product'],
              lock: { mode: 'pessimistic_write' },
            });

            if (!variant) {
              throw new NotFoundException(
                `Không tìm thấy biến thể sản phẩm id=${item.variantId}`,
              );
            }

            const product = variant.product;

            if (!product.isActive) {
              throw new BadRequestException(
                `Sản phẩm "${product.name}" hiện không còn kinh doanh`,
              );
            }

            if (!variant.isActive) {
              throw new BadRequestException(
                `Biến thể của "${product.name}" (id=${variant.id}) hiện không còn kinh doanh`,
              );
            }

            // ── Bước 2: Kiểm tra tồn kho ────────────────────────────────────
            if (variant.stockQuantity < item.quantity) {
              throw new BadRequestException(
                `Biến thể của "${product.name}" không đủ tồn kho. Còn lại: ${variant.stockQuantity}, yêu cầu: ${item.quantity}`,
              );
            }

            // ── Bước 3: Trừ tồn kho ─────────────────────────────────────────
            variant.stockQuantity -= item.quantity;
            await manager.save(ProductVariant, variant);

            // ── Bước 4: Tính giá (ưu tiên variant.price, fallback product.price)
            const finalPrice = Number(variant.price ?? product.price);
            totalAmount += finalPrice * item.quantity;

            orderItemsData.push({
              product,
              variant,
              quantity: item.quantity,
              priceAtPurchase: finalPrice,
            });
          }

          // ── Bước 5: Tạo Order ────────────────────────────────────────────
          const finalOrderCode =
            orderCode ||
            `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)
              .toString()
              .padStart(4, '0')}`;

          const newOrder = manager.create(Order, {
            user: { id: userId },
            orderCode: finalOrderCode,
            status: OrderStatus.PENDING,
            totalAmount,
            shippingAddress,
          });

          const savedOrder = await manager.save(Order, newOrder);

          // ── Bước 6: Tạo OrderItems ───────────────────────────────────────
          const orderItems = orderItemsData.map((data) =>
            manager.create(OrderItem, {
              order: savedOrder,
              product: data.product,
              variant: data.variant,
              quantity: data.quantity,
              priceAtPurchase: data.priceAtPurchase,
            }),
          );
          await manager.save(OrderItem, orderItems);

          // ── Bước 7: Reload order đầy đủ relations ────────────────────────
          const result = await manager.findOne(Order, {
            where: { id: savedOrder.id },
            relations: [
              'orderItems',
              'orderItems.product',
              'orderItems.product.images',
              'orderItems.variant',
              'orderItems.variant.options',
              'orderItems.variant.options.attributeValue',
              'orderItems.variant.options.attributeValue.attribute',
            ],
          });

          if (!result) throw new Error('Không thể tải lại đơn hàng vừa tạo');
          return result;
        });
      } catch (error: unknown) {
        // Retry khi bị deadlock
        if (
          error instanceof QueryFailedError &&
          error.message.toLowerCase().includes('deadlock')
        ) {
          this.logger.warn(
            `[RETRY ${attempt}/${MAX_RETRY}] Deadlock khi tạo đơn hàng...`,
          );
          if (attempt >= MAX_RETRY) {
            throw new ConflictException('Hệ thống bận, vui lòng thử lại sau.');
          }
          await this.sleep(100 * attempt);
          continue;
        }

        // Re-throw business errors ngay lập tức
        if (
          error instanceof NotFoundException ||
          error instanceof BadRequestException ||
          error instanceof ConflictException
        ) {
          throw error;
        }

        const msg = error instanceof Error ? error.message : String(error);
        this.logger.error(`Lỗi tạo đơn hàng: ${msg}`, (error as Error).stack);
        throw new BadRequestException('Không thể hoàn tất đơn hàng.');
      }
    }

    throw new BadRequestException('Quá số lần thử lại.');
  }

  // ─── Lấy tất cả đơn hàng của user ────────────────────────────────────────────
  async findAllByUserId(userId: number): Promise<Order[]> {
    return this.ordersRepository.find({
      where: { user: { id: userId } },
      relations: [
        'orderItems',
        'orderItems.product',
        'orderItems.product.images',
        'orderItems.variant',
        'orderItems.variant.options',
        'orderItems.variant.options.attributeValue',
        'orderItems.variant.options.attributeValue.attribute',
        'payment',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  // ─── Lấy chi tiết một đơn hàng ───────────────────────────────────────────────
  async findOneByIdAndUserId(id: number, userId: number): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id, user: { id: userId } },
      relations: [
        'orderItems',
        'orderItems.product',
        'orderItems.product.images',
        'orderItems.variant',
        'orderItems.variant.options',
        'orderItems.variant.options.attributeValue',
        'orderItems.variant.options.attributeValue.attribute',
        'payment',
      ],
    });

    if (!order) {
      throw new NotFoundException(
        `Không tìm thấy đơn hàng id=${id} hoặc bạn không có quyền truy cập.`,
      );
    }

    return order;
  }

  // ─── Admin: lấy tất cả đơn hàng ────────────────────────────────────────────
  async findAllForAdmin(): Promise<Order[]> {
    return this.ordersRepository.find({
      relations: [
        'user',
        'orderItems',
        'orderItems.product',
        'orderItems.variant',
        'payment',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  // ─── Admin: lấy chi tiết bất kỳ đơn hàng ──────────────────────────────────
  async findOneForAdmin(orderId: number): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: [
        'user',
        'orderItems',
        'orderItems.product',
        'orderItems.product.images',
        'orderItems.variant',
        'orderItems.variant.options',
        'orderItems.variant.options.attributeValue',
        'orderItems.variant.options.attributeValue.attribute',
        'payment',
      ],
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng id=${orderId}`);
    }

    return order;
  }

  // ─── Cập nhật địa chỉ / trạng thái (người dùng - chỉ khi PENDING/PROCESSING) ─
  async updateByIdAndUserId(
    id: number,
    userId: number,
    dto: UpdateOrderDto,
  ): Promise<Order> {
    const order = await this.findOneByIdAndUserId(id, userId);

    const immutableStatuses: OrderStatus[] = [
      OrderStatus.DELIVERED,
      OrderStatus.CANCELLED,
    ];

    if (immutableStatuses.includes(order.status)) {
      throw new ForbiddenException(
        `Không thể cập nhật đơn hàng ở trạng thái "${order.status}".`,
      );
    }

    // Người dùng không được tự nâng status lên DELIVERED
    if (dto.status === OrderStatus.DELIVERED) {
      throw new ForbiddenException(
        'Chỉ quản trị viên mới có thể đánh dấu đơn hàng là "Đã giao".',
      );
    }

    Object.assign(order, dto);
    const updated = await this.ordersRepository.save(order);
    this.logger.log(`User ${userId} cập nhật đơn hàng id=${id}`);

    return updated;
  }

  // ─── Admin: cập nhật trạng thái đơn hàng ──────────────────────────────────
  async updateStatusForAdmin(
    orderId: number,
    status: OrderStatus,
  ): Promise<Order> {
    const order = await this.findOneForAdmin(orderId);

    if (order.status === OrderStatus.CANCELLED) {
      throw new ForbiddenException(
        'Không thể thay đổi trạng thái đơn hàng đã bị huỷ.',
      );
    }

    order.status = status;
    const updated = await this.ordersRepository.save(order);
    this.logger.log(
      `Admin cập nhật trạng thái đơn hàng id=${orderId} → ${status}`,
    );

    return updated;
  }

  // ─── Xóa đơn hàng (chỉ khi PENDING) ──────────────────────────────────────────
  async removeByIdAndUserId(
    id: number,
    userId: number,
  ): Promise<{ message: string }> {
    const order = await this.findOneByIdAndUserId(id, userId);

    if (order.status !== OrderStatus.PENDING) {
      throw new ForbiddenException(
        'Chỉ có thể huỷ đơn hàng đang ở trạng thái chờ xử lý (PENDING).',
      );
    }

    await this.ordersRepository.remove(order);
    this.logger.log(`User ${userId} đã xóa đơn hàng id=${id}`);

    return { message: 'Đã xóa đơn hàng thành công.' };
  }

  // ─── Admin: xóa bất kỳ đơn hàng ──────────────────────────────────────────────
  async deleteOrderForAdmin(orderId: number): Promise<{ message: string }> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng id=${orderId}`);
    }

    await this.ordersRepository.remove(order);
    this.logger.log(`Admin đã xóa đơn hàng id=${orderId}`);

    return { message: `Đã xóa đơn hàng id=${orderId} thành công.` };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  /**
   * Gộp các item có cùng variantId bằng cách cộng dồn quantity.
   */
  private mergeItems(
    items: { variantId: number; quantity: number }[],
  ): { variantId: number; quantity: number }[] {
    const map = new Map<number, number>();
    for (const item of items) {
      map.set(item.variantId, (map.get(item.variantId) ?? 0) + item.quantity);
    }
    return Array.from(map.entries()).map(([variantId, quantity]) => ({
      variantId,
      quantity,
    }));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
