import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartItem } from './entities/cart-item.entity';
import { CartsService } from '@modules/carts/carts.service';
import { Product } from '@modules/products/entities/product.entity';
import { ProductVariant } from '@modules/variant/entities/product-variant.entity';

@Injectable()
export class CartItemsService {
  private readonly logger = new Logger(CartItemsService.name);

  constructor(
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variantRepository: Repository<ProductVariant>,
    private readonly cartsService: CartsService,
  ) {}

  /**
   * Thêm sản phẩm vào giỏ hàng.
   * - Validate product tồn tại và đang active.
   * - Validate variant (nếu có) thuộc sản phẩm và đang active.
   * - Nếu item đã tồn tại → cộng thêm số lượng.
   * - Nếu chưa có → tạo mới.
   */
  async create(
    userId: number,
    createCartItemDto: CreateCartItemDto,
  ): Promise<CartItem> {
    const { productId, variantId, quantity } = createCartItemDto;

    // ── 1. Validate Product ────────────────────────────────────────────────
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException(
        `Không tìm thấy sản phẩm với id=${productId}`,
      );
    }
    if (!product.isActive) {
      throw new BadRequestException(
        `Sản phẩm id=${productId} hiện không còn kinh doanh`,
      );
    }

    // ── 2. Validate Variant & Lấy thông tin tồn kho ────────────────────────
    let availableStock = Number.MAX_SAFE_INTEGER; // Mặc định nếu không quản lý tồn kho ở product

    if (variantId !== undefined && variantId !== null) {
      const variant = await this.variantRepository.findOne({
        where: { id: variantId, productId },
      });
      if (!variant) {
        throw new NotFoundException(
          `Không tìm thấy biến thể id=${variantId} thuộc sản phẩm id=${productId}`,
        );
      }
      if (!variant.isActive) {
        throw new BadRequestException(
          `Biến thể id=${variantId} hiện không còn kinh doanh`,
        );
      }

      // Lấy số lượng tồn kho của variant
      availableStock = variant.stockQuantity;
    } else {
      // Nếu không có variant, có thể lấy tồn kho từ product nếu cần
      // availableStock = product.stockQuantity; // Nếu quản lý tồn kho ở product
      throw new BadRequestException(
        `Không thể thêm sản phẩm vào giỏ hàng vì số lượng tồn kho chưa được quản lý`,
      );
    }

    // ── 3. Lấy (hoặc tạo) giỏ hàng ───────────────────────────────────────
    const cart = await this.cartsService.getMyCart(userId);

    // ── 4. Kiểm tra item đã tồn tại trong giỏ ─────────────────────────────
    const query: Record<string, any> = {
      cart: { id: cart.id },
      product: { id: productId },
    };

    if (variantId) {
      query.variant = { id: variantId };
    } else {
      query.variant = null;
    }

    const existingItem = await this.cartItemRepository.findOne({
      where: query,
    });

    // ── 5. KIỂM TRA TỒN KHO TRƯỚC KHI LƯU ──────────────────────────────────
    // Tính tổng số lượng: Số lượng muốn thêm + Số lượng đã có trong giỏ
    const totalRequestedQuantity = existingItem
      ? existingItem.quantity + quantity
      : quantity;

    if (totalRequestedQuantity > availableStock) {
      throw new BadRequestException(
        `Số lượng yêu cầu (${totalRequestedQuantity}) vượt quá số lượng tồn kho hiện tại (${availableStock}).`,
      );
    }

    // ── 6. Cập nhật hoặc Tạo mới Cart Item ────────────────────────────────
    if (existingItem) {
      // Cộng thêm số lượng vì đã qua bài test tồn kho
      existingItem.quantity = totalRequestedQuantity;

      this.logger.log(
        `Cập nhật quantity cart_item_id=${existingItem.id}: +${quantity} → ${existingItem.quantity}`,
      );

      const savedItem = await this.cartItemRepository.save(existingItem);
      // Reload lại quan hệ (relations) để trả về
      return this.findOneItem(savedItem.id);
    }

    // Tạo cart item mới nếu chưa tồn tại
    const newItem = this.cartItemRepository.create({
      cart: { id: cart.id },
      product: { id: productId },
      variant: variantId ? ({ id: variantId } as ProductVariant) : undefined,
      quantity, // Sử dụng quantity từ request vì đây là item mới
    } as Partial<CartItem>);

    this.logger.log(
      `Thêm sản phẩm id=${productId} (variant=${variantId ?? 'none'}) vào giỏ hàng cart_id=${cart.id}`,
    );

    const saved = await this.cartItemRepository.save(newItem);

    // Reload với relations để trả về đầy đủ dữ liệu
    return this.findOneItem(saved.id);
  }

  /**
   * Cập nhật số lượng của một cart item.
   * Chỉ owner của item mới được phép thao tác.
   */
  async updateItemQuantity(
    userId: number,
    id: number,
    updateCartItemDto: UpdateCartItemDto,
  ): Promise<CartItem> {
    const cart = await this.cartsService.getMyCart(userId);
    const cartItem = await this.cartItemRepository.findOne({
      where: { id, cart: { id: cart.id } },
      relations: ['product', 'variant'],
    });

    if (!cartItem) {
      throw new NotFoundException(
        `Không tìm thấy cart item id=${id} trong giỏ hàng của bạn`,
      );
    }

    cartItem.quantity = updateCartItemDto.quantity;
    this.logger.log(
      `Cập nhật cart_item_id=${id} quantity → ${updateCartItemDto.quantity}`,
    );

    return this.cartItemRepository.save(cartItem);
  }

  /**
   * Xóa một item khỏi giỏ hàng.
   * Chỉ owner của item mới được phép xóa.
   */
  async remove(userId: number, id: number): Promise<{ message: string }> {
    const cart = await this.cartsService.getMyCart(userId);
    const cartItem = await this.cartItemRepository.findOne({
      where: { id, cart: { id: cart.id } },
    });

    if (!cartItem) {
      throw new NotFoundException(
        `Không tìm thấy cart item id=${id} trong giỏ hàng của bạn`,
      );
    }

    await this.cartItemRepository.remove(cartItem);
    this.logger.log(`Đã xóa cart_item_id=${id} khỏi cart_id=${cart.id}`);

    return { message: `Đã xóa sản phẩm khỏi giỏ hàng` };
  }

  /**
   * Lấy một cart item theo id (dùng nội bộ).
   */
  private async findOneItem(id: number): Promise<CartItem> {
    const item = await this.cartItemRepository.findOne({
      where: { id },
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

    if (!item) {
      throw new NotFoundException(`Không tìm thấy cart item id=${id}`);
    }

    return item;
  }
}
