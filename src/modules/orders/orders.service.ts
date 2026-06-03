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
import { UserAddress } from '@modules/user-addresses/entities/user-address.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderStatus } from './enums/order-status.enum';

const MAX_RETRY = 3;

/** Relations dùng lại cho user queries */
const USER_ORDER_RELATIONS = [
  'orderItems',
  'orderItems.variant',
  'orderItems.variant.options',
  'orderItems.variant.options.attributeValue',
  'orderItems.variant.options.attributeValue.attribute',
  'orderItems.product',
  'payment',
];

/** Relations dùng lại cho admin queries (thêm user info) */
const ADMIN_ORDER_RELATIONS = [
  'user',
  'orderItems',
  'orderItems.variant',
  'orderItems.variant.options',
  'orderItems.variant.options.attributeValue',
  'orderItems.variant.options.attributeValue.attribute',
  'orderItems.product',
  'payment',
];

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(UserAddress)
    private readonly addressRepository: Repository<UserAddress>,
  ) {}

  // ─── Tạo đơn hàng ────────────────────────────────────────────────────────────
  async create(
    dto: CreateOrderDto & { userId: number },
  ): Promise<Order> {
    const { userId, userAddressId, items, orderCode } = dto;

    // ── Validate địa chỉ giao hàng (phải thuộc user) ──────────────────────
    const address = await this.addressRepository.findOne({
      where: { id: userAddressId, userId },
    });

    if (!address) {
      throw new NotFoundException(
        `Không tìm thấy địa chỉ giao hàng id=${userAddressId} hoặc địa chỉ không thuộc về bạn.`,
      );
    }

    // Ghép địa chỉ đầy đủ thành chuỗi text để snapshot
    const shippingAddressSnapshot = [
      address.addressLine,
      address.ward,
      address.district,
      address.province,
      address.country,
    ]
      .filter(Boolean)
      .join(', ');

    const mergedItems = this.mergeItems(items);
    let attempt = 0;

    while (attempt < MAX_RETRY) {
      attempt++;
      try {
        return await this.dataSource.transaction(async (manager) => {
          let totalAmount = 0;

          type OrderItemPayload = {
            variant: ProductVariant;
            productName: string;
            variantName: string;
            sku: string;
            quantity: number;
            priceAtPurchase: number;
          };

          const orderItemsData: OrderItemPayload[] = [];

          // ── Bước 1: Validate & lock từng variant ────────────────────────
          for (const item of mergedItems) {
            const variant = await manager.findOne(ProductVariant, {
              where: { id: item.variantId },
              relations: [
                'product',
                'options',
                'options.attributeValue',
                'options.attributeValue.attribute',
              ],
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
                `Biến thể SKU="${variant.sku}" của "${product.name}" hiện không còn kinh doanh`,
              );
            }
            if (variant.stockQuantity < item.quantity) {
              throw new BadRequestException(
                `"${product.name}" (SKU: ${variant.sku}) không đủ tồn kho. Còn: ${variant.stockQuantity}, cần: ${item.quantity}`,
              );
            }

            // ── Bước 2: Trừ tồn kho ───────────────────────────────────────
            variant.stockQuantity -= item.quantity;
            await manager.save(ProductVariant, variant);

            // ── Bước 3: Tính giá snapshot ─────────────────────────────────
            const finalPrice = Number(variant.price ?? product.price);
            totalAmount += finalPrice * item.quantity;

            // ── Bước 4: Build tên biến thể từ options ─────────────────────
            // VD: "Đỏ / 128GB"
            const variantName = (variant.options ?? [])
              .sort(
                (a, b) =>
                  (a.attributeValue?.attribute?.id ?? 0) -
                  (b.attributeValue?.attribute?.id ?? 0),
              )
              .map((o) => o.attributeValue?.displayValue ?? o.attributeValue?.value)
              .filter(Boolean)
              .join(' / ');

            orderItemsData.push({
              variant,
              productName: product.name,
              variantName: variantName || variant.sku,
              sku: variant.sku,
              quantity: item.quantity,
              priceAtPurchase: finalPrice,
            });
          }

          // ── Bước 5: Tạo Order với snapshot địa chỉ ───────────────────────
          const finalOrderCode =
            orderCode ||
            `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)
              .toString()
              .padStart(4, '0')}`;

          const newOrder = manager.create(Order, {
            userId,
            userAddressId: address.id,
            orderCode: finalOrderCode,
            status: OrderStatus.PENDING,
            totalAmount,
            // ─── Snapshot địa chỉ ───────────────────────────────────────
            shippingAddress: shippingAddressSnapshot,
            customerName: address.recipientName,
            customerPhone: address.phoneNumber,
          });

          const savedOrder = await manager.save(Order, newOrder);

          // ── Bước 6: Tạo OrderItems (chỉ set variant, không set product — XOR) ──
          const orderItems = orderItemsData.map((data) =>
            manager.create(OrderItem, {
              order: savedOrder,
              // XOR constraint: set variant → product = null
              variant: data.variant,
              product: null,
              productName: data.productName,
              variantName: data.variantName,
              sku: data.sku,
              quantity: data.quantity,
              priceAtPurchase: data.priceAtPurchase,
            }),
          );
          await manager.save(OrderItem, orderItems);

          // ── Bước 7: Reload order đầy đủ relations ────────────────────────
          const result = await manager.findOne(Order, {
            where: { id: savedOrder.id },
            relations: USER_ORDER_RELATIONS,
          });
          if (!result) throw new Error('Không thể tải lại đơn hàng vừa tạo');

          return result;
        });
      } catch (error: unknown) {
        if (
          error instanceof QueryFailedError &&
          error.message.toLowerCase().includes('deadlock')
        ) {
          this.logger.warn(
            `[RETRY ${attempt}/${MAX_RETRY}] Deadlock khi tạo đơn hàng...`,
          );
          if (attempt >= MAX_RETRY)
            throw new ConflictException('Hệ thống bận, vui lòng thử lại sau.');
          await this.sleep(100 * attempt);
          continue;
        }

        if (
          error instanceof NotFoundException ||
          error instanceof BadRequestException ||
          error instanceof ConflictException
        )
          throw error;

        const msg = error instanceof Error ? error.message : String(error);
        this.logger.error(`Lỗi tạo đơn hàng: ${msg}`, (error as Error).stack);
        throw new BadRequestException('Không thể hoàn tất đơn hàng.');
      }
    }

    throw new BadRequestException('Quá số lần thử lại.');
  }

  // ─── [User] Lấy tất cả đơn hàng của mình ────────────────────────────────────
  async findAllByUserId(userId: number): Promise<Order[]> {
    return this.ordersRepository.find({
      where: { userId },
      relations: USER_ORDER_RELATIONS,
      order: { createdAt: 'DESC' },
    });
  }

  // ─── [User] Lấy chi tiết một đơn hàng (chỉ của mình) ────────────────────────
  async findOneByUserId(id: number, userId: number): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id, userId },
      relations: USER_ORDER_RELATIONS,
    });
    if (!order)
      throw new NotFoundException(
        `Không tìm thấy đơn hàng id=${id} hoặc bạn không có quyền truy cập.`,
      );
    return order;
  }

  // ─── [User] Huỷ đơn hàng (chỉ khi PENDING) ──────────────────────────────────
  async cancelByUserId(
    id: number,
    userId: number,
  ): Promise<{ message: string }> {
    const order = await this.findOneByUserId(id, userId);

    if (order.status !== OrderStatus.PENDING) {
      throw new ForbiddenException(
        `Chỉ có thể huỷ đơn hàng ở trạng thái PENDING, đơn này đang ở trạng thái "${order.status}".`,
      );
    }

    order.status = OrderStatus.CANCELLED;
    await this.ordersRepository.save(order);
    this.logger.log(`User ${userId} đã huỷ đơn hàng id=${id}`);

    return { message: 'Đã huỷ đơn hàng thành công.' };
  }

  // ─── [Admin] Lấy tất cả đơn hàng ────────────────────────────────────────────
  async findAllForAdmin(): Promise<Order[]> {
    return this.ordersRepository.find({
      relations: ADMIN_ORDER_RELATIONS,
      order: { createdAt: 'DESC' },
    });
  }

  // ─── [Admin] Lấy chi tiết bất kỳ đơn hàng ───────────────────────────────────
  async findOneForAdmin(orderId: number): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: ADMIN_ORDER_RELATIONS,
    });
    if (!order)
      throw new NotFoundException(`Không tìm thấy đơn hàng id=${orderId}`);
    return order;
  }

  // ─── [Admin] Cập nhật trạng thái ─────────────────────────────────────────────
  async updateStatusForAdmin(
    orderId: number,
    dto: UpdateOrderDto,
  ): Promise<Order> {
    const order = await this.findOneForAdmin(orderId);

    if (!dto.status) {
      throw new BadRequestException('Vui lòng cung cấp trạng thái mới.');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new ForbiddenException(
        'Không thể thay đổi trạng thái đơn hàng đã bị huỷ.',
      );
    }

    order.status = dto.status;
    const updated = await this.ordersRepository.save(order);
    this.logger.log(
      `Admin cập nhật trạng thái đơn hàng id=${orderId} → ${dto.status}`,
    );

    return updated;
  }

  // ─── [Admin] Xóa đơn hàng ────────────────────────────────────────────────────
  async deleteOrderForAdmin(orderId: number): Promise<{ message: string }> {
    const order = await this.ordersRepository.findOne({ where: { id: orderId } });
    if (!order)
      throw new NotFoundException(`Không tìm thấy đơn hàng id=${orderId}`);

    await this.ordersRepository.remove(order);
    this.logger.log(`Admin đã xóa đơn hàng id=${orderId}`);

    return { message: `Đã xóa đơn hàng id=${orderId} thành công.` };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  private mergeItems(
    items: { variantId: number; quantity: number }[],
  ): { variantId: number; quantity: number }[] {
    const map = new Map<number, number>();
    for (const item of items)
      map.set(item.variantId, (map.get(item.variantId) ?? 0) + item.quantity);
    return Array.from(map.entries()).map(([variantId, quantity]) => ({
      variantId,
      quantity,
    }));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
