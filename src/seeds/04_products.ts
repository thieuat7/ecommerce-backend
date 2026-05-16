import { Knex } from 'knex';

type IdRow = { id: number };
type CategoryRow = IdRow & { name: string };
type UserRow = IdRow & { email: string };
type ProductRow = IdRow & { public_id: string };
type ProductLookupRow = IdRow & { public_id: string };
type ProductAttributeRow = IdRow & { sku: string };
type ProductImageRow = IdRow & { product_id: number; image_url: string };
type StockLogRow = IdRow & {
  product_id: number;
  product_attribute_id: number;
  action: string;
};
type ProductCategoryRow = { 
  product_id: number;
  category_id: number;
};
type CartRow = IdRow & { user_id: number };

type UserAddressRow = IdRow & {
  recipient_name: string;
  phone_number: string;
  address_line: string;
  ward: string;
  district: string;
  province: string;
};

type CustomerAddressRow = UserAddressRow;

function assertRow<T>(row: T | undefined, context: string): T {
  if (!row) {
    throw new Error(`Seed failed: missing row for ${context}`);
  }
  return row;
}

export async function seed(knex: Knex): Promise<void> {
  await knex.transaction(async (trx) => {
    // 1. Lấy danh sách categories (giả sử đã được seed trước đó)
    const categories = await trx<CategoryRow, CategoryRow[]>('categories')
      .whereIn('name', [
        'Điện thoại di động',
        'Máy tính xách tay',
        'Tablet',
        'Phụ kiện',
        'Tai nghe',
        'Sạc dự phòng',
      ])
      .select(['id', 'name'])
      .whereNull('deleted_at');

    const phoneCat = assertRow(
      categories.find((c) => c.name === 'Điện thoại di động'),
      'category: Điện thoại di động',
    );
    const laptopCat = assertRow(
      categories.find((c) => c.name === 'Máy tính xách tay'),
      'category: Máy tính xách tay',
    );
    const tabletCat = assertRow(
      categories.find((c) => c.name === 'Tablet'),
      'category: Tablet',
    );
    const accessoryCat = assertRow(
      categories.find((c) => c.name === 'Phụ kiện'),
      'category: Phụ kiện',
    );
    const headphoneCat = assertRow(
      categories.find((c) => c.name === 'Tai nghe'),
      'category: Tai nghe',
    );
    const powerbankCat = assertRow(
      categories.find((c) => c.name === 'Sạc dự phòng'),
      'category: Sạc dự phòng',
    );

    // 2. Lấy users (admin, customer)
    const users = await trx<UserRow, UserRow[]>('users')
      .whereIn('email', ['admin@ecommerce.com', 'khachhang@gmail.com'])
      .select(['id', 'email'])
      .whereNull('deleted_at');

    const adminUser = assertRow(
      users.find((u) => u.email === 'admin@ecommerce.com'),
      'user: admin',
    );
    const customerUser = assertRow(
      users.find((u) => u.email === 'khachhang@gmail.com'),
      'user: customer',
    );

    // 3. Lấy địa chỉ khách hàng
    const customerAddress = (await trx('user_addresses')
      .join('users', 'users.id', 'user_addresses.user_id')
      .where('users.email', 'khachhang@gmail.com')
      .select([
        'user_addresses.id',
        'user_addresses.recipient_name',
        'user_addresses.phone_number',
        'user_addresses.address_line',
        'user_addresses.ward',
        'user_addresses.district',
        'user_addresses.province',
      ])
      .whereNull('user_addresses.deleted_at')
      .first()) as CustomerAddressRow | undefined;
    const safeCustomerAddress = assertRow(customerAddress, 'user_addresses');

    // 4. Định nghĩa danh sách sản phẩm mới (không có category_id)
    const productsToSeed = [
      {
        public_id: 'prod_iphone15',
        name: 'iPhone 15 Pro Max',
        slug: 'iphone-15-pro-max',
        description:
          'Điện thoại cao cấp của Apple, chip A17 Pro, màn hình 6.7 inch',
        price: 29990000,
        stock_quantity: 100,
        is_active: true,
        categories: [phoneCat.id],
      },
      {
        public_id: 'prod_iphone14',
        name: 'iPhone 14 Pro',
        slug: 'iphone-14-pro',
        description: 'iPhone 14 Pro với Dynamic Island, chip A16',
        price: 23990000,
        stock_quantity: 80,
        is_active: true,
        categories: [phoneCat.id],
      },
      {
        public_id: 'prod_samsung_s24',
        name: 'Samsung Galaxy S24 Ultra',
        slug: 'samsung-galaxy-s24-ultra',
        description: 'Flagship Android với AI và camera 200MP',
        price: 28990000,
        stock_quantity: 60,
        is_active: true,
        categories: [phoneCat.id],
      },
      {
        public_id: 'prod_macbook_m3',
        name: 'MacBook Pro M3',
        slug: 'macbook-pro-m3',
        description: 'Laptop hiệu năng cao, chip M3, RAM 16GB, SSD 512GB',
        price: 44990000,
        stock_quantity: 25,
        is_active: true,
        categories: [laptopCat.id],
      },
      {
        public_id: 'prod_dell_xps',
        name: 'Dell XPS 15',
        slug: 'dell-xps-15',
        description: 'Laptop cao cấp với màn hình OLED 3.5K',
        price: 39990000,
        stock_quantity: 15,
        is_active: true,
        categories: [laptopCat.id],
      },
      {
        public_id: 'prod_ipad_air',
        name: 'iPad Air M1',
        slug: 'ipad-air-m1',
        description: 'Máy tính bảng mỏng nhẹ, chip M1, hỗ trợ bút cảm ứng',
        price: 15990000,
        stock_quantity: 40,
        is_active: true,
        categories: [tabletCat.id],
      },
      {
        public_id: 'prod_airpods_pro',
        name: 'AirPods Pro 2',
        slug: 'airpods-pro-2',
        description: 'Tai nghe không dây chống ồn, chip H2',
        price: 5990000,
        stock_quantity: 120,
        is_active: true,
        categories: [headphoneCat.id, accessoryCat.id],
      },
      {
        public_id: 'prod_samsung_buds',
        name: 'Samsung Galaxy Buds2 Pro',
        slug: 'samsung-buds2-pro',
        description: 'Tai nghe true wireless, âm thanh 24-bit',
        price: 4190000,
        stock_quantity: 90,
        is_active: true,
        categories: [headphoneCat.id, accessoryCat.id],
      },
      {
        public_id: 'prod_anker_powerbank',
        name: 'Anker PowerCore 20000mAh',
        slug: 'anker-powercore-20000',
        description: 'Sạc dự phòng dung lượng lớn, hỗ trợ Power Delivery',
        price: 1250000,
        stock_quantity: 200,
        is_active: true,
        categories: [powerbankCat.id, accessoryCat.id],
      },
      {
        public_id: 'prod_xiaomi_robot',
        name: 'Xiaomi Robot Vacuum S10',
        slug: 'xiaomi-robot-s10',
        description: 'Robot hút bụi lau nhà thông minh',
        price: 6490000,
        stock_quantity: 30,
        is_active: true,
        categories: [], // chưa có category, có thể bỏ qua hoặc thêm sau
      },
    ];

    // 5. Insert products và lưu ID
    for (const p of productsToSeed) {
      const existing = await trx<ProductRow, IdRow | undefined>('products')
        .where({ public_id: p.public_id })
        .first('id');
      if (!existing) {
        await trx('products').insert({
          public_id: p.public_id,
          name: p.name,
          slug: p.slug,
          description: p.description,
          price: p.price,
          stock_quantity: p.stock_quantity,
          is_active: p.is_active,
        });
      } else {
        await trx('products').where({ public_id: p.public_id }).update({
          name: p.name,
          slug: p.slug,
          description: p.description,
          price: p.price,
          stock_quantity: p.stock_quantity,
          is_active: p.is_active,
        });
      }
    }

    // Lấy lại toàn bộ products vừa seed (kèm public_id)
    const productPublicIds = productsToSeed.map((p) => p.public_id);
    const products = (await trx('products')
      .whereIn('public_id', productPublicIds)
      .select(['id', 'public_id'])) as ProductLookupRow[];

    // Map public_id -> id
    const productIdMap = new Map<string, number>();
    for (const prod of products) {
      productIdMap.set(prod.public_id, prod.id);
    }

    // 6. Gán category cho sản phẩm qua bảng product_categories
    for (const p of productsToSeed) {
      const productId = productIdMap.get(p.public_id);
      if (!productId) continue;
      for (const catId of p.categories) {
        const exists = await trx<ProductCategoryRow>('product_categories')
          .where({ product_id: productId, category_id: catId })
          .first();
        if (!exists) {
          await trx('product_categories').insert({
            product_id: productId,
            category_id: catId,
          });
        }
      }
    }

    // Lấy các id cụ thể cho từng sản phẩm để dùng cho attributes/images
    const iphone15 = assertRow(
      products.find((p) => p.public_id === 'prod_iphone15'),
      'product iphone15',
    );
    const iphone14 = assertRow(
      products.find((p) => p.public_id === 'prod_iphone14'),
      'product iphone14',
    );
    const samsungS24 = assertRow(
      products.find((p) => p.public_id === 'prod_samsung_s24'),
      'product samsungS24',
    );
    const macbook = assertRow(
      products.find((p) => p.public_id === 'prod_macbook_m3'),
      'product macbook',
    );
    const dellXps = assertRow(
      products.find((p) => p.public_id === 'prod_dell_xps'),
      'product dell',
    );
    const ipadAir = assertRow(
      products.find((p) => p.public_id === 'prod_ipad_air'),
      'product ipad',
    );
    const airpods = assertRow(
      products.find((p) => p.public_id === 'prod_airpods_pro'),
      'product airpods',
    );
    const samsungBuds = assertRow(
      products.find((p) => p.public_id === 'prod_samsung_buds'),
      'product samsung buds',
    );
    const anker = assertRow(
      products.find((p) => p.public_id === 'prod_anker_powerbank'),
      'product anker',
    );
    const xiaomi = assertRow(
      products.find((p) => p.public_id === 'prod_xiaomi_robot'),
      'product xiaomi',
    );

    // 7. Product Attributes (variants) cho một số sản phẩm chính
    const attributesPayload = [
      // iPhone 15 Pro Max: 2 màu
      {
        product_id: iphone15.id,
        attribute_name: 'Màu sắc',
        attribute_value: 'Titan tự nhiên',
        sku: 'IP15-TITAN-256',
        price: 29990000,
        stock_quantity: 50,
        sort_order: 1,
      },
      {
        product_id: iphone15.id,
        attribute_name: 'Màu sắc',
        attribute_value: 'Xanh Titan',
        sku: 'IP15-BLUE-256',
        price: 29500000,
        stock_quantity: 50,
        sort_order: 2,
      },
      // iPhone 14 Pro: 2 màu
      {
        product_id: iphone14.id,
        attribute_name: 'Màu sắc',
        attribute_value: 'Tím',
        sku: 'IP14-PURPLE-128',
        price: 23500000,
        stock_quantity: 40,
        sort_order: 1,
      },
      {
        product_id: iphone14.id,
        attribute_name: 'Màu sắc',
        attribute_value: 'Vàng gold',
        sku: 'IP14-GOLD-128',
        price: 23990000,
        stock_quantity: 40,
        sort_order: 2,
      },
      // MacBook M3: RAM/SSD
      {
        product_id: macbook.id,
        attribute_name: 'Cấu hình',
        attribute_value: '16GB/512GB',
        sku: 'MBM3-16-512',
        price: 44990000,
        stock_quantity: 15,
        sort_order: 1,
      },
      {
        product_id: macbook.id,
        attribute_name: 'Cấu hình',
        attribute_value: '32GB/1TB',
        sku: 'MBM3-32-1TB',
        price: 54990000,
        stock_quantity: 10,
        sort_order: 2,
      },
    ];

    for (const attr of attributesPayload) {
      const exists = await trx<ProductAttributeRow, IdRow | undefined>(
        'product_attributes',
      )
        .where({ sku: attr.sku })
        .first('id');
      if (!exists) {
        await trx('product_attributes').insert(attr);
      }
    }

    // 8. Product Images
    const imagesPayload = [
      {
        product_id: iphone15.id,
        image_url: 'https://example.com/iphone15-1.jpg',
        alt_text: 'iPhone 15 mặt trước',
        display_order: 1,
      },
      {
        product_id: iphone15.id,
        image_url: 'https://example.com/iphone15-2.jpg',
        alt_text: 'iPhone 15 mặt sau',
        display_order: 2,
      },
      {
        product_id: iphone15.id,
        image_url: 'https://example.com/iphone15-3.jpg',
        alt_text: 'iPhone 15 camera',
        display_order: 3,
      },
      {
        product_id: iphone14.id,
        image_url: 'https://example.com/iphone14-1.jpg',
        alt_text: 'iPhone 14 Pro',
        display_order: 1,
      },
      {
        product_id: samsungS24.id,
        image_url: 'https://example.com/samsung-s24.jpg',
        alt_text: 'Samsung S24 Ultra',
        display_order: 1,
      },
      {
        product_id: macbook.id,
        image_url: 'https://example.com/macbook-m3.jpg',
        alt_text: 'MacBook Pro M3',
        display_order: 1,
      },
      {
        product_id: dellXps.id,
        image_url: 'https://example.com/dell-xps.jpg',
        alt_text: 'Dell XPS 15',
        display_order: 1,
      },
      {
        product_id: ipadAir.id,
        image_url: 'https://example.com/ipad-air.jpg',
        alt_text: 'iPad Air M1',
        display_order: 1,
      },
      {
        product_id: airpods.id,
        image_url: 'https://example.com/airpods-pro2.jpg',
        alt_text: 'AirPods Pro 2',
        display_order: 1,
      },
      {
        product_id: samsungBuds.id,
        image_url: 'https://example.com/samsung-buds2.jpg',
        alt_text: 'Samsung Buds2 Pro',
        display_order: 1,
      },
      {
        product_id: anker.id,
        image_url: 'https://example.com/anker-powerbank.jpg',
        alt_text: 'Anker PowerCore',
        display_order: 1,
      },
      {
        product_id: xiaomi.id,
        image_url: 'https://example.com/xiaomi-robot.jpg',
        alt_text: 'Xiaomi Robot Vacuum',
        display_order: 1,
      },
    ];

    for (const img of imagesPayload) {
      const exists = await trx<ProductImageRow, IdRow | undefined>(
        'product_images',
      )
        .where({ product_id: img.product_id, image_url: img.image_url })
        .first('id');
      if (!exists) {
        await trx('product_images').insert(img);
      }
    }

    // 9. Stock log (cho iPhone 15 Titan)
    const ipTitanAttr = await trx<ProductAttributeRow, IdRow | undefined>(
      'product_attributes',
    )
      .where({ sku: 'IP15-TITAN-256' })
      .first('id');
    if (ipTitanAttr) {
      const logExists = await trx<StockLogRow, IdRow | undefined>('stock_logs')
        .where({
          product_id: iphone15.id,
          product_attribute_id: ipTitanAttr.id,
          action: 'in',
        })
        .first('id');
      if (!logExists) {
        await trx('stock_logs').insert({
          product_id: iphone15.id,
          product_attribute_id: ipTitanAttr.id,
          changed_by_user_id: adminUser.id,
          action: 'in',
          quantity_change: 50,
          before_quantity: 0,
          after_quantity: 50,
          reason: 'Nhập kho lô hàng iPhone 15 Titan',
        });
      }
    }

    // 10. Tạo đơn hàng mẫu (sử dụng iPhone 15 làm ví dụ)
    const orderItemsPayload = [
      {
        product_id: iphone15.id,
        quantity: 1,
        price_at_purchase: 29990000,
      },
    ];
    const totalAmount = orderItemsPayload.reduce(
      (sum, item) => sum + item.quantity * item.price_at_purchase,
      0,
    );

    const orderCode = 'ORD-2026-0001';
    const existingOrder: IdRow | undefined = await trx('orders')
      .where({ order_code: orderCode })
      .first('id');
    let orderId: number;
    if (!existingOrder) {
      const insertedOrders = (await trx('orders')
        .insert({
          order_code: orderCode,
          user_id: customerUser.id,
          total_amount: totalAmount,
          customer_name: safeCustomerAddress.recipient_name,
          customer_phone: safeCustomerAddress.phone_number,
          status: 'processing',
          shipping_address: `${safeCustomerAddress.address_line}, ${safeCustomerAddress.ward}, ${safeCustomerAddress.district}, ${safeCustomerAddress.province}`,
        })
        .returning('id')) as IdRow[];
      const insertedOrder = insertedOrders[0];
      if (!insertedOrder) {
        throw new Error('Failed to create order');
      }
      orderId = insertedOrder.id;
    } else {
      orderId = existingOrder.id;
      await trx('orders')
        .where({ id: orderId })
        .update({
          total_amount: totalAmount,
          customer_name: safeCustomerAddress.recipient_name,
          customer_phone: safeCustomerAddress.phone_number,
          shipping_address: `${safeCustomerAddress.address_line}, ${safeCustomerAddress.ward}, ${safeCustomerAddress.district}, ${safeCustomerAddress.province}`,
        });
    }

    // Insert order_items
    for (const item of orderItemsPayload) {
      const exists = await trx<IdRow>('order_items')
        .where({
          order_id: orderId,
          product_id: item.product_id,
          price_at_purchase: item.price_at_purchase,
        })
        .first('id');
      if (!exists) {
        await trx('order_items').insert({
          order_id: orderId,
          product_id: item.product_id,
          quantity: item.quantity,
          price_at_purchase: item.price_at_purchase,
        });
      }
    }

    // 11. Thanh toán cho đơn hàng
    await trx('payments')
      .insert({
        public_id: 'pay_001',
        order_id: orderId,
        amount: totalAmount,
        payment_method: 'credit_card',
        payment_status: 'completed',
        transaction_id: 'TRANS-BANK-999888',
        paid_at: new Date(),
      })
      .onConflict('public_id')
      .merge([
        'order_id',
        'amount',
        'payment_method',
        'payment_status',
        'transaction_id',
      ]);

    // 12. Giỏ hàng cho khách hàng (thêm Macbook vào giỏ)
    let cart = (await trx('carts')
      .where({ user_id: customerUser.id })
      .first()) as CartRow | undefined;

    if (!cart) {
      await trx('carts').insert({ user_id: customerUser.id });
      cart = (await trx('carts')
        .where({ user_id: customerUser.id })
        .first()) as CartRow | undefined;
      if (!cart) {
        throw new Error('Failed to create cart for customer');
      }
    }

    const cartItemExists = (await trx('cart_items')
      .where({ cart_id: cart.id, product_id: macbook.id })
      .first()) as IdRow | undefined;

    if (!cartItemExists) {
      await trx('cart_items').insert({
        cart_id: cart.id,
        product_id: macbook.id,
        quantity: 1,
      });
    }
  });
}
