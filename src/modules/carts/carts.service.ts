import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from './entities/cart.entity';
import { CartItem } from '@modules/cart-items/entities/cart-item.entity';

@Injectable()
export class CartsService {
  private readonly logger = new Logger(CartsService.name);

  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
  ) {}

  /**
   * Lấy giỏ hàng của người dùng hiện tại.
   * Nếu chưa có giỏ hàng thì tự động tạo mới.
   */
  async getMyCart(userId: number): Promise<Cart> {
    let cart = await this.cartRepository.findOne({
      where: { userId },
      relations: [
        'items',
        'items.product',
        'items.product.images',
        'items.variant',
        'items.variant.options',
        'items.variant.options.attributeValue',
        'items.variant.options.attributeValue.attribute',
        'items.variant.images',
      ],
    });

    if (!cart) {
      this.logger.log(`Tạo giỏ hàng mới cho user_id=${userId}`);
      // Dùng userId column trực tiếp — không cần join sang bảng users
      const newCart = this.cartRepository.create({ userId });
      const saved = await this.cartRepository.save(newCart);

      // Reload với relations đầy đủ
      cart = await this.cartRepository.findOne({
        where: { id: saved.id },
        relations: ['items'],
      });
    }

    return cart!;
  }

  /**
   * Lấy thông tin giỏ hàng kèm tổng tiền (Đã được làm sạch dữ liệu cho Frontend).
   */
  /**
   * Lấy thông tin giỏ hàng kèm tổng tiền (Đã làm sạch và bổ sung trạng thái kinh doanh isActive).
   */
  async getMyCartWithTotal(userId: number) {
    // 1. Lấy dữ liệu thô từ Database
    const cart = await this.getMyCart(userId);

    // 2. Tính toán tổng tiền và tổng số lượng
    const subtotal = (cart.items ?? []).reduce((sum, item) => {
      const price = item.variant?.price ?? item.product?.price ?? 0;
      return sum + price * item.quantity;
    }, 0);

    const itemCount = (cart.items ?? []).reduce(
      (sum, item) => sum + item.quantity,
      0,
    );

    // 3. LÀM SẠCH DỮ LIỆU (Mapping)
    const formattedItems = (cart.items ?? []).map((item) => {
      // Ưu tiên lấy ảnh của Variant, nếu không có thì lấy ảnh hiển thị đầu tiên của Product
      const imageUrl =
        item.variant?.images?.[0]?.imageUrl ||
        item.product?.images?.find((img) => img.displayOrder === 0)?.imageUrl ||
        null;

      // Gom nhóm thuộc tính lại cho dễ đọc (VD: Màu sắc: Space Gray)
      const attributes =
        item.variant?.options?.map((opt) => ({
          name:
            opt.attributeValue?.attribute?.displayName ||
            opt.attributeValue?.attribute?.name,
          value: opt.attributeValue?.displayValue || opt.attributeValue?.value,
        })) || [];

      // Trả về object gọn gàng kèm theo isActive
      return {
        id: item.id,
        quantity: item.quantity,
        product: {
          id: item.product?.id,
          name: item.product?.name,
          slug: item.product?.slug,
          isActive: item.product?.isActive, // Bổ sung trạng thái của Sản phẩm chung
        },
        variant: item.variant
          ? {
              id: item.variant.id,
              sku: item.variant.sku,
              price: item.variant.price,
              stockQuantity: item.variant.stockQuantity,
              isActive: item.variant.isActive, // Bổ sung trạng thái của Phiên bản cụ thể
              imageUrl: imageUrl,
              attributes: attributes,
            }
          : null,
      };
    });

    // 4. Trả về kết quả cuối cùng
    return {
      cart: {
        id: cart.id,
        items: formattedItems,
      },
      subtotal,
      itemCount,
    };
  }

  /**
   * Xóa toàn bộ item trong giỏ hàng.
   */
  async clearMyCart(userId: number): Promise<{ message: string }> {
    const cart = await this.getMyCart(userId);

    if (!cart.items || cart.items.length === 0) {
      return { message: 'Giỏ hàng đã trống' };
    }

    await this.cartItemRepository.delete({ cart: { id: cart.id } });
    this.logger.log(
      `Đã xóa ${cart.items.length} item khỏi giỏ hàng của user_id=${userId}`,
    );

    return { message: `Đã xóa ${cart.items.length} sản phẩm khỏi giỏ hàng` };
  }

  /**
   * Lấy Cart entity theo cartId (dùng nội bộ).
   */
  async findCartById(cartId: number): Promise<Cart> {
    const cart = await this.cartRepository.findOne({
      where: { id: cartId },
      relations: ['items'],
    });

    if (!cart) {
      throw new NotFoundException(`Không tìm thấy giỏ hàng id=${cartId}`);
    }

    return cart;
  }
}
