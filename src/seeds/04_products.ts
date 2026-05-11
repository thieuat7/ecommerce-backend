import { Knex } from 'knex';

type IdRow = { id: number };
type CategoryRow = IdRow & { name: string };
type UserRow = IdRow & { email: string };
type ProductRow = IdRow & { public_id: string };
type ProductAttributeRow = IdRow & { sku: string };
type ProductImageRow = IdRow & { product_id: number; image_url: string };
type StockLogRow = IdRow & {
  product_id: number;
  product_attribute_id: number;
  action: string;
};
type OrderRow = IdRow & { order_code: string };
type OrderItemRow = IdRow & {
  order_id: number;
  product_id: number;
  price_at_purchase: number;
};
type CartRow = IdRow & { user_id: number };
type CartItemRow = IdRow & { cart_id: number; product_id: number };

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
    const categories = await trx<CategoryRow, CategoryRow[]>('categories')
      .whereIn('name', ['Điện thoại di động', 'Máy tính xách tay'])
      .select(['id', 'name'])
      .whereNull('deleted_at');

    const users = await trx<UserRow, UserRow[]>('users')
      .whereIn('email', ['admin@ecommerce.com', 'khachhang@gmail.com'])
      .select(['id', 'email'])
      .whereNull('deleted_at');

    const customerAddress = (await trx<
      CustomerAddressRow,
      CustomerAddressRow[]
    >('user_addresses')
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

    const phones = assertRow(
      categories.find((row) => row.name === 'Điện thoại di động'),
      'categories.phones',
    );
    const laptops = assertRow(
      categories.find((row) => row.name === 'Máy tính xách tay'),
      'categories.laptops',
    );
    const adminUser = assertRow(
      users.find((row) => row.email === 'admin@ecommerce.com'),
      'users.admin',
    );
    const customerUser = assertRow(
      users.find((row) => row.email === 'khachhang@gmail.com'),
      'users.customer',
    );
    const safeCustomerAddress = assertRow(
      customerAddress,
      'user_addresses.customer',
    );

    await trx('products')
      .insert([
        {
          public_id: 'prod_iphone15',
          category_id: phones.id,
          name: 'iPhone 15 Pro Max',
          slug: 'iphone-15-pro-max',
          description: 'Điện thoại cao cấp của Apple',
          price: 30000000,
          stock_quantity: 100,
        },
        {
          public_id: 'prod_macbookm3',
          category_id: laptops.id,
          name: 'Macbook Pro M3',
          slug: 'macbook-pro-m3',
          description: 'Laptop hiệu năng cao cho lập trình viên',
          price: 45000000,
          stock_quantity: 20,
        },
      ])
      .onConflict('public_id')
      .merge([
        'category_id',
        'name',
        'slug',
        'description',
        'price',
        'stock_quantity',
      ]);

    const products = await trx<ProductRow, ProductRow[]>('products')
      .whereIn('public_id', ['prod_iphone15', 'prod_macbookm3'])
      .select(['id', 'public_id']);

    const iphone = assertRow(
      products.find((row) => row.public_id === 'prod_iphone15'),
      'products.iphone',
    );
    const macbook = assertRow(
      products.find((row) => row.public_id === 'prod_macbookm3'),
      'products.macbook',
    );

    const attributesPayload = [
      {
        product_id: iphone.id,
        attribute_name: 'Màu sắc',
        attribute_value: 'Titan tự nhiên',
        sku: 'IP15-TITAN-256',
        price: 30000000,
        stock_quantity: 50,
      },
      {
        product_id: iphone.id,
        attribute_name: 'Màu sắc',
        attribute_value: 'Xanh Titan',
        sku: 'IP15-BLUE-256',
        price: 29500000,
        stock_quantity: 50,
      },
    ];

    for (const attribute of attributesPayload) {
      const exists = await trx<ProductAttributeRow, IdRow | undefined>(
        'product_attributes',
      )
        .where({ sku: attribute.sku })
        .first('id');
      if (!exists) {
        await trx('product_attributes').insert(attribute);
      }
    }

    const ipTitan = await trx<ProductAttributeRow, IdRow | undefined>(
      'product_attributes',
    )
      .where({ sku: 'IP15-TITAN-256' })
      .first(['id']);
    const safeIpTitan = assertRow(ipTitan, 'product_attributes.ip_titan');

    const imagesPayload = [
      {
        product_id: iphone.id,
        image_url: 'https://example.com/iphone15-1.jpg',
        alt_text: 'Mặt trước iPhone 15',
        display_order: 1,
      },
      {
        product_id: iphone.id,
        image_url: 'https://example.com/iphone15-2.jpg',
        alt_text: 'Mặt sau iPhone 15',
        display_order: 2,
      },
      {
        product_id: macbook.id,
        image_url: 'https://example.com/macbook-m3.jpg',
        alt_text: 'Macbook Pro M3',
        display_order: 1,
      },
    ];

    for (const image of imagesPayload) {
      const exists = await trx<ProductImageRow, IdRow | undefined>(
        'product_images',
      )
        .where({ product_id: image.product_id, image_url: image.image_url })
        .first('id');
      if (!exists) {
        await trx('product_images').insert(image);
      }
    }

    const stockLogExists = await trx<StockLogRow, IdRow | undefined>(
      'stock_logs',
    )
      .where({
        product_id: iphone.id,
        product_attribute_id: safeIpTitan.id,
        action: 'in',
      })
      .first('id');

    if (!stockLogExists) {
      await trx('stock_logs').insert({
        product_id: iphone.id,
        product_attribute_id: safeIpTitan.id,
        changed_by_user_id: adminUser.id,
        action: 'in',
        quantity_change: 50,
        before_quantity: 0,
        after_quantity: 50,
        reason: 'Nhập kho lô hàng đầu tiên',
      });
    }

    const orderItemsPayload = [
      {
        product_id: iphone.id,
        quantity: 1,
        price_at_purchase: 30000000,
      },
    ];

    const totalAmount = orderItemsPayload.reduce(
      (sum, item) => sum + item.quantity * item.price_at_purchase,
      0,
    );

    await trx('orders')
      .insert([
        {
          order_code: 'ORD-2026-0001',
          user_id: customerUser.id,
          total_amount: totalAmount,
          customer_name: safeCustomerAddress.recipient_name,
          customer_phone: safeCustomerAddress.phone_number,
          status: 'processing',
          shipping_address: `${safeCustomerAddress.address_line}, ${safeCustomerAddress.ward}, ${safeCustomerAddress.district}, ${safeCustomerAddress.province}`,
        },
      ])
      .onConflict('order_code')
      .merge([
        'user_id',
        'total_amount',
        'customer_name',
        'customer_phone',
        'status',
        'shipping_address',
      ]);

    const order = await trx<OrderRow, IdRow | undefined>('orders')
      .where({ order_code: 'ORD-2026-0001' })
      .first(['id']);
    const safeOrder = assertRow(order, 'orders.order_1');

    for (const item of orderItemsPayload) {
      const exists = await trx<OrderItemRow, IdRow | undefined>('order_items')
        .where({
          order_id: safeOrder.id,
          product_id: item.product_id,
          price_at_purchase: item.price_at_purchase,
        })
        .first('id');
      if (!exists) {
        await trx('order_items').insert({
          order_id: safeOrder.id,
          product_id: item.product_id,
          quantity: item.quantity,
          price_at_purchase: item.price_at_purchase,
        });
      }
    }

    await trx('payments')
      .insert([
        {
          public_id: 'pay_001',
          order_id: safeOrder.id,
          amount: totalAmount,
          payment_method: 'credit_card',
          payment_status: 'completed',
          transaction_id: 'TRANS-BANK-999888',
          paid_at: trx.fn.now(),
        },
      ])
      .onConflict('public_id')
      .merge([
        'order_id',
        'amount',
        'payment_method',
        'payment_status',
        'transaction_id',
      ]);

    const insertedCarts = await trx<CartRow, IdRow[]>('carts')
      .insert([{ user_id: customerUser.id }])
      .onConflict('user_id')
      .ignore()
      .returning(['id']);

    const cart = insertedCarts[0];

    const safeCart =
      cart ||
      (await trx<CartRow, IdRow | undefined>('carts')
        .where({ user_id: customerUser.id })
        .first(['id']));

    const finalCart = assertRow(safeCart, 'carts.customer');

    const cartItemExists = await trx<CartItemRow, IdRow | undefined>(
      'cart_items',
    )
      .where({ cart_id: finalCart.id, product_id: macbook.id })
      .first('id');

    if (!cartItemExists) {
      await trx('cart_items').insert({
        cart_id: finalCart.id,
        product_id: macbook.id,
        quantity: 1,
      });
    }
  });
}
