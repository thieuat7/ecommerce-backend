import type { Knex } from 'knex';

// Phụ thuộc: 1680000000002-CreateRolesUsers (users)
//             1680000000004-CreateProducts (products, product_variants)
export const up = async (knex: Knex): Promise<void> => {
  // ─── carts (mỗi user chỉ có một giỏ) ────────────────────────────────────
  await knex.schema.createTable('carts', (table: Knex.TableBuilder): void => {
    table.increments('id').primary();
    table
      .integer('user_id')
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
      .unique();
    table.timestamps(true, true);
  });

  // ─── cart_items (hỗ trợ cả sản phẩm có và không có variant) ─────────────
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
      table
        .integer('variant_id')
        .nullable()
        .references('id')
        .inTable('product_variants')
        .onDelete('RESTRICT');
      table.integer('quantity').notNullable().defaultTo(1);
      table.timestamps(true, true);
      table.index('cart_id');
      table.index('product_id');
      table.index('variant_id');
      // Mỗi giỏ chỉ có một dòng cho mỗi tổ hợp product + variant
      table.unique(['cart_id', 'product_id', 'variant_id']);
    },
  );
};

export const down = async (knex: Knex): Promise<void> => {
  await knex.schema.dropTableIfExists('cart_items');
  await knex.schema.dropTableIfExists('carts');
};
