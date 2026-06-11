import type { Knex } from 'knex';

// Phụ thuộc: 1680000000006-CreateOrders (orders)
// payment_method_enum, payment_status_enum tạo ở 1680000000001-CreateEnums
export const up = async (knex: Knex): Promise<void> => {
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
      table.specificType('payment_method', 'payment_method_enum').notNullable();
      table
        .specificType('payment_status', 'payment_status_enum')
        .defaultTo('pending');
      table.string('transaction_id', 100).unique();
      table.string('momo_trans_id', 100);
      table.jsonb('provider_response');
      table.timestamp('paid_at');
      table.timestamps(true, true);
      table.index('order_id');
    },
  );
};

export const down = async (knex: Knex): Promise<void> => {
  await knex.schema.dropTableIfExists('payments');
};
