import type { Knex } from 'knex';

// Phụ thuộc: 1680000000002-CreateRolesUsers (users)
export const up = async (knex: Knex): Promise<void> => {
  // ─── categories (cây phân cấp, tự tham chiếu) ────────────────────────────
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

  // ─── user_addresses ───────────────────────────────────────────────────────
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
      table.timestamp('deleted_at');
      table.timestamps(true, true);
      table.index('user_id');
    },
  );
};

export const down = async (knex: Knex): Promise<void> => {
  await knex.schema.dropTableIfExists('user_addresses');
  await knex.schema.dropTableIfExists('categories');
};
