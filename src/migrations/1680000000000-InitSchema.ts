/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import type { Knex } from 'knex';

export const up = async (knex: Knex): Promise<void> => {
  // =========================
  // 1. ENUMS (PostgreSQL)
  // =========================
  await knex.raw(`
    CREATE TYPE auth_provider_enum AS ENUM ('local', 'google', 'facebook', 'apple');
    CREATE TYPE order_status_enum AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'cancelled');
    CREATE TYPE payment_method_enum AS ENUM ('cod', 'credit_card', 'bank_transfer', 'e_wallet', 'momo');
    CREATE TYPE payment_status_enum AS ENUM ('pending', 'completed', 'failed', 'refunded');
    CREATE TYPE stock_log_action_enum AS ENUM ('in', 'out', 'adjustment');
  `);

  // =========================
  // 2. ROLES
  // =========================
  await knex.schema.createTable('roles', (table: Knex.TableBuilder): void => {
    table.increments('id').primary();
    table.string('name', 50).notNullable().unique();
    table.text('description');
    table.timestamps(true, true);
  });

  // =========================
  // 3. USERS
  // =========================
  await knex.schema.createTable('users', (table: Knex.TableBuilder): void => {
    table.increments('id').primary();
    table.string('public_id', 50).notNullable().unique();
    table.string('full_name', 100).notNullable();
    table.index('full_name');
    table.string('email', 100).notNullable().unique();
    table.index('email');
    table.string('password', 255);

    table.string('phone_number', 20);
    table.text('current_hashed_refresh_token');

    table.timestamps(true, true);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('deleted_at');
  });

  // =========================
  // 4. USER ROLES
  // =========================
  await knex.schema.createTable(
    'user_roles',
    (table: Knex.TableBuilder): void => {
      table
        .integer('user_id')
        .references('id')
        .inTable('users')
        .notNullable()
        .onDelete('CASCADE');
      table
        .integer('role_id')
        .references('id')
        .inTable('roles')
        .notNullable()
        .onDelete('CASCADE');
      table.primary(['user_id', 'role_id']);
    },
  );

  // =========================
  // USER AUTH PROVIDERS (supports multiple external providers per user)
  // =========================
  await knex.schema.createTable(
    'user_auth_providers',
    (table: Knex.TableBuilder): void => {
      table.increments('id').primary();
      table
        .integer('user_id')
        .references('id')
        .inTable('users')
        .notNullable()
        .onDelete('CASCADE');

      table
        .enu('provider', null, {
          useNative: true,
          enumName: 'auth_provider_enum',
        })
        .notNullable();

      table.string('provider_id', 255).notNullable();
      table.jsonb('provider_data');

      table.timestamps(true, true);

      table.unique(['provider', 'provider_id']);
      table.index('user_id');
    },
  );

  // =========================
  // 5. CATEGORIES (có tree)
  // =========================
  await knex.schema.createTable(
    'categories',
    (table: Knex.TableBuilder): void => {
      table.increments('id').primary();
      table.string('name', 100).notNullable();
      table.text('description');
      table
        .integer('parent_id')
        .references('id')
        .inTable('categories')
        .onDelete('SET NULL');

      table.index('parent_id');
      table.timestamps(true, true);
      table.timestamp('deleted_at');
    },
  );

  // =========================
  // 6. USER ADDRESSES
  // =========================
  await knex.schema.createTable(
    'user_addresses',
    (table: Knex.TableBuilder): void => {
      table.increments('id').primary();
      table
        .integer('user_id')
        .references('id')
        .inTable('users')
        .notNullable()
        .onDelete('CASCADE');

      table.string('label', 50).notNullable();
      table.string('recipient_name', 100).notNullable();
      table.string('phone_number', 20).notNullable();
      table.string('address_line', 255).notNullable();
      table.string('ward', 100);
      table.string('district', 100);
      table.string('province', 100);
      table.string('country', 100).notNullable().defaultTo('Vietnam');
      table.string('postal_code', 20);
      table.boolean('is_default').notNullable().defaultTo(false);
      table.text('note');
      table.timestamps(true, true);

      table.index('user_id');
    },
  );

  // =========================
  // 7. PRODUCTS
  // =========================
  await knex.schema.createTable(
    'products',
    (table: Knex.TableBuilder): void => {
      table.increments('id').primary();
      table.string('public_id', 50).notNullable().unique();

      table
        .integer('category_id')
        .nullable()
        .references('id')
        .inTable('categories')
        .onDelete('SET NULL');
      table.string('name', 255).notNullable();
      table.index('name');
      table.string('slug').unique().index().notNullable();
      table.text('description');

      table
        .decimal('price', 14, 2)
        .checkBetween([0, 9999999999.99])
        .notNullable()
        .defaultTo(0);
      table
        .integer('stock_quantity')
        .checkBetween([0, 9999999999])
        .notNullable()
        .defaultTo(0);

      table.integer('version').notNullable().defaultTo(0);
      table.boolean('is_active').notNullable().defaultTo(true);

      table.timestamps(true, true);
      table.timestamp('deleted_at');

      table.index('category_id');
    },
  );

  // =========================
  // 8. PRODUCT ATTRIBUTES (biến thể / variants)
  // =========================
  await knex.schema.createTable(
    'product_attributes',
    (table: Knex.TableBuilder): void => {
      table.increments('id').primary();
      table
        .integer('product_id')
        .references('id')
        .inTable('products')
        .notNullable()
        .onDelete('CASCADE');

      table.string('attribute_name', 100).notNullable();
      table.string('attribute_value', 255).notNullable();
      table.string('sku', 100).unique();
      table.decimal('price', 14, 2).checkBetween([0, 9999999999.99]).nullable();
      table
        .integer('stock_quantity')
        .checkBetween([0, 9999999999])
        .notNullable()
        .defaultTo(0);
      table.boolean('is_active').notNullable().defaultTo(true);
      table.integer('sort_order').notNullable().defaultTo(0);
      table.timestamps(true, true);

      table.unique(['product_id', 'attribute_name', 'attribute_value']);
      table.index('product_id');
    },
  );

  // =========================
  // 9. PRODUCT IMAGES (nếu muốn lưu nhiều ảnh cho mỗi sản phẩm)
  // =========================
  await knex.schema.createTable(
    'product_images',
    (table: Knex.TableBuilder): void => {
      table.increments('id').primary();
      table
        .integer('product_id')
        .references('id')
        .inTable('products')
        .onDelete('CASCADE');
      table.string('image_url', 255).notNullable();
      table.string('alt_text', 255);
      table.integer('display_order').defaultTo(0);
      table.timestamps(true, true);
    },
  );
  // =========================
  // 10. STOCK LOGS
  // =========================
  await knex.schema.createTable(
    'stock_logs',
    (table: Knex.TableBuilder): void => {
      table.increments('id').primary();
      table
        .integer('product_id')
        .references('id')
        .inTable('products')
        .notNullable()
        .onDelete('CASCADE');
      table
        .integer('product_attribute_id')
        .references('id')
        .inTable('product_attributes')
        .onDelete('CASCADE');
      table
        .integer('changed_by_user_id')
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');

      table
        .enu('action', null, {
          useNative: true,
          enumName: 'stock_log_action_enum',
        })
        .notNullable();

      table.integer('quantity_change').notNullable();
      table.integer('before_quantity').notNullable();
      table.integer('after_quantity').notNullable();
      table.text('reason');
      table.timestamps(true, true);

      table.index('product_id');
      table.index('product_attribute_id');
      table.index('changed_by_user_id');
    },
  );

  // =========================
  // 11. ORDERS
  // =========================
  await knex.schema.createTable('orders', (table: Knex.TableBuilder): void => {
    table.increments('id').primary();
    table.string('order_code', 50).notNullable().unique();

    table
      .integer('user_id')
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');

    table.decimal('total_amount', 14, 2).notNullable();
    table.string('customer_name', 100);
    table.string('customer_phone', 20);

    table
      .enu('status', null, {
        useNative: true,
        enumName: 'order_status_enum',
      })
      .defaultTo('pending');

    table.text('shipping_address').notNullable();

    table.timestamps(true, true);
    table.timestamp('deleted_at');
    table.index('user_id');
  });

  // =========================
  // 9. ORDER ITEMS
  // =========================
  await knex.schema.createTable(
    'order_items',
    (table: Knex.TableBuilder): void => {
      table.increments('id').primary();

      table
        .integer('order_id')
        .references('id')
        .inTable('orders')
        .onDelete('CASCADE');
      table
        .integer('product_id')
        .references('id')
        .inTable('products')
        .onDelete('RESTRICT');

      table.integer('quantity').notNullable();
      table.decimal('price_at_purchase', 14, 2).notNullable();

      table.timestamps(true, true);

      table.unique(['order_id', 'product_id']);
      table.index('order_id');
      table.index('product_id');
    },
  );

  // =========================
  // 13. PAYMENTS
  // =========================
  await knex.schema.createTable(
    'payments',
    (table: Knex.TableBuilder): void => {
      table.increments('id').primary();
      table.string('public_id', 50).notNullable().unique();

      table
        .integer('order_id')
        .references('id')
        .inTable('orders')
        .onDelete('CASCADE');

      table.decimal('amount', 14, 2).notNullable();

      table
        .enu('payment_method', null, {
          useNative: true,
          enumName: 'payment_method_enum',
        })
        .notNullable();

      table
        .enu('payment_status', null, {
          useNative: true,
          enumName: 'payment_status_enum',
        })
        .defaultTo('pending');

      table.string('transaction_id', 100).unique();
      table.string('momo_trans_id', 100);
      table.jsonb('provider_response');

      table.timestamp('paid_at');

      table.timestamps(true, true);

      table.index('order_id');
    },
  );

  // =========================
  // 14. CARTS (Giỏ hàng)
  // =========================
  await knex.schema.createTable('carts', (table: Knex.TableBuilder): void => {
    table.increments('id').primary();

    // Liên kết với bảng người dùng.
    // Dùng .unique() vì thông thường mỗi User chỉ có 1 giỏ hàng duy nhất (đang active).
    table
      .integer('user_id')
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
      .unique();

    table.timestamps(true, true);
  });

  // =========================
  // 15. CART ITEMS (Chi tiết sản phẩm trong giỏ)
  // =========================
  await knex.schema.createTable(
    'cart_items',
    (table: Knex.TableBuilder): void => {
      table.increments('id').primary();
      table
        .integer('cart_id')
        .references('id')
        .inTable('carts')
        .onDelete('CASCADE');
      table
        .integer('product_id')
        .references('id')
        .inTable('products')
        .onDelete('RESTRICT');
      table.integer('quantity').notNullable().defaultTo(1);

      table.timestamps(true, true);
      table.index('cart_id');
      table.index('product_id');
      table.unique(['cart_id', 'product_id']);
    },
  );
};

