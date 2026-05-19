import { createHash } from 'crypto';
import { Knex } from 'knex';
import { PRODUCTS_DATA } from './data/products.data';

// ─── Types ─────────────────────────────────────────────────────────────────

type IdRow = { id: number };
type CategoryRow = IdRow & { name: string };
type UserRow = IdRow & { email: string };
type AttributeRow = IdRow & { name: string };
type AttributeValueRow = IdRow & { attribute_id: number; value: string };
type ProductRow = IdRow & { public_id: string };
type ProductLookupRow = ProductRow & { name: string };
type VariantRow = IdRow & { sku: string };
type UserAddressRow = IdRow & {
  recipient_name: string;
  phone_number: string;
  address_line: string;
  ward: string;
  district: string;
  province: string;
};

function assertRow<T>(row: T | undefined, context: string): T {
  if (!row) {
    throw new Error(`Seed failed: missing row for ${context}`);
  }
  return row;
}

/**
 * Tạo option_hash ổn định cho một tập attribute_value_id.
 * Sắp xếp ids trước khi hash để đảm bảo thứ tự không ảnh hưởng.
 */
function buildOptionHash(attributeValueIds: number[]): string {
  const sorted = [...attributeValueIds].sort((a, b) => a - b);
  return createHash('md5').update(sorted.join('-')).digest('hex');
}

// ─── Main seed function ─────────────────────────────────────────────────────

