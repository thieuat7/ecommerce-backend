import type { Knex } from 'knex';

// Phụ thuộc: 1680000000002-CreateRolesUsers (users)
//             1680000000003-CreateCategoriesAddresses (user_addresses)
//             1680000000004-CreateProducts (products, product_variants)
// order_status_enum tạo ở 1680000000001-CreateEnums
export const up = async (knex: Knex): Promise<void> => {
  // ─── orders ───────────────────────────────────────────────────────────────
  await knex.schema.createTable(
    'orders',
    (table: Knex.TableBuilder): void => {
      table.increments('id').primary();
      table.string('order_code', 50).notNullable().unique();
      table
        .integer('user_id')
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table
        .integer('user_address_id')
        .references('id')
        .inTable('user_addresses')
        .onDelete('SET NULL');
      table.decimal('total_amount', 14, 2).notNullable();
      table.string('customer_name', 100);
      table.string('customer_phone', 20);
      table.specificType('status', 'order_status_enum').defaultTo('pending');
      table.text('shipping_address').notNullable();
      table.timestamps(true, true);
      table.timestamp('deleted_at');
      table.index('user_id');
    },
  );

  // ─── order_items ──────────────────────────────────────────────────────────
  await knex.schema.createTable(
    'order_items',
    (table: Knex.TableBuilder): void => {
      table.increments('id').primary();
      table
        .integer('order_id')
        .references('id')
        .inTable('orders')
        .notNullable()
        .onDelete('CASCADE');

      // XOR: đúng một trong hai phải được set (xem harness/instructions.md §3.2)
      table
        .integer('product_id')
        .nullable()
        .references('id')
        .inTable('products')
        .onDelete('RESTRICT');
      table
        .integer('variant_id')
        .nullable()
        .references('id')
        .inTable('product_variants')
        .onDelete('RESTRICT');

      table.integer('quantity').notNullable();
      table.check('quantity > 0', [], 'order_items_quantity_check');

      table.decimal('price_at_purchase', 14, 2).notNullable();

      // Snapshot dữ liệu tại thời điểm đặt hàng (tránh mất thông tin khi sản phẩm đổi tên)
      table.string('product_name', 255).notNullable();
      table.string('variant_name', 255).nullable();
      table.string('sku', 100).nullable();

      table.check(
        '((product_id IS NOT NULL AND variant_id IS NULL) OR (product_id IS NULL AND variant_id IS NOT NULL))',
        [],
        'order_items_product_or_variant_check',
      );

      table.unique(['order_id', 'product_id', 'variant_id']);
      table.timestamps(true, true);
      table.index(['order_id', 'product_id']);
      table.index(['order_id', 'variant_id']);
    },
  );
};

export const down = async (knex: Knex): Promise<void> => {
  await knex.schema.dropTableIfExists('order_items');
  await knex.schema.dropTableIfExists('orders');
};
