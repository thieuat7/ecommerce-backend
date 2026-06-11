import type { Knex } from 'knex';

// Phụ thuộc: 1680000000003-CreateCategoriesAddresses (categories)
export const up = async (knex: Knex): Promise<void> => {
  // ─── products ─────────────────────────────────────────────────────────────
  await knex.schema.createTable(
    'products',
    (table: Knex.TableBuilder): void => {
      table.increments('id').primary();
      table.string('public_id', 50).notNullable().unique();
      table.string('name', 255).notNullable();
      table.index('name');
      table.string('slug').notNullable().unique();
      table.index('slug');
      table.text('description');
      // Giá gốc mặc định; có thể bị ghi đè bởi variant
      table.decimal('price', 14, 2).notNullable().defaultTo(0);
      table.check(
        'price >= 0 AND price <= 9999999999.99',
        [],
        'products_price_check',
      );
      table.integer('version').notNullable().defaultTo(0);
      table.boolean('is_active').notNullable().defaultTo(true);
      table.timestamps(true, true);
      table.timestamp('deleted_at');
      table.index(['is_active', 'deleted_at']);
    },
  );

  // ─── attributes (định nghĩa loại thuộc tính: Màu sắc, Dung lượng...) ─────
  await knex.schema.createTable('attributes', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable().unique(); // 'color', 'storage'
    table.string('display_name', 100).notNullable(); // 'Màu sắc', 'Bộ nhớ'
    table.timestamps(true, true);
  });

  // ─── attribute_values (giá trị cụ thể của từng loại thuộc tính) ──────────
  await knex.schema.createTable('attribute_values', (table) => {
    table.increments('id').primary();
    table
      .integer('attribute_id')
      .references('id')
      .inTable('attributes')
      .notNullable()
      .onDelete('CASCADE');
    table.string('value', 255).notNullable(); // 'red', '64GB'
    table.string('display_value', 255).notNullable(); // 'Đỏ', '64 GB'
    table.integer('sort_order').defaultTo(0);
    table.timestamps(true, true);
    table.unique(['attribute_id', 'value']);
  });

  // ─── product_variants (mỗi dòng là một biến thể hoàn chỉnh) ─────────────
  await knex.schema.createTable('product_variants', (table) => {
    table.increments('id').primary();
    table
      .integer('product_id')
      .references('id')
      .inTable('products')
      .notNullable()
      .onDelete('CASCADE');
    table.string('sku', 100).notNullable().unique();
    table.decimal('price', 14, 2).notNullable();
    table.integer('stock_quantity').notNullable().defaultTo(0);
    table.integer('version').notNullable().defaultTo(0);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamps(true, true);
    table.string('option_hash').notNullable();
    table.unique(['product_id', 'option_hash']);
    table.index('product_id');
  });

  // ─── product_variant_options (liên kết variant ↔ attribute_value) ─────────
  await knex.schema.createTable('product_variant_options', (table) => {
    table.increments('id').primary();
    table
      .integer('variant_id')
      .references('id')
      .inTable('product_variants')
      .notNullable()
      .onDelete('CASCADE');
    table
      .integer('attribute_value_id')
      .references('id')
      .inTable('attribute_values')
      .notNullable()
      .onDelete('RESTRICT');
    table.unique(['variant_id', 'attribute_value_id']);
    table.index('variant_id');
  });

  // ─── product_categories (nhiều-nhiều: product ↔ category) ────────────────
  await knex.schema.createTable('product_categories', (table) => {
    table.increments('id').primary();
    table
      .integer('product_id')
      .references('id')
      .inTable('products')
      .onDelete('CASCADE');
    table
      .integer('category_id')
      .references('id')
      .inTable('categories')
      .onDelete('CASCADE');
    table.unique(['product_id', 'category_id']);
  });

  // ─── product_images (nhiều ảnh cho mỗi sản phẩm / variant) ──────────────
  await knex.schema.createTable(
    'product_images',
    (table: Knex.TableBuilder): void => {
      table.increments('id').primary();
      table
        .integer('product_id')
        .notNullable()
        .references('id')
        .inTable('products')
        .onDelete('CASCADE');
      table
        .integer('variant_id')
        .nullable()
        .references('id')
        .inTable('product_variants')
        .onDelete('CASCADE');
      table.string('image_url', 255).notNullable();
      table.string('alt_text', 255);
      table.integer('display_order').defaultTo(0);
      table.timestamps(true, true);
    },
  );
};

export const down = async (knex: Knex): Promise<void> => {
  // Xóa theo thứ tự ngược (child → parent)
  await knex.schema.dropTableIfExists('product_images');
  await knex.schema.dropTableIfExists('product_categories');
  await knex.schema.dropTableIfExists('product_variant_options');
  await knex.schema.dropTableIfExists('product_variants');
  await knex.schema.dropTableIfExists('attribute_values');
  await knex.schema.dropTableIfExists('attributes');
  await knex.schema.dropTableIfExists('products');
};