export const down = async (knex: Knex): Promise<void> => {
  await knex.schema.dropTableIfExists('cart_items');
  await knex.schema.dropTableIfExists('carts');
  await knex.schema.dropTableIfExists('payments');
  await knex.schema.dropTableIfExists('order_items');
  await knex.schema.dropTableIfExists('orders');
  await knex.schema.dropTableIfExists('product_images');
  await knex.schema.dropTableIfExists('stock_logs');
  await knex.schema.dropTableIfExists('product_attributes');
  await knex.schema.dropTableIfExists('products');
  await knex.schema.dropTableIfExists('user_addresses');
  await knex.schema.dropTableIfExists('categories');
  await knex.schema.dropTableIfExists('user_auth_providers');
  await knex.schema.dropTableIfExists('user_roles');
  await knex.schema.dropTableIfExists('users');
  await knex.schema.dropTableIfExists('roles');

  await knex.raw(`
    DROP TYPE IF EXISTS payment_status_enum CASCADE;
    DROP TYPE IF EXISTS payment_method_enum CASCADE;
    DROP TYPE IF EXISTS order_status_enum CASCADE;
    DROP TYPE IF EXISTS stock_log_action_enum CASCADE;
    DROP TYPE IF EXISTS auth_provider_enum CASCADE;
  `);
};