export async function seed(knex: Knex): Promise<void> {
  await knex.transaction(async (trx) => {
    // ── 1. Load prerequisites ───────────────────────────────────────────────

    const allCategoryNames = [
      ...new Set(PRODUCTS_DATA.flatMap((p) => p.categoryNames)),
    ];
    const categories = await trx<CategoryRow>('categories')
      .whereIn('name', allCategoryNames)
      .whereNull('deleted_at')
      .select(['id', 'name']);

    const catMap = new Map<string, number>(
      categories.map((c) => [c.name, c.id]),
    );

    const users = await trx<UserRow>('users')
      .whereIn('email', ['admin@ecommerce.com', 'khachhang@gmail.com'])
      .whereNull('deleted_at')
      .select(['id', 'email']);

    const adminUser = assertRow(
      users.find((u) => u.email === 'admin@ecommerce.com'),
      'user: admin',
    );
    const customerUser = assertRow(
      users.find((u) => u.email === 'khachhang@gmail.com'),
      'user: customer',
    );

    const customerAddress = await trx<UserAddressRow>('user_addresses')
      .where({ user_id: customerUser.id })
      .whereNull('deleted_at')
      .select([
        'id',
        'recipient_name',
        'phone_number',
        'address_line',
        'ward',
        'district',
        'province',
      ])
      .first();
    const safeAddress = assertRow(customerAddress, 'user_addresses (customer)');

    // ── 2. Upsert Attributes & Attribute Values ─────────────────────────────

    // Gom tất cả attributes/values duy nhất từ data
    type AttrDef = { name: string; displayName: string };
    type AttrValDef = {
      attributeName: string;
      value: string;
      displayValue: string;
    };

    const attrDefsMap = new Map<string, AttrDef>();
    const attrValDefsMap = new Map<string, AttrValDef>();

    for (const product of PRODUCTS_DATA) {
      for (const variant of product.variants) {
        for (const opt of variant.options) {
          attrDefsMap.set(opt.attributeName, {
            name: opt.attributeName,
            displayName: opt.attributeDisplayName,
          });
          const key = `${opt.attributeName}::${opt.value}`;
          attrValDefsMap.set(key, {
            attributeName: opt.attributeName,
            value: opt.value,
            displayValue: opt.displayValue,
          });
        }
      }
    }

    // Insert attributes
    for (const attr of attrDefsMap.values()) {
      await trx('attributes')
        .insert({ name: attr.name, display_name: attr.displayName })
        .onConflict('name')
        .merge(['display_name']);
    }

    const dbAttributes = (await trx<AttributeRow>('attributes')
      .whereIn('name', [...attrDefsMap.keys()])
      .select(['id', 'name'])) as AttributeRow[];

    const attrIdMap = new Map<string, number>(
      dbAttributes.map((a) => [a.name, a.id]),
    );

    // Insert attribute_values
    for (const def of attrValDefsMap.values()) {
      const attributeId = attrIdMap.get(def.attributeName);
      if (!attributeId) continue;
      await trx('attribute_values')
        .insert({
          attribute_id: attributeId,
          value: def.value,
          display_value: def.displayValue,
        })
        .onConflict(['attribute_id', 'value'])
        .merge(['display_value']);
    }

    const dbAttrValues = await trx<AttributeValueRow>('attribute_values')
      .whereIn('attribute_id', [...attrIdMap.values()])
      .select(['id', 'attribute_id', 'value']);

    /** Lookup: "attributeName::value" → attribute_value.id */
    const attrValIdMap = new Map<string, number>();
    for (const av of dbAttrValues) {
      const attrName = dbAttributes.find((a) => a.id === av.attribute_id)?.name;
      if (attrName) {
        attrValIdMap.set(`${attrName}::${av.value}`, av.id);
      }
    }

    // ── 3. Upsert Products ──────────────────────────────────────────────────

    for (const p of PRODUCTS_DATA) {
      await trx('products')
        .insert({
          public_id: p.public_id,
          name: p.name,
          slug: p.slug,
          description: p.description,
          price: p.price,
          is_active: p.is_active,
        })
        .onConflict('public_id')
        .merge(['name', 'slug', 'description', 'price', 'is_active']);
    }

    const productPublicIds = PRODUCTS_DATA.map((p) => p.public_id);
    const dbProducts = (await trx<ProductLookupRow>('products')
      .whereIn('public_id', productPublicIds)
      .select(['id', 'public_id', 'name'])) as ProductLookupRow[];

    const productIdMap = new Map<string, number>(
      dbProducts.map((p) => [p.public_id, p.id]),
    );

    // ── 4. Product Categories ───────────────────────────────────────────────

    for (const p of PRODUCTS_DATA) {
      const productId = productIdMap.get(p.public_id);
      if (!productId) continue;

      for (const catName of p.categoryNames) {
        const catId = catMap.get(catName);
        if (!catId) {
          console.warn(
            `[04_products] WARNING: category "${catName}" not found for product "${p.public_id}"`,
          );
          continue;
        }
        await trx('product_categories')
          .insert({ product_id: productId, category_id: catId })
          .onConflict(['product_id', 'category_id'])
          .ignore();
      }
    }

    // ── 4b. Product-level Images (variant_id = null) ────────────────────────

    for (const p of PRODUCTS_DATA) {
      const productId = productIdMap.get(p.public_id);
      if (!productId || !p.images?.length) continue;

      for (const img of p.images) {
        const imgExists = (await trx('product_images')
          .where({
            product_id: productId,
            variant_id: null,
            image_url: img.image_url,
          })
          .select(['id'])
          .first()) as IdRow | undefined;
        if (!imgExists) {
          await trx('product_images').insert({
            product_id: productId,
            variant_id: null,
            image_url: img.image_url,
            alt_text: img.alt_text,
            display_order: img.display_order,
          });
        }
      }
    }

    // ── 5. Product Variants + Variant Options + Images ──────────────────────

    for (const p of PRODUCTS_DATA) {
      const productId = productIdMap.get(p.public_id);
      if (!productId) continue;

      for (const variant of p.variants) {
        // Tính option_hash từ các attribute_value_ids của variant này
        const avIds: number[] = [];
        for (const opt of variant.options) {
          const avId = attrValIdMap.get(`${opt.attributeName}::${opt.value}`);
          if (avId) avIds.push(avId);
        }
        const optionHash = buildOptionHash(avIds);

        // Upsert variant
        await trx('product_variants')
          .insert({
            product_id: productId,
            sku: variant.sku,
            price: variant.price,
            stock_quantity: variant.stock_quantity,
            is_active: variant.is_active,
            option_hash: optionHash,
          })
          .onConflict('sku')
          .merge(['price', 'stock_quantity', 'is_active', 'option_hash']);

        const dbVariant = await trx<VariantRow>('product_variants')
          .where({ sku: variant.sku })
          .select(['id', 'sku'])
          .first();

        if (!dbVariant) continue;

        // Insert variant options (liên kết variant ↔ attribute_value)
        for (const opt of variant.options) {
          const avId = attrValIdMap.get(`${opt.attributeName}::${opt.value}`);
          if (!avId) continue;
          await trx('product_variant_options')
            .insert({
              variant_id: dbVariant.id,
              attribute_value_id: avId,
            })
            .onConflict(['variant_id', 'attribute_value_id'])
            .ignore();
        }

        // Insert ảnh cho variant (product_id là NOT NULL theo schema mới)
        const imgExists = await trx<{ id: number }>('product_images')
          .where({
            product_id: productId,
            variant_id: dbVariant.id,
            image_url: variant.imageUrl,
          })
          .select(['id'])
          .first();
        if (!imgExists) {
          await trx('product_images').insert({
            product_id: productId,
            variant_id: dbVariant.id,
            image_url: variant.imageUrl,
            alt_text: variant.imageAlt,
            display_order: 1,
          });
        }
      }
    }

    // ── 6. Stock Logs (nhập kho ban đầu cho một số variants) ───────────────

    const stockLogVariants = [
      'IP15PM-TITAN-256',
      'IP15PM-BLUE-512',
      'MBM3-16-512-SG',
      'S24U-BLACK-256',
    ];

    // Lấy product_id theo sku
    type VariantWithProductRow = VariantRow & { product_id: number };
    const stockVariantsWithProduct = await trx<VariantWithProductRow>(
      'product_variants',
    )
      .whereIn('sku', stockLogVariants)
      .select(['id', 'sku', 'product_id']);

    for (const v of stockVariantsWithProduct) {
      const exists = await trx<{ id: number }>('stock_logs')
        .where({ variant_id: v.id, action: 'in' })
        .select(['id'])
        .first();
      if (!exists) {
        const variantData = PRODUCTS_DATA.flatMap((p) => p.variants).find(
          (vd) => vd.sku === v.sku,
        );
        if (!variantData) continue;

        await trx('stock_logs').insert({
          product_id: v.product_id,
          variant_id: v.id,
          changed_by_user_id: adminUser.id,
          action: 'in',
          quantity_change: variantData.stock_quantity,
          before_quantity: 0,
          after_quantity: variantData.stock_quantity,
          reason: `Nhập kho ban đầu - SKU: ${v.sku}`,
        });
      }
    }

    console.log(
      `[04_products] Seeded ${PRODUCTS_DATA.length} products with variants, options, images & stock logs.`,
    );

    // ── 7. Đơn hàng mẫu ────────────────────────────────────────────────────

    // Lấy variant iPhone 15 để tạo order item
    const ip15TitanVariant = (await trx<VariantRow>('product_variants')
      .where({ sku: 'IP15PM-TITAN-256' })
      .select(['id', 'sku'])
      .first()) as VariantRow | undefined;

    const ip15Product = dbProducts.find((p) => p.public_id === 'prod_iphone15');

    const macbookVariant = (await trx<VariantRow>('product_variants')
      .where({ sku: 'MBM3-16-512-SG' })
      .select(['id', 'sku'])
      .first()) as VariantRow | undefined;

    const macbookProduct = dbProducts.find(
      (p) => p.public_id === 'prod_macbook_m3',
    );

    type OrderItemDef = {
      product_id: number | null;
      variant_id: number | null;
      quantity: number;
      price_at_purchase: number;
      product_name: string;
      variant_name: string | null;
      sku: string | null;
    };

    const orderItemsDef: OrderItemDef[] = [];

    if (ip15TitanVariant && ip15Product) {
      orderItemsDef.push({
        product_id: null, // CẬP NHẬT: Phải để null vì đã có variant_id
        variant_id: ip15TitanVariant.id,
        quantity: 1,
        price_at_purchase: 29990000,
        product_name: ip15Product.name, // CẬP NHẬT: Lưu snapshot name
        variant_name: 'Titan 256GB',
        sku: ip15TitanVariant.sku,
      });
    }
    if (macbookVariant && macbookProduct) {
      orderItemsDef.push({
        product_id: null, // CẬP NHẬT: Phải để null vì đã có variant_id
        variant_id: macbookVariant.id,
        quantity: 1,
        price_at_purchase: 44990000,
        product_name: macbookProduct.name, // CẬP NHẬT: Lưu snapshot name
        variant_name: '16GB RAM 512GB Space Gray',
        sku: macbookVariant.sku,
      });
    }

    const totalAmount = orderItemsDef.reduce(
      (sum, item) => sum + item.quantity * item.price_at_purchase,
      0,
    );

    const shippingAddress = [
      safeAddress.address_line,
      safeAddress.ward,
      safeAddress.district,
      safeAddress.province,
    ]
      .filter(Boolean)
      .join(', ');

    // Order 1: processing + credit_card completed
    const order1Code = 'ORD-2026-0001';
    let order1Id: number;

    const existingOrder1 = await trx<IdRow>('orders')
      .where({ order_code: order1Code })
      .select(['id'])
      .first();

    if (!existingOrder1) {
      const [o1] = (await trx('orders')
        .insert({
          order_code: order1Code,
          user_id: customerUser.id,
          user_address_id: safeAddress.id,
          total_amount: totalAmount,
          customer_name: safeAddress.recipient_name,
          customer_phone: safeAddress.phone_number,
          status: 'processing',
          shipping_address: shippingAddress,
        })
        .returning('id')) as IdRow[];
      if (!o1) throw new Error('Failed to create order 1');
      order1Id = o1.id;
    } else {
      order1Id = existingOrder1.id;
    }

    for (const item of orderItemsDef) {
      // Vì unique constraint hiện tại là ['order_id', 'product_id', 'variant_id']
      // nên phải kiểm tra chính xác cả NULL
      const oi1Query = trx('order_items').where({ order_id: order1Id });
      if (item.product_id) oi1Query.where('product_id', item.product_id);
      else oi1Query.whereNull('product_id');

      if (item.variant_id) oi1Query.where('variant_id', item.variant_id);
      else oi1Query.whereNull('variant_id');

      const oi1Exists = (await oi1Query.select(['id']).first()) as
        | IdRow
        | undefined;

      if (!oi1Exists) {
        await trx('order_items').insert({
          order_id: order1Id,
          product_id: item.product_id,
          variant_id: item.variant_id,
          quantity: item.quantity,
          price_at_purchase: item.price_at_purchase,
          product_name: item.product_name, // CẬP NHẬT
          variant_name: item.variant_name, // CẬP NHẬT
          sku: item.sku, // CẬP NHẬT
        });
      }
    }

    // Order 2: delivered + bank_transfer completed
    const order2Code = 'ORD-2026-0002';
    let order2Id: number;

    const existingOrder2 = await trx<IdRow>('orders')
      .where({ order_code: order2Code })
      .select(['id'])
      .first();

    if (ip15Product && !existingOrder2) {
      const [o2] = (await trx('orders')
        .insert({
          order_code: order2Code,
          user_id: customerUser.id,
          user_address_id: safeAddress.id,
          total_amount: 29990000,
          customer_name: safeAddress.recipient_name,
          customer_phone: safeAddress.phone_number,
          status: 'delivered',
          shipping_address: shippingAddress,
        })
        .returning('id')) as IdRow[];
      if (!o2) throw new Error('Failed to create order 2');
      order2Id = o2.id;

      await trx('order_items').insert({
        order_id: order2Id,
        product_id: null, // CẬP NHẬT: Chỉ lưu variant_id
        variant_id: ip15TitanVariant?.id ?? null,
        quantity: 1,
        price_at_purchase: 29990000,
        product_name: ip15Product.name, // CẬP NHẬT
        variant_name: 'Titan 256GB', // CẬP NHẬT
        sku: ip15TitanVariant?.sku ?? null, // CẬP NHẬT
      });
    } else if (existingOrder2) {
      order2Id = existingOrder2.id;
    } else {
      order2Id = order1Id; // fallback
    }

    // ── 8. Payments ─────────────────────────────────────────────────────────

    await trx('payments')
      .insert({
        public_id: 'pay_001',
        order_id: order1Id,
        amount: totalAmount,
        payment_method: 'credit_card',
        payment_status: 'pending',
      })
      .onConflict('public_id')
      .merge(['order_id', 'amount', 'payment_method', 'payment_status']);

    await trx('payments')
      .insert({
        public_id: 'pay_002',
        order_id: order2Id,
        amount: 29990000,
        payment_method: 'bank_transfer',
        payment_status: 'completed',
        transaction_id: 'TRANS-BANK-20260001',
        paid_at: new Date('2026-05-10T08:30:00Z'),
      })
      .onConflict('public_id')
      .merge([
        'order_id',
        'amount',
        'payment_method',
        'payment_status',
        'transaction_id',
        'paid_at',
      ]);

    console.log('[04_products] Seeded 2 orders with order items & payments.');

    // ── 9. Giỏ hàng mẫu ────────────────────────────────────────────────────

    await trx('carts')
      .insert({ user_id: customerUser.id })
      .onConflict('user_id')
      .ignore();

    const cart = (await trx('carts')
      .where({ user_id: customerUser.id })
      .select(['id'])
      .first()) as IdRow | undefined;

    if (cart && macbookProduct && macbookVariant) {
      await trx('cart_items')
        .insert({
          cart_id: cart.id,
          product_id: macbookProduct.id,
          variant_id: macbookVariant.id,
          quantity: 1,
        })
        .onConflict(['cart_id', 'product_id', 'variant_id'])
        .merge(['quantity']);
    }

    console.log('[04_products] Seeded cart for customer.');
  });
}
