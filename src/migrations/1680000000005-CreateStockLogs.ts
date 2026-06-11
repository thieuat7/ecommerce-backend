import type { Knex } from 'knex';

// Phụ thuộc: 1680000000002-CreateRolesUsers (users)
//             1680000000004-CreateProducts (products, product_variants)
// stock_log_action_enum tạo ở 1680000000001-CreateEnums
export const up = async (knex: Knex): Promise<void> => {
  await knex.schema.createTable(
    'stock_logs',
    (table: Knex.TableBuilder): void => {
      table.increments('id').primary();
      table
        .integer('product_id')
        .references('id')
        .inTable('products')
        .notNullable()
        .onDelete('RESTRICT');
      table
        .integer('variant_id')
        .references('id')
        .inTable('product_variants')
        .nullable()
        .onDelete('SET NULL');
      table
        .integer('changed_by_user_id')
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table.specificType('action', 'stock_log_action_enum').notNullable();
      table.integer('quantity_change').notNullable();
      table.integer('before_quantity').notNullable();
      table.integer('after_quantity').notNullable();
      table.text('reason');
      table.timestamps(true, true);

      // after_quantity = before_quantity + quantity_change
      table.check('?? = ?? + ??', [
        'after_quantity',
        'before_quantity',
        'quantity_change',
      ]);
      table.check('?? <> 0', ['quantity_change']);
      table.check('after_quantity >= 0');
      table.check('before_quantity >= 0');

      table.index(['product_id', 'created_at']);
      table.index(['variant_id', 'created_at']);
      table.index('changed_by_user_id');
    },
  );
};

export const down = async (knex: Knex): Promise<void> => {
  await knex.schema.dropTableIfExists('stock_logs');
};
